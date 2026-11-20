/**
 * "Export CSV": downloads the rows it is given, which the screen builds from the very figures it shows. The button is
 * the one place that decides when that is allowed: only while every query behind the figures answers the filters now
 * chosen, so it is off while a request is on its way and after a failed one (the screen may still show the previous
 * figures). A query the screen can do without (it shows a dash for what it would have added) only has to be settled,
 * so its failure does not keep the file off for good.
 */
import { useAppSelector } from '../../app/hooks';
import type { QueryResult } from '../../api/hooks';
import { Button } from '../../components/ui';
import { downloadCsv, toCsv } from '../../lib/csv';
import { t } from '../../lib/i18n';

type SettledQuery = Pick<QueryResult<unknown>, 'status' | 'isFetching'>;

export interface ExportCsvButtonProps {
  /** The screen in the file name: `premiums-overview-DEMO-2026-10-21.csv`. */
  readonly screen: string;
  /** Every query the table cannot be built without. */
  readonly queries: readonly SettledQuery[];
  /** Queries whose answer only adds to the table; the file waits for them while they run, not for their success. */
  readonly optionalQueries?: readonly SettledQuery[];
  /** Header row first. `undefined` while the screen has nothing to export. */
  readonly table: readonly (readonly string[])[] | undefined;
}

export function ExportCsvButton({
  screen,
  queries,
  optionalQueries = [],
  table,
}: ExportCsvButtonProps) {
  const { dataSet, asOf } = useAppSelector((state) => state.dataContext);
  const current =
    queries.every((query) => !query.isFetching && query.status === 'success') &&
    optionalQueries.every((query) => !query.isFetching);
  return (
    <Button
      icon="download"
      disabled={table === undefined || !current}
      onClick={() => {
        if (table === undefined || !current) return;
        downloadCsv(`premiums-${screen}-${dataSet}-${asOf}.csv`, toCsv(table));
      }}
    >
      {t('collections-scope.export.button')}
    </Button>
  );
}
