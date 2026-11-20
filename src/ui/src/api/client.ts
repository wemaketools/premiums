/**
 * The single API client. `call(endpoint, { params, query, body }, options?)` builds the URL from the endpoint path
 * and for every request:
 * - reads the access token PER REQUEST from the auth provider and sends `Authorization: Bearer` when there is one
 *   (the demo has none; a later real backend installs one);
 * - sends `X-Tenant-Id` with the tenant of the selected data set, `X-As-Of` with the as-of date and `X-Persona` with
 *   the persona view (not on public endpoints);
 * - sends an `Idempotency-Key` on idempotent commands, generated unless the caller passes one;
 * - normalizes problem+json into `ApiError` (`status`, `title`, `code`, `fieldErrors`, `correlationId`);
 * - on 401 signs the user out (through the adapter installed by the auth provider) and rejects;
 * - in development builds parses the body with the endpoint's response schema, so drift between the UI and the API
 *   fails loudly.
 *
 * The client never imports the store: the auth provider installs the adapters (`configureApiClient`). The adapters
 * also carry the transport: the demo sends every request to the mock API running in the browser; a real backend would
 * use the platform `fetch` against `/api/v1`, with no change to the callers.
 */
import { AS_OF_HEADER, PERSONA_HEADER, TENANT_HEADER } from '../../../contracts/index';
import { t } from '../lib/i18n';
import { buildPath, buildQuery } from './endpoint';
import type { ApiEndpoint, EndpointRequest } from './endpoint';
import { PROBLEM_CONTENT_TYPE, Problem } from './problem';
import type { FieldError } from './problem';

/** Hooks the client needs from the auth layer and the store. */
export interface ApiClientAdapters {
  /** The current access token, read per request. `null` when there is none. */
  getAccessToken(): Promise<string | null>;
  /** The tenant of the signed-in user, or `null` when signed out. */
  getTenantId(): string | null;
  /** Called once per 401 response: signs the user out. */
  onUnauthorized(): void;
  /** The as-of date every read uses, or `null` to leave it to the API's default. */
  getAsOf?(): string | null;
  /** The persona view, recorded as the actor of commands. */
  getPersona?(): string | null;
  /** Sends the request; the platform `fetch` when omitted. */
  transport?: ApiTransport;
}

export type ApiTransport = (url: string, init: RequestInit) => Promise<Response>;

const signedOutAdapters: ApiClientAdapters = {
  getAccessToken: () => Promise.resolve(null),
  getTenantId: () => null,
  onUnauthorized: () => undefined,
};

let adapters: ApiClientAdapters = signedOutAdapters;

/** Installs the adapters (the auth provider does this once). Returns a function restoring the previous ones. */
export function configureApiClient(next: ApiClientAdapters): () => void {
  const previous = adapters;
  adapters = next;
  return () => {
    adapters = previous;
  };
}

/** What went wrong, for rendering (restricted state, form errors, retry, sign-in). */
export type ApiErrorKind =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'rate_limited'
  | 'server'
  | 'network'
  | 'contract';

function kindOfStatus(status: number): ApiErrorKind {
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 422 || status === 400) return 'validation';
  if (status === 409 || status === 412) return 'conflict';
  if (status === 429) return 'rate_limited';
  return 'server';
}

/** A failed call: the normalized problem+json (`{ status, title, fieldErrors }`). */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly title: string;
  readonly code: string | null;
  readonly detail: string | null;
  readonly fieldErrors: readonly FieldError[];
  readonly correlationId: string | null;
  readonly endpointId: string;

  constructor(init: {
    kind: ApiErrorKind;
    status: number;
    title: string;
    code?: string | null;
    detail?: string | null;
    fieldErrors?: readonly FieldError[];
    correlationId?: string | null;
    endpointId: string;
  }) {
    super(init.detail ?? init.title);
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status;
    this.title = init.title;
    this.code = init.code ?? null;
    this.detail = init.detail ?? null;
    this.fieldErrors = init.fieldErrors ?? [];
    this.correlationId = init.correlationId ?? null;
    this.endpointId = init.endpointId;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** An `ApiError` as is, or any other failure of a call or a screen load wrapped as one. */
export function toApiError(endpointId: string, error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }
  return new ApiError({
    kind: 'network',
    status: 0,
    title: error instanceof Error ? error.message : t('ui.error.title.failed'),
    endpointId,
  });
}

