import { describe, expect, it } from "vitest";
import { parsePastedProxy } from "@/lib/data/proxy-paste";

/**
 * The pasted-credentials parser.
 *
 * Worth testing properly because of what sits downstream: a line that parses
 * into the *wrong* proxy gets attached to a live account and takes its IP with
 * it. Rejecting a good line is a visible annoyance; accepting a mangled one is
 * a silent outage on somebody's account.
 */
describe("parsePastedProxy", () => {
  it("reads a real proxy-cheap line", () => {
    expect(parsePastedProxy("82.47.5.7:41802:x7Kd2PqLmN4vRtZ:Qa9WsEd3RfTgYhU")).toEqual({
      server: "82.47.5.7",
      port: 41802,
      username: "x7Kd2PqLmN4vRtZ",
      password: "Qa9WsEd3RfTgYhU",
    });
  });

  it("tolerates surrounding whitespace from a clipboard", () => {
    expect(parsePastedProxy("  82.47.5.7:41802:user:pass\n")?.server).toBe("82.47.5.7");
  });

  it("keeps a password that contains a colon", () => {
    // Only the first three colons separate fields; the rest is password.
    expect(parsePastedProxy("1.2.3.4:8080:user:pa:ss:word")?.password).toBe("pa:ss:word");
  });

  it("accepts a hostname as well as an IP", () => {
    expect(parsePastedProxy("gw.example-proxy.com:8080:user:pass")?.server).toBe(
      "gw.example-proxy.com",
    );
  });

  it("rejects a line with too few fields", () => {
    expect(parsePastedProxy("82.47.5.7:41802:user")).toBeNull();
    expect(parsePastedProxy("82.47.5.7:41802")).toBeNull();
    expect(parsePastedProxy("")).toBeNull();
  });

  it("rejects an empty field", () => {
    expect(parsePastedProxy("82.47.5.7:41802::pass")).toBeNull();
    expect(parsePastedProxy(":41802:user:pass")).toBeNull();
    expect(parsePastedProxy("82.47.5.7:41802:user:")).toBeNull();
  });

  it("rejects a port that is not a plain number in range", () => {
    expect(parsePastedProxy("82.47.5.7:abc:user:pass")).toBeNull();
    expect(parsePastedProxy("82.47.5.7:0:user:pass")).toBeNull();
    expect(parsePastedProxy("82.47.5.7:70000:user:pass")).toBeNull();
    // "41802abc" would survive Number() on a looser check and attach to the
    // wrong port; "4e4" is a valid JS number and must not be one here.
    expect(parsePastedProxy("82.47.5.7:41802abc:user:pass")).toBeNull();
    expect(parsePastedProxy("82.47.5.7:4e4:user:pass")).toBeNull();
    expect(parsePastedProxy("82.47.5.7: 41802:user:pass")).toBeNull();
  });

  it("rejects a host carrying a scheme or stray characters", () => {
    // "socks5://1.2.3.4:8080:user:pass" splits into 5+ parts and the host half
    // is left as "socks5//" — shaped like a line but not one.
    expect(parsePastedProxy("socks5://1.2.3.4:8080:user:pass")).toBeNull();
    expect(parsePastedProxy('"1.2.3.4":8080:user:pass')).toBeNull();
  });

  it("rejects whitespace inside the credentials", () => {
    expect(parsePastedProxy("1.2.3.4:8080:user name:pass")).toBeNull();
    expect(parsePastedProxy("1.2.3.4:8080:user:pa ss")).toBeNull();
  });
});
