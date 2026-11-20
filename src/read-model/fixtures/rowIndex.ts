/** Accepted rows of each entity by id, filled as rows are accepted: the one lookup for references and amount checks. */
import type { EntityName } from '../../contracts/index.js';

export type Raw = Record<string, unknown>;

export interface RowIndex {
  add(entity: EntityName, id: string, row: Raw): void;
  get(entity: EntityName, id: string): Raw | undefined;
}

export function createRowIndex(): RowIndex {
  const byEntity = new Map<EntityName, Map<string, Raw>>();
  return {
    add(entity, id, row) {
      const rows = byEntity.get(entity) ?? new Map<string, Raw>();
      rows.set(id, row);
      byEntity.set(entity, rows);
    },
    get: (entity, id) => byEntity.get(entity)?.get(id),
  };
}
