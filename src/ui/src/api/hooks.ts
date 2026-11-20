/**
 * Data hooks over `call()` for pages and shared widgets.
 *
 * `useApiQuery(endpoint, request)` fetches on mount and whenever the request, the signed-in user, the data set or the
 * as-of date changes. Running the SAME request again (reload, invalidation) keeps its data visible (`isFetching`). A
 * different request shows no data until it answers, so a page about one record never shows another record's data;
 * `keepPrevious` opts a list that is filtered or paged in place out of that, and then `isFetching` tells the screen
 * the figures are not yet those of the new request. Pass `null` as the request to skip the call.
 *
 * `useApiMutation(endpoint)` runs commands: `pending` disables submit buttons while a request is in flight, and
 * `error` keeps the normalized problem for field errors and banners.
 *
 * `invalidateApiQueries(match)` re-runs every mounted query whose endpoint id matches (for example after a command
 * changed what a list shows).
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { useAppSelector } from '../app/hooks';
import { call, toApiError } from './client';
import type { ApiError } from './client';
import type { CallOptions } from './client';
import type { ApiEndpoint, EndpointRequest } from './endpoint';

// ---------------------------------------------------------------------------------------------------------
// Invalidation
// ---------------------------------------------------------------------------------------------------------

let invalidationVersion = 0;
const listeners = new Set<() => void>();
/** Recent invalidations (bounded): a query re-runs when a newer entry matches its endpoint. */
const invalidations: Array<{ version: number; predicate: (endpointId: string) => boolean }> = [];
const MAX_INVALIDATIONS = 200;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getInvalidationVersion(): number {
  return invalidationVersion;
}

/**
 * Re-runs mounted queries. `match` is an endpoint id, an id prefix ending with `.` (for example `invoices.`), or a
 * predicate. Without `match`, every query re-runs.
 */
export function invalidateApiQueries(match?: string | ((endpointId: string) => boolean)): void {
  invalidationVersion += 1;
  const predicate =
    match === undefined
      ? () => true
      : typeof match === 'function'
        ? match
        : (id: string) => (match.endsWith('.') ? id.startsWith(match) : id === match);
  invalidations.push({ version: invalidationVersion, predicate });
  if (invalidations.length > MAX_INVALIDATIONS) {
    invalidations.splice(0, invalidations.length - MAX_INVALIDATIONS);
  }
  for (const listener of listeners) {
    listener();
  }
}

/** The latest invalidation version that concerns this endpoint. */
function invalidationFor(endpointId: string, version: number): number {
  let latest = 0;
  for (const entry of invalidations) {
    if (entry.version <= version && entry.predicate(endpointId)) {
      latest = entry.version;
    }
  }
  return latest;
}

// ---------------------------------------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------------------------------------

export type QueryStatus = 'loading' | 'success' | 'error';

export interface QueryResult<T> {
  readonly status: QueryStatus;
  /**
   * The answer to this same request, or `undefined` until it has answered; with `keepPrevious`, while a different
   * request of the same endpoint runs, the previous request's answer.
   */
  readonly data: T | undefined;
  readonly error: ApiError | null;
  /** A request is in flight (also true during a refresh that keeps showing `data`). */
  readonly isFetching: boolean;
  /** Runs the request again. */
  readonly reload: () => void;
}

export interface QueryOptions {
  /** While a different request of the same endpoint runs, keep showing the data of the previous one. */
  readonly keepPrevious?: boolean;
}

interface Settled<T> {
  readonly key: string;
  readonly scope: string;
  readonly requestKey: string;
  readonly data: T | undefined;
  readonly error: ApiError | null;
}

export function useApiQuery<R>(
  endpoint: ApiEndpoint<R>,
  request: EndpointRequest | null,
  { keepPrevious = false }: QueryOptions = {},
): QueryResult<R> {
  const userId = useAppSelector((state) => state.session.user?.id ?? null);
  const dataSet = useAppSelector((state) => state.dataContext.dataSet);
  const asOf = useAppSelector((state) => state.dataContext.asOf);
  const version = useSyncExternalStore(subscribe, getInvalidationVersion);
  const [reloadToken, setReloadToken] = useState(0);

  const scope = JSON.stringify([endpoint.id, userId, dataSet, asOf]);
  const requestKey = request === null ? null : JSON.stringify(request);
  const key =
    requestKey === null
      ? null
      : `${scope}|${requestKey}|${reloadToken}|${invalidationFor(endpoint.id, version)}`;

  const [settled, setSettled] = useState<Settled<R> | null>(null);

  useEffect(() => {
    if (key === null || requestKey === null) {
      return undefined;
    }
    const controller = new AbortController();
    const parsedRequest = JSON.parse(requestKey) as EndpointRequest;
    call(endpoint, parsedRequest, { signal: controller.signal }).then(
      (data) => {
        if (!controller.signal.aborted) {
          setSettled({ key, scope, requestKey, data, error: null });
        }
      },
      (error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setSettled((previous) => ({
          key,
          scope,
          requestKey,
          data:
            previous?.scope === scope && (keepPrevious || previous.requestKey === requestKey)
              ? previous.data
              : undefined,
          error: toApiError(endpoint.id, error),
        }));
      },
    );
    return () => controller.abort();
    // The key captures endpoint, request, user, data set, as-of date, reload and invalidation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  if (key === null) {
    return { status: 'loading', data: undefined, error: null, isFetching: false, reload };
  }
  const usable =
    settled !== null &&
    settled.scope === scope &&
    (keepPrevious || settled.requestKey === requestKey);
  const current = settled !== null && settled.key === key;
  const data = usable ? settled.data : undefined;
  const error = current ? settled.error : null;
  const isFetching = !current;
  let status: QueryStatus;
  if (error !== null) {
    status = 'error';
  } else if (data !== undefined) {
    status = 'success';
  } else {
    status = 'loading';
  }
  return { status, data, error, isFetching, reload };
}

// ---------------------------------------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------------------------------------

export interface MutationResult<R> {
  /** Runs the command; resolves the response or rejects with `ApiError` (also kept in `error`). */
  readonly mutate: (request: EndpointRequest, options?: CallOptions) => Promise<R>;
  readonly pending: boolean;
  readonly error: ApiError | null;
  readonly data: R | undefined;
  readonly reset: () => void;
}

export function useApiMutation<R>(endpoint: ApiEndpoint<R>): MutationResult<R> {
  const [inFlight, setInFlight] = useState(0);
  const [error, setError] = useState<ApiError | null>(null);
  const [data, setData] = useState<R | undefined>(undefined);
  const latestCall = useRef(0);

  const mutate = useCallback(
    async (request: EndpointRequest, options?: CallOptions): Promise<R> => {
      latestCall.current += 1;
      const thisCall = latestCall.current;
      setInFlight((count) => count + 1);
      setError(null);
      try {
        const response = await call(endpoint, request, options);
        if (thisCall === latestCall.current) {
          setData(response);
        }
        return response;
      } catch (caught) {
        const apiError = toApiError(endpoint.id, caught);
        if (thisCall === latestCall.current) {
          setError(apiError);
        }
        throw apiError;
      } finally {
        setInFlight((count) => count - 1);
      }
    },
    [endpoint],
  );

  const reset = useCallback(() => {
    setError(null);
    setData(undefined);
  }, []);

  return { mutate, pending: inFlight > 0, error, data, reset };
}
