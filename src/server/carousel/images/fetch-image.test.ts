import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
import type { RequestOptions } from "node:https";
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));
vi.mock("node:https", () => ({ request: mocks.request }));
import { fetchImageBytes, isPublicImageIPv4 } from "./fetch-image";

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
const policy = { allowedOrigins: ["https://images.example.com"] };
function response(status = 200, headers: Record<string, string | undefined> = { "content-type": "image/png" }, chunks = [png]) {
  const res = Object.assign(Readable.from(chunks), { statusCode: status, headers, complete: true });
  mocks.request.mockImplementation((options: RequestOptions, callback: (res: IncomingMessage) => void) => {
    const req = Object.assign(new EventEmitter(), { end() { queueMicrotask(() => callback(res as unknown as IncomingMessage)); } });
    options.signal?.addEventListener("abort", () => req.emit("error", new Error("aborted")), { once: true });
    return req;
  });
  return res;
}
beforeEach(() => { vi.clearAllMocks(); mocks.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]); response(); });
afterEach(() => vi.useRealTimers());
it("pins the checked IP while preserving TLS verification and the original Host", async () => {
  expect(await fetchImageBytes("https://images.example.com/photo.png?version=2", policy)).toEqual(png);
  expect(mocks.lookup).toHaveBeenCalledWith("images.example.com", { family: 4, all: true });
  expect(mocks.request.mock.calls[0][0]).toMatchObject({ hostname: "93.184.216.34", servername: "images.example.com",
    rejectUnauthorized: true, agent: false, path: "/photo.png?version=2", headers: { Host: "images.example.com", "Accept-Encoding": "identity" } });
  expect(Object.keys(mocks.request.mock.calls[0][0].headers)).toEqual(["Host", "Accept", "Accept-Encoding"]);
});
it.each(["http://images.example.com/a", "https://images.example.com.evil.test/a", "https://user:pass@images.example.com/a",
  "https://images.example.com:444/a", "https://images.example.com/a#fragment", "https://127.0.0.1/a", "file:///tmp/a"])("rejects unsafe URL before DNS: %s", async url => {
  await expect(fetchImageBytes(url, policy)).rejects.toThrow(); expect(mocks.lookup).not.toHaveBeenCalled();
});
it.each(["0.0.0.1", "10.1.2.3", "100.64.0.1", "127.0.0.1", "169.254.169.254", "172.31.1.1", "192.168.0.1",
  "192.0.0.1", "192.0.2.1", "192.88.99.1", "198.18.0.1", "198.51.100.1", "203.0.113.1", "224.0.0.1", "255.255.255.255", "::1", "::ffff:127.0.0.1"])("denies non-public or unsupported addresses: %s", address => {
  expect(isPublicImageIPv4(address)).toBe(false);
});
it("rejects mixed public/private DNS answers rather than selecting the public one", async () => {
  mocks.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.1", family: 4 }]);
  await expect(fetchImageBytes("https://images.example.com/a", policy)).rejects.toThrow("safely");
  expect(mocks.request).not.toHaveBeenCalled();
});
it.each([301, 302, 307, 308, 403, 404, 500])("rejects status %s without following another URL", async status => {
  const res = response(status, { "content-type": "image/png", location: "http://169.254.169.254/latest" });
  await expect(fetchImageBytes("https://images.example.com/a", policy)).rejects.toThrow("safely");
  expect(mocks.request).toHaveBeenCalledTimes(1); expect(res.destroyed).toBe(true);
});
it("rejects declared and streamed byte overruns", async () => {
  response(200, { "content-type": "image/png", "content-length": "1000" });
  await expect(fetchImageBytes("https://images.example.com/a", { ...policy, maxBytes: 10 })).rejects.toThrow("safely");
  response(200, { "content-type": "image/png" }, [png, png]);
  await expect(fetchImageBytes("https://images.example.com/a", { ...policy, maxBytes: 10 })).rejects.toThrow("safely");
});
it.each([{ "content-type": "image/svg+xml" }, { "content-type": "text/html" },
  { "content-type": "image/png", "content-encoding": "gzip" }, { "content-type": "image/png", "content-length": "banana" },
  { "content-type": "image/png", "content-length": "10" }])("rejects unsupported or inconsistent headers %j", async headers => {
  response(200, headers); await expect(fetchImageBytes("https://images.example.com/a", policy)).rejects.toThrow("safely");
});
it("rejects false raster content and incomplete transfers", async () => {
  response(200, { "content-type": "image/png" }, [Buffer.from("<svg/>")]);
  await expect(fetchImageBytes("https://images.example.com/a", policy)).rejects.toThrow("safely");
  response().complete = false;
  await expect(fetchImageBytes("https://images.example.com/a", policy)).rejects.toThrow("safely");
});
it("bounds DNS time and never starts a request after a late DNS answer", async () => {
  vi.useFakeTimers(); let finish!: (records: { address: string; family: number }[]) => void;
  mocks.lookup.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const outcome = expect(fetchImageBytes("https://images.example.com/a", { ...policy, timeoutMs: 20 })).rejects.toThrow("safely");
  await vi.advanceTimersByTimeAsync(21); await outcome;
  finish([{ address: "93.184.216.34", family: 4 }]); await Promise.resolve();
  expect(mocks.request).not.toHaveBeenCalled();
});
it("empty policy denies all origins", async () => {
  await expect(fetchImageBytes("https://images.example.com/a", { allowedOrigins: [] })).rejects.toThrow("not allowed");
  expect(mocks.lookup).not.toHaveBeenCalled();
});
it("aborts a stalled HTTPS transfer when its total deadline expires", async () => {
  vi.useFakeTimers();
  mocks.request.mockImplementation((options: RequestOptions) => {
    const req = Object.assign(new EventEmitter(), { end() {} });
    options.signal?.addEventListener("abort", () => req.emit("error", new Error("private request details")), { once: true });
    return req;
  });
  const outcome = expect(fetchImageBytes("https://images.example.com/a", { ...policy, timeoutMs: 20 })).rejects.toThrow("safely");
  await vi.advanceTimersByTimeAsync(21); await outcome;
  expect(mocks.request.mock.calls[0][0].signal.aborted).toBe(true);
});
