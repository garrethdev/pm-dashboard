/**
 * The `IP:PORT:USERNAME:PASSWORD` line the SOP has people copy out of
 * proxy-cheap and into GeeLark's proxy tab.
 *
 * One parser, imported by both the Replace proxy dialog and the route behind
 * it. It started as two — the dialog validating for the operator, the server
 * validating for real — which is the shape that eventually accepts something in
 * the browser the server then rejects, or worse the other way round. It is a
 * pure function with no imports, so the client can hold it too.
 *
 * Nothing here proves the proxy works. That is GeeLark's job: it
 * connectivity-tests a proxy before adding it and refuses an unreachable one
 * with 45004. This only rejects what is not a credential line at all.
 */
export interface PastedProxy {
  server: string;
  port: number;
  username: string;
  password: string;
}

export function parsePastedProxy(raw: string): PastedProxy | null {
  // Split on the first three colons only: a password containing one is legal
  // and would otherwise be truncated into something that still parses, which is
  // the worst kind of wrong — a proxy that attaches and then cannot connect.
  const parts = raw.trim().split(":");
  if (parts.length < 4) return null;

  const [server, portText, username, ...rest] = parts;
  const password = rest.join(":");
  const port = Number(portText);

  if (!server || !username || !password) return null;
  if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) return null;
  // An IP or a hostname. Whitespace or a stray character means the paste picked
  // up a label, a quote or a line break along with the credentials.
  if (!/^[A-Za-z0-9.-]+$/.test(server)) return null;
  if (/\s/.test(username) || /\s/.test(password)) return null;

  return { server, port, username, password };
}
