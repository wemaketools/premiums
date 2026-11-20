/**
 * The data controls of the top bar: the data set switch (TEST or DEMO), the as-of date, the data issues of the
 * loaded fixture and Reset. The choices are remembered in the browser; Reset removes the changes made on top of the
 * fixture.
 */
import { useId, useState } from 'react';

import { DATA_SET_IDS, endpoints, isDataSetId, isRealDate } from '../../../../contracts/index';
import { invalidateApiQueries, useApiMutation, useApiQuery } from '../../api/hooks';
import { chooseAsOf, chooseDataSet } from '../../app/dataContextActions';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { t } from '../../lib/i18n';
import { Button } from '../ui/Button';
import { ConfirmActionDialog } from '../ui/ConfirmActionDialog';
import { useToast } from '../ui/toastContext';
import { DataIssuesDialog } from './DataIssuesDialog';

export function DataControls() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { dataSet, asOf } = useAppSelector((state) => state.dataContext);
  const signedIn = useAppSelector((state) => state.session.authStatus === 'signedIn');
  const issues = useApiQuery(endpoints.dataIssues, signedIn ? {} : null);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const reset = useApiMutation(endpoints.demoReset);
  const setId = useId();
  const asOfId = useId();

  const issueCount = issues.data?.issues.length;

  return (
    <div className="prm-data-controls" role="group" aria-label={t('shell.data.label')}>
      <div className="prm-persona-switch">
        <label htmlFor={setId} className="prm-persona-switch-label prm-data-controls-label">
          {t('shell.data.dataSet')}
        </label>
        <select
          id={setId}
          value={dataSet}
          onChange={(event) => {
            if (isDataSetId(event.target.value)) {
              dispatch(chooseDataSet(event.target.value));
            }
          }}
        >
          {DATA_SET_IDS.map((id) => (
            <option key={id} value={id}>
              {t(`shell.data.set.${id}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="prm-persona-switch">
        <label htmlFor={asOfId} className="prm-persona-switch-label prm-data-controls-label">
          {t('shell.data.asOf')}
        </label>
        <input
          id={asOfId}
          type="date"
          value={asOf}
          onChange={(event) => {
            if (isRealDate(event.target.value)) {
              dispatch(chooseAsOf(event.target.value));
            }
          }}
        />
      </div>
      <Button size="sm" icon="alertTriangle" onClick={() => setIssuesOpen(true)}>
        {issueCount === undefined
          ? t('shell.data.issuesUnknown')
          : t('shell.data.issues', { count: issueCount })}
      </Button>
      <Button size="sm" icon="refresh" onClick={() => setResetOpen(true)}>
        {t('shell.data.reset')}
      </Button>
      <DataIssuesDialog open={issuesOpen} onClose={() => setIssuesOpen(false)} />
      <ConfirmActionDialog
        open={resetOpen}
        title={t('shell.data.resetTitle', { dataSet })}
        scope={t('shell.data.resetScope', { dataSet })}
        consequence={t('shell.data.resetResult')}
        confirmLabel={t('shell.data.reset')}
        tone="danger"
        pending={reset.pending}
        error={reset.error}
        onCancel={() => {
          reset.reset();
          setResetOpen(false);
        }}
        onConfirm={async () => {
          try {
            await reset.mutate({});
          } catch {
            return;
          }
          invalidateApiQueries();
          setResetOpen(false);
          toast.show(t('shell.data.resetDone', { dataSet }), 'success');
        }}
      />
    </div>
  );
}
