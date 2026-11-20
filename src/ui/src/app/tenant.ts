/**
 * The tenant follows the selected data set: TEST is tenant `TEST`, DEMO is tenant `DEMO` (rows of tenants.csv). It
 * labels the shell and travels with every API call as `X-Tenant-Id`.
 */
import { DATA_SETS } from '../../../contracts/index';
import type { DataSetId } from '../../../contracts/index';

export interface Tenant {
  readonly id: DataSetId;
  readonly name: string;
}

export function tenantOf(dataSet: DataSetId): Tenant {
  const { tenant_id, display_name } = DATA_SETS[dataSet];
  return { id: tenant_id, name: display_name };
}
