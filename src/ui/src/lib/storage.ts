/**
 * localStorage for conveniences only: the prototype session's role, the persona view, the theme, the sidebar width, the data set (and the key that sets a prototype build's), the as-of date and the screen filters. Nothing here is
 * trusted or required (the changes made on top of a fixture are the mock API's, in its own keys).
 * Every access is guarded, because storage can be unavailable (private mode, blocked site data).
 */
import { z } from 'zod';

import { DEFAULT_AS_OF, isDataSetId, isRealDate } from '../../../contracts/index';
import type { DataSetId } from '../../../contracts/index';
import { isPersonaId } from '../app/personas';
import type { PersonaId } from '../app/personas';
import type { FilterValue } from '../app/slices/filters';

const StoredFilters = z.record(
  z.string(),
  z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]),
  ),
);

const PREFIX = 'prm.';

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) {
      window.localStorage.removeItem(PREFIX + key);
    } else {
      window.localStorage.setItem(PREFIX + key, value);
    }
  } catch {
    // Storage unavailable: the convenience is simply lost.
  }
}

/** Whether the user chose the full sidebar in the icon strip; anything but "expanded" (or no value) means collapsed. */
export function readStoredSidebarExpanded(): boolean {
  return read('sidebar') === 'expanded';
}

export function storeSidebarExpanded(expanded: boolean): void {
  write('sidebar', expanded ? 'expanded' : 'collapsed');
}

export type StoredTheme = 'light' | 'dark';

/** The last chosen theme, or `null` before the user chose one. */
export function readStoredTheme(): StoredTheme | null {
  const raw = read('theme');
  return raw === 'light' || raw === 'dark' ? raw : null;
}

export function storeTheme(theme: StoredTheme): void {
  write('theme', theme);
}

/** The persona the user last switched to, or `null`; an unknown stored value is ignored. */
export function readStoredPersona(): PersonaId | null {
  const raw = read('persona');
  return isPersonaId(raw) ? raw : null;
}

export function storePersona(persona: PersonaId): void {
  write('persona', persona);
}

/** The role a prototype build is signed in as, or `null`; an unknown stored value is ignored. */
export function readStoredPrototypeRole(): PersonaId | null {
  const raw = read('prototype.role');
  return isPersonaId(raw) ? raw : null;
}

export function storePrototypeRole(role: PersonaId | null): void {
  write('prototype.role', role);
}

/** The data set the user last chose, or `null`; an unknown stored value is ignored. */
export function readStoredDataSet(): DataSetId | null {
  const raw = read('dataSet');
  return isDataSetId(raw) ? raw : null;
}

export function storeDataSet(dataSet: DataSetId): void {
  write('dataSet', dataSet);
}

/** The as-of date the user last chose, or `null`; a value that is not a real date is ignored. */
export function readStoredAsOf(): string | null {
  const raw = read('asOf');
  return raw !== null && isRealDate(raw) ? raw : null;
}

export function storeAsOf(asOf: string): void {
  write('asOf', asOf === DEFAULT_AS_OF ? null : asOf);
}

/** The filters of every screen as the user last left them, or `{}`; anything that is not a map of filter values is ignored. */
export function readStoredFilters(): Record<string, Record<string, FilterValue>> {
  const raw = read('filters');
  if (raw === null) {
    return {};
  }
  try {
    const parsed = StoredFilters.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export function storeFilters(byScreen: Record<string, Record<string, FilterValue>>): void {
  write('filters', Object.keys(byScreen).length === 0 ? null : JSON.stringify(byScreen));
}
