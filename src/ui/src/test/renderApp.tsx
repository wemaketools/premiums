import { screen, within } from '@testing-library/react';
import { vi } from 'vitest';

import type { DataSetId } from '../../../contracts/index';
import type { ApiTransport } from '../api/client';
import { createMockTransport } from '../api/mockTransport';
import { features } from '../app/featureRegistry';
import { buildRoutes } from '../app/router';
import { signedInSession } from './fixtures';
import { renderRouteTree } from './render';

export interface RenderAppOptions {
  readonly dataSet?: DataSetId;
  readonly asOf?: string;
  readonly transport?: ApiTransport;
}

/** The whole application (shell and every registered feature) on a route, over the mock API, signed in. */
export function renderApp(route: string, options: RenderAppOptions = {}) {
  // jsdom has no layout, so every responsive chart warns that its container is 0 by 0; any other warning still shows.
  const warn = console.warn.bind(console);
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    if (!String(args[0]).includes('width(0) and height(0)')) warn(...args);
  });
  return renderRouteTree(buildRoutes(features), {
    state: {
      session: signedInSession(),
      dataContext: { dataSet: options.dataSet ?? 'TEST', asOf: options.asOf ?? '2026-10-21' },
    },
    transport: options.transport ?? createMockTransport(),
    route,
  });
}

/** A table's body rows as the text of each cell (the trailing open-link cell, if any, is empty). */
export function tableRows(name: string): string[][] {
  const table = screen.getByRole('table', { name });
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent ?? ''),
    );
}
