/**
 * The data issues of the selected data set: rows the loader rejected (quarantined) and rows that loaded with a
 * warning, each with its row, field, problem and fix.
 */
import { endpoints } from '../../../../contracts/index';
import type { DataIssue } from '../../../../contracts/index';
import { useApiQuery } from '../../api/hooks';
import { useAppSelector } from '../../app/hooks';
import { t } from '../../lib/i18n';
import { Chip } from '../ui/Chip';
import { DataTable } from '../ui/DataTable';
import type { DataTableColumn } from '../ui/DataTable';
import { Dialog } from '../ui/Dialog';
import { EmptyState } from '../ui/EmptyState';
import { QueryView } from '../ui/QueryView';

const COLUMNS: readonly DataTableColumn<DataIssue>[] = [
  {
    id: 'kind',
    header: t('shell.data.issuesDialog.column.kind'),
    cell: (issue) => (
      <Chip tone={issue.kind === 'quarantined' ? 'danger' : 'warning'} size="sm">
        {t(`shell.data.issuesDialog.kind.${issue.kind}`)}
      </Chip>
    ),
  },
  { id: 'file', header: t('shell.data.issuesDialog.column.file'), cell: (issue) => issue.file },
  {
    id: 'row',
    header: t('shell.data.issuesDialog.column.row'),
    numeric: true,
    cell: (issue) => issue.row,
  },
  { id: 'field', header: t('shell.data.issuesDialog.column.field'), cell: (issue) => issue.field },
  {
    id: 'problem',
    header: t('shell.data.issuesDialog.column.problem'),
    cell: (issue) => issue.problem,
  },
  { id: 'fix', header: t('shell.data.issuesDialog.column.fix'), cell: (issue) => issue.fix },
];

export interface DataIssuesDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function DataIssuesDialog({ open, onClose }: DataIssuesDialogProps) {
  const dataSet = useAppSelector((state) => state.dataContext.dataSet);
  const query = useApiQuery(endpoints.dataIssues, open ? {} : null);

  return (
    <Dialog open={open} onClose={onClose} size="lg" title={t('shell.data.issuesDialog.title')}>
      <QueryView
        query={query}
        isEmpty={(data) => data.issues.length === 0}
        empty={
          <EmptyState
            icon="checkCircle"
            title={t('shell.data.issuesDialog.none')}
            description={t('shell.data.issuesDialog.noneDescription', { dataSet })}
          />
        }
      >
        {(data) => (
          <>
            <p>
              {t('shell.data.issuesDialog.summary', {
                count: data.quarantined_rows,
                rejected: data.quarantined_rows,
                warnings: data.issues.filter((issue) => issue.kind === 'warning').length,
              })}
            </p>
            <DataTable
              caption={t('shell.data.issuesDialog.caption', { dataSet })}
              columns={COLUMNS}
              rows={data.issues}
              rowKey={(issue) => String(issue.issue_no)}
            />
          </>
        )}
      </QueryView>
    </Dialog>
  );
}
