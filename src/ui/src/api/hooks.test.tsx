import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { installFetch, problem } from '../test/fetchMock';
import { signedInSession } from '../test/fixtures';
import { renderWithProviders } from '../test/render';
import type { ApiEndpoint } from './endpoint';
import { invalidateApiQueries, useApiMutation, useApiQuery } from './hooks';

const summary: ApiEndpoint<{ open: number }> = {
  id: 'claims.summary',
  method: 'GET',
  path: '/api/v1/claims/summary',
  response: z.object({ open: z.number() }),
};

const closeAll: ApiEndpoint<{ closed: number }> = {
  id: 'claims.closeAll',
  method: 'POST',
  path: '/api/v1/claims/close-all',
  response: z.object({ closed: z.number() }),
};

const item: ApiEndpoint<{ name: string }> = {
  id: 'items.get',
  method: 'GET',
  path: '/api/v1/items/:id',
  response: z.object({ name: z.string() }),
};

/** Shows the record it asked for; `keepPrevious` is the opt-in for a list that is filtered in place. */
function Item({ keepPrevious }: { readonly keepPrevious: boolean }) {
  const [id, setId] = useState('a');
  const query = useApiQuery(item, { params: { id } }, { keepPrevious });
  return (
    <>
      <p data-testid={`item-${keepPrevious}`}>{query.data?.name ?? 'none'}</p>
      <button type="button" onClick={() => setId('b')}>
        {`next ${keepPrevious}`}
      </button>
    </>
  );
}

function Claims() {
  const query = useApiQuery(summary, {});
  const mutation = useApiMutation(closeAll);
  return (
    <>
      <p data-testid="query">
        {query.status === 'loading' && 'loading'}
        {query.status === 'error' && `error ${query.error?.status}`}
        {query.status === 'success' && `open ${query.data?.open}`}
      </p>
      <button
        type="button"
        onClick={() => void mutation.mutate({ body: {} }).catch(() => undefined)}
      >
        close
      </button>
      <p data-testid="mutation">
        {mutation.pending ? 'pending' : 'idle'}
        {mutation.data !== undefined && ` closed ${mutation.data.closed}`}
        {mutation.error !== null && ` failed ${mutation.error.status}`}
      </p>
    </>
  );
}

describe('API hooks', () => {
  it('load, re-run on a matching invalidation and surface errors; commands stay pending until the last overlapping one ends', async () => {
    let open = 1;
    let queryFails = false;
    let commandFails = false;
    const releases: Array<() => void> = [];
    const releasesB: Array<() => void> = [];
    installFetch({
      'GET /api/v1/items/a': () => ({ body: { name: 'record a' } }),
      'GET /api/v1/items/b': async () => {
        await new Promise<void>((resolve) => releasesB.push(resolve));
        return { body: { name: 'record b' } };
      },
      'GET /api/v1/claims/summary': () =>
        queryFails ? problem(403, 'Forbidden') : { body: { open } },
      'POST /api/v1/claims/close-all': async () => {
        if (commandFails) return problem(500, 'Internal');
        await new Promise<void>((resolve) => releases.push(resolve));
        return { body: { closed: releases.length } };
      },
    });
    renderWithProviders(
      <>
        <Item keepPrevious={false} />
        <Item keepPrevious />
      </>,
      { state: { session: signedInSession() } },
    );
    await waitFor(() => expect(screen.getByTestId('item-false')).toHaveTextContent('record a'));
    await waitFor(() => expect(screen.getByTestId('item-true')).toHaveTextContent('record a'));
    // A different record shows nothing until it answers; a list that opted in keeps the previous answer meanwhile.
    fireEvent.click(screen.getByRole('button', { name: 'next false' }));
    fireEvent.click(screen.getByRole('button', { name: 'next true' }));
    expect(screen.getByTestId('item-false')).toHaveTextContent('none');
    expect(screen.getByTestId('item-true')).toHaveTextContent('record a');
    await waitFor(() => expect(releasesB).toHaveLength(2));
    await act(async () => releasesB.forEach((release) => release()));
    await waitFor(() => expect(screen.getByTestId('item-false')).toHaveTextContent('record b'));
    cleanup();

    renderWithProviders(<Claims />, { state: { session: signedInSession() } });
    expect(screen.getByTestId('query')).toHaveTextContent('loading');
    await waitFor(() => expect(screen.getByTestId('query')).toHaveTextContent('open 1'));

    open = 5;
    act(() => invalidateApiQueries('suppliers.'));
    expect(screen.getByTestId('query')).toHaveTextContent('open 1');
    act(() => invalidateApiQueries('claims.'));
    await waitFor(() => expect(screen.getByTestId('query')).toHaveTextContent('open 5'));

    await userEvent.click(screen.getByRole('button', { name: 'close' }));
    await userEvent.click(screen.getByRole('button', { name: 'close' }));
    await waitFor(() => expect(releases).toHaveLength(2));
    await act(async () => releases[0]?.());
    expect(screen.getByTestId('mutation')).toHaveTextContent('pending');
    await act(async () => releases[1]?.());
    await waitFor(() => expect(screen.getByTestId('mutation')).toHaveTextContent('idle closed 2'));

    commandFails = true;
    queryFails = true;
    await userEvent.click(screen.getByRole('button', { name: 'close' }));
    await waitFor(() => expect(screen.getByTestId('mutation')).toHaveTextContent('failed 500'));
    act(() => invalidateApiQueries());
    await waitFor(() => expect(screen.getByTestId('query')).toHaveTextContent('error 403'));
  });
});
