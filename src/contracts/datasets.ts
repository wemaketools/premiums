/** The two data sets. The tenant follows the data set; TEST and DEMO never mix. */
import { z } from 'zod';

export const DATA_SET_IDS = ['TEST', 'DEMO'] as const;
export const DataSetId = z.enum(DATA_SET_IDS);
export type DataSetId = z.infer<typeof DataSetId>;

/** The golden TEST fixture opens the CFO journey: its totals are the documented reference values. */
export const DEFAULT_DATA_SET: DataSetId = 'TEST';

export const DATA_SETS: Readonly<Record<DataSetId, { readonly tenant_id: DataSetId; readonly display_name: string }>> = {
  TEST: { tenant_id: 'TEST', display_name: 'Fixture validation' },
  DEMO: { tenant_id: 'DEMO', display_name: 'Fictional Botswana insurer demo' },
};

export function isDataSetId(value: unknown): value is DataSetId {
  return DataSetId.safeParse(value).success;
}
