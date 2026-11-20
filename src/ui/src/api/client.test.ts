import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { installFetch, problem } from '../test/fetchMock';
import { restoreAfterEach } from '../test/restoreAfterEach';
import { ApiError, call, configureApiClient, fieldErrorsFor } from './client';
import type { ApiEndpoint } from './endpoint';

function adapters(
  options: { tenant?: string | null; onUnauthorized?: () => void; token?: string | null } = {},
) {
  restoreAfterEach(
    configureApiClient({
      getAccessToken: () => Promise.resolve(options.token === undefined ? 'jwt-1' : options.token),
      getTenantId: () => (options.tenant === undefined ? 'tenant-a' : options.tenant),
      getAsOf: () => '2026-10-21',
      getPersona: () => 'finance',
      onUnauthorized: options.onUnauthorized ?? (() => undefined),
    }),
  );
}

const health: ApiEndpoint<{ ok: boolean }> = {
  id: 'test.health',
  method: 'GET',
  path: '/api/v1/test-health',
  public: true,
  response: z.object({ ok: z.boolean() }),
};

const claim: ApiEndpoint<{ id: number }> = {
  id: 'test.claim',
  method: 'GET',
  path: '/api/v1/test-claims/:claimId',
  response: z.object({ id: z.number() }),
};

const closeClaim: ApiEndpoint<{ closed: boolean }> = {
  id: 'test.closeClaim',
  method: 'POST',
  path: '/api/v1/test-claims/:claimId/close',
  idempotent: true,
  response: z.object({ closed: z.boolean() }),
};

describe('call', () => {
  it('builds the request: path, query, bearer token, tenant, as-of date, persona, idempotency key; leaves them off public calls; sends through the installed transport', async () => {
    adapters();
    const { requests } = installFetch({
      'GET /api/v1/test-claims/3': () => ({ body: { id: 3 } }),
      'GET /api/v1/test-health': () => ({ body: { ok: true } }),
      'POST /api/v1/test-claims/5/close': () => ({ body: { closed: true } }),
    });

    const result = await call(claim, {
      params: { claimId: 3 },
      query: { stage: ['new', 'triage'], q: 'roof', empty: undefined },
    });
    await call(health);
    await call(closeClaim, { params: { claimId: 5 }, body: {} }, { idempotencyKey: 'key-1' });
    await call(closeClaim, { params: { claimId: 5 }, body: {} });

    expect(result).toEqual({ id: 3 });
    expect(requests[0]?.search).toBe('?stage=new&stage=triage&q=roof');
    expect(requests[0]?.headers.authorization).toBe('Bearer jwt-1');
    expect(requests[0]?.headers['x-tenant-id']).toBe('tenant-a');
    expect(requests[0]?.headers['x-as-of']).toBe('2026-10-21');
    expect(requests[0]?.headers['x-persona']).toBe('finance');
    expect(requests[1]?.headers.authorization).toBeUndefined();
    expect(requests[1]?.headers['x-tenant-id']).toBeUndefined();
    expect(requests[1]?.headers['x-as-of']).toBeUndefined();
    expect(requests[2]?.headers['idempotency-key']).toBe('key-1');
    expect(requests[3]?.headers['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
    await expect(call(claim)).rejects.toThrow('Missing path parameter "claimId"');

    const transport = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );
    restoreAfterEach(
      configureApiClient({
        getAccessToken: () => Promise.resolve(null),
        getTenantId: () => null,
        onUnauthorized: () => undefined,
        transport,
      }),
    );
    await call(health);
    expect(transport).toHaveBeenCalledWith(
      '/api/v1/test-health',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(requests).toHaveLength(4);
  });

  it('normalizes failures: problem+json with field errors, 401 sign-out, 204, schema drift, network and plain server errors', async () => {
    const onUnauthorized = vi.fn();
    adapters({ onUnauthorized });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    installFetch({
      'POST /api/v1/test-claims/5/close': () =>
        problem(422, 'Validation failed', {
          code: 'VALIDATION_FAILED',
          errors: [{ field: 'reason', code: 'REQUIRED', message: 'Give a reason.' }],
        }),
      'GET /api/v1/test-claims/1': () => problem(401, 'Unauthenticated'),
      'GET /api/v1/test-claims/2': () => ({ status: 204 }),
      'GET /api/v1/test-claims/3': () => ({ body: { id: 'three' } }),
      'GET /api/v1/test-claims/4': () => ({
        status: 500,
        body: 'oops',
        headers: { 'x-correlation-id': 'corr-9' },
      }),
    });

    const validation = await call(closeClaim, { params: { claimId: 5 }, body: {} }).catch(
      (caught: unknown) => caught,
    );
    expect(validation).toBeInstanceOf(ApiError);
    expect(validation).toMatchObject({
      status: 422,
      kind: 'validation',
      correlationId: 'corr-test-1',
    });
    expect(fieldErrorsFor(validation, 'reason')).toHaveLength(1);

    await expect(call(claim, { params: { claimId: 1 } })).rejects.toMatchObject({
      kind: 'unauthenticated',
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    await expect(call(claim, { params: { claimId: 2 } })).resolves.toBeNull();
    await expect(call(claim, { params: { claimId: 3 } })).rejects.toMatchObject({
      kind: 'contract',
    });
    await expect(call(claim, { params: { claimId: 4 } })).rejects.toMatchObject({
      kind: 'server',
      correlationId: 'corr-9',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    await expect(call(claim, { params: { claimId: 1 } })).rejects.toMatchObject({
      kind: 'network',
      status: 0,
    });
  });
});
