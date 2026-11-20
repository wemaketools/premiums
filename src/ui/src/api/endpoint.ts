/**
 * The description of one API endpoint that `call()` needs: where it lives, how it is called and the zod schema its
 * response must satisfy. The typed contracts of src/contracts define their endpoints with this shape.
 */
import type { z } from 'zod';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type PathParamValue = string | number;
export type QueryValue =
  string | number | boolean | null | undefined | readonly (string | number | boolean)[];

export interface ApiEndpoint<R = unknown> {
  /** Unique and stable: cache keys and `invalidateApiQueries` match on it, for example `invoices.list`. */
  readonly id: string;
  readonly method: HttpMethod;
  /** Absolute path under `/api/v1`; `:name` segments are filled from `params`. */
  readonly path: string;
  readonly response: z.ZodType<R>;
  /** Public endpoints are called without the bearer token and the tenant header. */
  readonly public?: boolean;
  /** Commands that must not run twice get an `Idempotency-Key` header. */
  readonly idempotent?: boolean;
}

export interface EndpointRequest {
  readonly params?: Readonly<Record<string, PathParamValue>>;
  readonly query?: Readonly<Record<string, QueryValue>>;
  readonly body?: unknown;
}

/** Fills the `:name` segments of a path, percent-encoding each value. */
export function buildPath(
  path: string,
  params: Readonly<Record<string, PathParamValue>> = {},
): string {
  return path.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined) {
      throw new Error(`Missing path parameter "${name}" for ${path}.`);
    }
    return encodeURIComponent(String(value));
  });
}

/** `?a=1&b=x&b=y`; undefined, null and empty arrays are left out. */
export function buildQuery(query: Readonly<Record<string, QueryValue>> = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, String(item));
    } else {
      search.append(key, String(value));
    }
  }
  const text = search.toString();
  return text === '' ? '' : `?${text}`;
}
