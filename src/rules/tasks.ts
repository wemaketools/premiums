import { dateOf } from '../contracts/index.js';
import type { Task } from '../contracts/index.js';

/** A task not resolved by its due date: overdue the day after. A task without a due date is never overdue. */
export function isTaskOverdue(task: Pick<Task, 'status' | 'due_at'>, asOf: string): boolean {
  return task.status !== 'RESOLVED' && task.due_at !== null && dateOf(task.due_at) < asOf;
}
