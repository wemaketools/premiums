/**
 * The top bar slot a page renders into: the page title. AppShell provides the slot element;
 * PageHeader portals into it. Actions never go to the top bar from a page: a page's primary action stays in its
 * head row.
 */
import { createContext, useContext } from 'react';

export interface PageSlots {
  readonly title: HTMLElement | null;
}

export const PageSlotsContext = createContext<PageSlots | null>(null);

export function usePageSlots(): PageSlots | null {
  return useContext(PageSlotsContext);
}
