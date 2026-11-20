/** `application/problem+json` answers, the shape the SPA's API client normalizes. */

import type { FieldProblem } from '../read-model/index.js';

export class HttpProblem extends Error {
  readonly status: number;
  readonly title: string;
  readonly errors: readonly FieldProblem[];

  constructor(status: number, title: string, errors: readonly FieldProblem[] = []) {
    super(title);
    this.name = 'HttpProblem';
    this.status = status;
    this.title = title;
    this.errors = errors;
  }
}

export function problemResponse(problem: HttpProblem): Response {
  const body = {
    type: 'about:blank',
    title: problem.title,
    status: problem.status,
    ...(problem.errors.length > 0 ? { errors: problem.errors } : {}),
    correlationId: crypto.randomUUID(),
  };
  return new Response(JSON.stringify(body), {
    status: problem.status,
    headers: { 'content-type': 'application/problem+json' },
  });
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
