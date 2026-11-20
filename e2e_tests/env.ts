/** The value of an environment variable, trimmed; empty or whitespace counts as unset. Every env read goes through it. */
export function envValue(name: string): string | undefined {
  return presentValue(process.env[name]);
}

/** The one home of the rule: trim, and empty or whitespace is unset. */
export function presentValue(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  return value === undefined || value === '' ? undefined : value;
}
