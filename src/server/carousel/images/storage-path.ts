/** Original slide numbers and lane identifiers only. Prefix is supplied by the
 * trusted job service (e.g. scratch/<run-id>), never taken from a template. */
export function renderStoragePath(pattern: string, values: { carousel_id?: string; deck_key?: string; n: number }, prefix: string) {
  if (!Number.isSafeInteger(values.n) || values.n < 1 || values.n > 50 || typeof pattern !== "string" || pattern.length > 512) throw new Error("Invalid render path input");
  const safePath = (s: string) => s.length > 0 && s.length <= 512 && s.split("/").every(segment => /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(segment) && segment !== "." && segment !== "..");
  if (!safePath(prefix)) throw new Error("Invalid render path prefix");
  const path = pattern.replace(/\{([^{}]+)\}/g, (_, token: string) => {
    if (token === "n") return String(values.n);
    if (token === "nn") return String(values.n).padStart(2, "0");
    if (token !== "carousel_id" && token !== "deck_key") throw new Error("Unknown render path token");
    const value = values[token];
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new Error("Invalid render path identifier");
    return value;
  });
  if (!safePath(path) || !/\.(?:png|jpg|jpeg)$/.test(path)) throw new Error("Invalid render object path");
  return `${prefix}/${path}`;
}
