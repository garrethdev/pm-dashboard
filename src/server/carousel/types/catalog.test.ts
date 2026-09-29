import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/data/supabase", () => ({ sbRestAll: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({ requireSession: vi.fn() }));
import { sbRestAll } from "@/lib/data/supabase";
import { requireSession } from "@/lib/api-auth";
import { GET } from "@/app/api/carousel-generator/types/route";
import { NextResponse } from "next/server";

describe("carousel type catalog endpoint", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.mocked(requireSession).mockResolvedValue(null); });
  it("checks the session before reading the service-role repository", async () => {
    vi.mocked(requireSession).mockResolvedValue(NextResponse.json({ error: "unauthorized" }, { status: 401 }));
    expect((await GET()).status).toBe(401);
    expect(sbRestAll).not.toHaveBeenCalled();
  });
  it("returns a real empty catalog with no-store and explicit paginated columns", async () => {
    vi.mocked(sbRestAll).mockResolvedValue([]);
    const response = await GET();
    expect(await response.json()).toEqual({ types: [] });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(sbRestAll).toHaveBeenCalledWith(expect.stringContaining("order=content_type.asc"));
    expect(sbRestAll).toHaveBeenCalledWith(expect.not.stringContaining("select=*"));
  });
  it("does not turn connection failures into empty data or expose provider errors", async () => {
    vi.mocked(sbRestAll).mockRejectedValue(new Error("secret-provider-details"));
    const response = await GET();
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain("secret-provider-details");
  });
});