/** Options of one call. */
export interface CallOptions {
  /** For idempotent commands: reuse a key when retrying the same user action. Generated when omitted. */
  readonly idempotencyKey?: string;
  readonly signal?: AbortSignal;
}

function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim() === '') {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function problemError(endpoint: ApiEndpoint, response: Response, payload: unknown): ApiError {
  const parsed = Problem.safeParse(payload);
  if (parsed.success) {
    const problem = parsed.data;
    return new ApiError({
      kind: kindOfStatus(problem.status),
      status: problem.status,
      title: problem.title,
      code: problem.code ?? null,
      detail: problem.detail ?? null,
      fieldErrors: problem.errors ?? [],
      correlationId: problem.correlationId,
      endpointId: endpoint.id,
    });
  }
  return new ApiError({
    kind: kindOfStatus(response.status),
    status: response.status,
    title: response.statusText || t('ui.error.title.http', { status: response.status }),
    correlationId: response.headers.get('x-correlation-id'),
    endpointId: endpoint.id,
  });
}

/**
 * Calls an endpoint and resolves its typed response (`null` for 204).
 * Throws `ApiError` for every failure, including network errors.
 */
export async function call<R>(
  endpoint: ApiEndpoint<R>,
  request: EndpointRequest = {},
  options?: CallOptions,
): Promise<R> {
  const { params, query, body } = request;
  const url = `${buildPath(endpoint.path, params)}${buildQuery(query)}`;
  const headers: Record<string, string> = { Accept: `application/json, ${PROBLEM_CONTENT_TYPE}` };

  if (endpoint.public !== true) {
    const tenantId = adapters.getTenantId();
    if (tenantId !== null) {
      headers[TENANT_HEADER] = tenantId;
    }
    const asOf = adapters.getAsOf?.() ?? null;
    if (asOf !== null) {
      headers[AS_OF_HEADER] = asOf;
    }
    const persona = adapters.getPersona?.() ?? null;
    if (persona !== null) {
      headers[PERSONA_HEADER] = persona;
    }
    const token = await adapters.getAccessToken();
    if (token !== null) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  if (endpoint.idempotent === true) {
    headers['Idempotency-Key'] = options?.idempotencyKey ?? newIdempotencyKey();
  }
  let payload: string | undefined;
  if (body !== undefined && endpoint.method !== 'GET' && endpoint.method !== 'DELETE') {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await (adapters.transport ?? fetch)(url, {
      method: endpoint.method,
      headers,
      body: payload,
      credentials: 'same-origin',
      signal: options?.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError({
      kind: 'network',
      status: 0,
      title: t('ui.error.title.network'),
      endpointId: endpoint.id,
    });
  }

  if (!response.ok) {
    const problem = problemError(endpoint, response, await readJson(response));
    if (problem.status === 401) {
      adapters.onUnauthorized();
    }
    throw problem;
  }
  if (response.status === 204) {
    return null as R;
  }
  const data = await readJson(response);
  if (import.meta.env.DEV) {
    const checked = endpoint.response.safeParse(data);
    if (!checked.success) {
      console.error(
        `API contract drift: the response of ${endpoint.id} does not match its schema.`,
        checked.error.issues,
      );
      throw new ApiError({
        kind: 'contract',
        status: response.status,
        title: t('ui.error.title.contract'),
        detail: checked.error.issues
          .slice(0, 5)
          .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
          .join('; '),
        correlationId: response.headers.get('x-correlation-id'),
        endpointId: endpoint.id,
      });
    }
    return checked.data;
  }
  return data as R;
}

/** The field errors of one input (`field` is the issue path, for example `amount.currency`). */
export function fieldErrorsFor(error: unknown, field: string): FieldError[] {
  if (!isApiError(error)) {
    return [];
  }
  return error.fieldErrors.filter(
    (item) => item.field === field || item.field.startsWith(`${field}.`),
  );
}
