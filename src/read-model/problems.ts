/** The refusal both transports give for values the request or the task rules do not accept (422), and the field-level problems inside it. */
import type { z } from 'zod';

export interface FieldProblem {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

export const INVALID_VALUES_TITLE = 'The request has invalid values.';

export const fieldProblems = (error: z.ZodError): FieldProblem[] =>
  error.issues.map((issue) => ({ field: issue.path.join('.'), code: issue.code, message: issue.message }));

/** Thrown for a value that is refused: each transport answers it with a 422 carrying `problems`. */
export class InvalidValues extends Error {
  readonly problems: readonly FieldProblem[];

  constructor(problems: readonly FieldProblem[]) {
    super(INVALID_VALUES_TITLE);
    this.name = 'InvalidValues';
    this.problems = problems;
  }

  static field(field: string, message: string): InvalidValues {
    return new InvalidValues([{ field, code: 'invalid', message }]);
  }

  static fromZod(error: z.ZodError): InvalidValues {
    return new InvalidValues(fieldProblems(error));
  }
}
