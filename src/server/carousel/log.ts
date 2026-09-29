/**
 * One voice for the generator's server logs, so a failed read can be found
 * by grepping for "[carousel]" and always names where it happened.
 *
 * `fallback` is for a read that must not take a page down: it logs the
 * failure once, with its label, and hands back the empty value the page
 * shows instead. A silent `.catch(() => [])` hid an outage as an empty
 * section; this keeps the section empty but leaves a trace.
 */
export function logError(where: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[carousel] ${where}: ${message}`);
}

export function fallback<T>(where: string, value: T): (err: unknown) => T {
  return (err) => {
    logError(where, err);
    return value;
  };
}
