/**
 * What creating a task, assigning it, changing its status and adding a note do to a `TaskRecord`, audit entry
 * included. The mock API keeps the result in browser storage; a later server would write the same records.
 */
import type { z } from 'zod';

import { TASK_STATUS_TRANSITIONS } from '../contracts/index.js';
import type { CreateTaskBody, PersonaId, TaskAuditEntry, TaskRecord, TaskStatus } from '../contracts/index.js';
import { InvalidValues } from './problems.js';

export const taskIdOf = (number: number): string => `TASK-${String(number).padStart(4, '0')}`;

export interface TaskChangeContext {
  readonly actor: PersonaId;
  /** The instant of the change, `instantOf(now)`. */
  readonly at: string;
}

function audited(task: TaskRecord, entry: Omit<TaskAuditEntry, 'task_id' | 'at' | 'actor'>, context: TaskChangeContext): TaskRecord {
  return { ...task, audit: [...task.audit, { task_id: task.task_id, at: context.at, actor: context.actor, ...entry }] };
}

/**
 * A new task with its audit trail: CREATED, and when it is made with an assignee also ASSIGNED (from nobody to that
 * person), so the trail shows who was given the task and when, as it does for every later assignment.
 */
export function createdTask(
  tenantId: string,
  taskId: string,
  body: z.output<typeof CreateTaskBody>,
  context: TaskChangeContext,
): TaskRecord {
  const created = audited(
    {
      tenant_id: tenantId,
      task_id: taskId,
      module: 'COLLECTIONS',
      subject_type: body.subject_type,
      subject_id: body.subject_id,
      assigned_to: body.assigned_to,
      due_at: body.due_at,
      priority: body.priority,
      status: 'OPEN',
      note: body.note,
      updated_at: context.at,
      reason: body.reason,
      audit: [],
    },
    { action: 'CREATED', from: null, to: 'OPEN', note: body.note },
    context,
  );
  return body.assigned_to === null
    ? created
    : audited(created, { action: 'ASSIGNED', from: null, to: body.assigned_to, note: null }, context);
}

/** The task with its new assignee and one audit entry; the same object when nothing changes. */
export function assignedTask(task: TaskRecord, assignedTo: string, context: TaskChangeContext): TaskRecord {
  if (task.assigned_to === assignedTo) {
    return task;
  }
  return audited(
    { ...task, assigned_to: assignedTo, updated_at: context.at },
    { action: 'ASSIGNED', from: task.assigned_to, to: assignedTo, note: null },
    context,
  );
}

/** The task with its new status and one audit entry (a note given with it becomes the latest note); the same object when nothing changes. */
export function taskWithStatus(task: TaskRecord, status: TaskStatus, note: string | null, context: TaskChangeContext): TaskRecord {
  if (task.status === status) {
    return task;
  }
  if (!TASK_STATUS_TRANSITIONS[task.status].includes(status)) {
    throw InvalidValues.field('status', `A task that is ${task.status} cannot become ${status}.`);
  }
  return audited(
    { ...task, status, note: note ?? task.note, updated_at: context.at },
    { action: 'STATUS_CHANGED', from: task.status, to: status, note },
    context,
  );
}

/** The task with one more note in its trail; the note also becomes the task's latest note. */
export function taskWithNote(task: TaskRecord, note: string, context: TaskChangeContext): TaskRecord {
  return audited(
    { ...task, note, updated_at: context.at },
    { action: 'NOTE_ADDED', from: null, to: null, note },
    context,
  );
}
