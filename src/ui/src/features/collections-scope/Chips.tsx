/** The chips of the engine's codes, so the lists, the queue and the detail pages show them alike. */
import type {
  AgingBucket,
  CollectionPriority,
  RuleCode,
  Severity,
  TaskStatus,
} from '../../../../contracts/index';
import { RULE_IDS } from '../../../../contracts/index';
import { Chip } from '../../components/ui';
import type { ChipTone } from '../../components/ui';
import { t } from '../../lib/i18n';
import { ruleLabel } from './labels';

const SEVERITY_TONE = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'info',
} as const satisfies Record<Severity, ChipTone>;

const PRIORITY_TONE = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'info',
  CURRENT: 'neutral',
} as const satisfies Record<CollectionPriority, ChipTone>;

const BUCKET_TONE = {
  current: 'neutral',
  '1-30': 'info',
  '31-60': 'warning',
  '61-90': 'warning',
  '>90': 'danger',
} as const satisfies Record<AgingBucket, ChipTone>;

const STATUS_TONE = {
  OPEN: 'info',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
} as const satisfies Record<TaskStatus, ChipTone>;

export function SeverityChip({ severity }: { readonly severity: Severity }) {
  return (
    <Chip tone={SEVERITY_TONE[severity]} size="sm">
      {t(`collections-scope.severity.${severity}`)}
    </Chip>
  );
}

export function PriorityChip({ priority }: { readonly priority: CollectionPriority }) {
  return (
    <Chip tone={PRIORITY_TONE[priority]} size="sm">
      {t(`collections-scope.priority.${priority}`)}
    </Chip>
  );
}

export function BucketChip({ bucket }: { readonly bucket: AgingBucket }) {
  return (
    <Chip tone={BUCKET_TONE[bucket]} size="sm">
      {t(`collections-scope.bucket.${bucket}`)}
    </Chip>
  );
}

export function TaskStatusChip({ status }: { readonly status: TaskStatus }) {
  return (
    <Chip tone={STATUS_TONE[status]} size="sm">
      {t(`collections-scope.taskStatus.${status}`)}
    </Chip>
  );
}

/** The rule's id and name, for example "COL-R03 Lapse review". */
export function RuleChip({ rule }: { readonly rule: RuleCode }) {
  return (
    <Chip tone="neutral-outlined" size="sm">
      {`${RULE_IDS[rule]} ${ruleLabel(rule)}`}
    </Chip>
  );
}
