import { describe, expect, it } from "vitest";

import { airState, fileSize, installedVersions, versionDay, versionParts, type RobotUpdate } from "@/lib/data/robot-updates";
import { robotUpdateItem } from "@/lib/data/notifications";
import { installSteps } from "@/lib/robot-update-steps";
import { parseInstallNotes } from "../../scripts/robot-update-notes.mjs";

function update(version: string, label = "A label"): RobotUpdate {
  return {
    version,
    commitSha: "0".repeat(40),
    label,
    whatChanged: "Something.",
    extraSteps: [],
    afterwards: null,
    filePath: `${version}.tar.gz`,
    fileBytes: 67_108_864,
    publishedAt: "2026-11-27T08:00:00Z",
    publishedBy: "garreth",
  };
}

const NOV26 = update("warmup-runner-2026-11-26-0339216", "Friday analytics time");
const NOV27 = update("warmup-runner-2026-11-27-eedde13", "Friday analytics in robot hours");
const air = (version: string) => ({ version, seenAt: "2026-11-27T07:05:22Z" });

describe("version names", () => {
  it("splits a package name into its day and code", () => {
    expect(versionParts("warmup-runner-2026-11-27-eedde13")).toEqual({ date: "2026-11-27", code: "eedde13" });
    expect(versionDay("warmup-runner-2026-11-27-eedde13")).toBe("27 November");
  });

  it("does not read the robot's 'not installed from a package' as a version", () => {
    expect(versionParts("not installed from a package")).toBeNull();
    expect(versionDay("not installed from a package")).toBeNull();
  });

  it("prints sizes in MB", () => {
    expect(fileSize(67_108_864)).toBe("64.0 MB");
  });
});

describe("airState", () => {
  it("is none with nothing published", () => {
    expect(airState([], air(NOV27.version)).kind).toBe("none");
  });

  it("is unknown when no report has named a version", () => {
    expect(airState([NOV27], null).kind).toBe("unknown");
  });

  it("is current when the Air runs the newest", () => {
    expect(airState([NOV27, NOV26], air(NOV27.version)).kind).toBe("current");
  });

  it("is behind when the Air runs an older listed version", () => {
    const s = airState([NOV27, NOV26], air(NOV26.version));
    expect(s.kind).toBe("behind");
    if (s.kind === "behind") expect(s.airUpdate?.version).toBe(NOV26.version);
  });

  it("is behind for an unlisted version from an earlier day (installed before this page)", () => {
    const s = airState([NOV27], air("warmup-runner-2026-11-25-b8f5c5e"));
    expect(s.kind).toBe("behind");
    if (s.kind === "behind") expect(s.airUpdate).toBeNull();
  });

  it("is not behind for an unlisted version made the same day or later", () => {
    expect(airState([NOV26], air("warmup-runner-2026-11-27-eedde13")).kind).toBe("current");
    expect(airState([NOV27], air("warmup-runner-2026-11-27-dc6a2ce")).kind).toBe("current");
  });

  it("is behind for a copy not installed from a package", () => {
    expect(airState([NOV27], air("not installed from a package")).kind).toBe("behind");
  });
});

describe("installedVersions", () => {
  const NOV25 = update("warmup-runner-2026-11-25-b8f5c5e");
  const list = [NOV27, NOV26, NOV25];

  it("is the version the Air runs and every older one", () => {
    expect([...installedVersions(list, air(NOV26.version))]).toEqual([NOV26.version, NOV25.version]);
    expect([...installedVersions(list, air(NOV27.version))]).toHaveLength(3);
  });

  it("is nothing when the Air has not said what it runs", () => {
    expect(installedVersions(list, null).size).toBe(0);
    expect(installedVersions(list, air("not installed from a package")).size).toBe(0);
  });

  it("goes by date for a version the Air runs that is not listed", () => {
    expect([...installedVersions(list, air("warmup-runner-2026-11-26-aaaaaaa"))]).toEqual([NOV26.version, NOV25.version]);
  });
});

describe("installSteps", () => {
  it("is download, stop, update, start, with the version in what the windows say", () => {
    const steps = installSteps(NOV27.version, []);
    expect(steps).toHaveLength(4);
    expect(steps[0]!.download).toBe(true);
    expect(steps[2]!.expect).toEqual(["DONE: the robot is up to date.", `Version: ${NOV27.version}`]);
    expect(steps[3]!.expect).toEqual([`Robot version: ${NOV27.version}`]);
  });

  it("puts the version's own steps after the update and before starting the robot", () => {
    const steps = installSteps(NOV27.version, [{ do: "Double-click Set the Friday analytics time.", expect: "DONE" }]);
    expect(steps).toHaveLength(5);
    expect(steps[3]).toEqual({ do: "Double-click Set the Friday analytics time.", expect: ["DONE"], extra: true });
    expect(steps[4]!.do).toMatch(/Start the robot/);
  });
});

describe("robotUpdateItem", () => {
  it("says nothing unless the Air is behind", () => {
    expect(robotUpdateItem(airState([NOV27], air(NOV27.version)))).toBeNull();
    expect(robotUpdateItem(airState([NOV27], null))).toBeNull();
    expect(robotUpdateItem(airState([], null))).toBeNull();
  });

  it("names the waiting version and what the Air is on, keyed on the newest version", () => {
    const item = robotUpdateItem(airState([NOV27, NOV26], air(NOV26.version)))!;
    expect(item.title).toBe("Robot update waiting: Friday analytics in robot hours");
    expect(item.body).toBe("The Air is still on the 26 November (0339216) version");
    expect(item.markKeys).toEqual([`robot_update:${NOV27.version}`]);
    expect(item.href).toBe(`/settings/robot-updates/${NOV27.version}`);
    expect(item.fleet).toBe("physical");
  });
});

describe("parseInstallNotes", () => {
  const NOTES = `# Friday analytics in robot hours

## What changed
On Fridays, one of the robot's usual windows reads every account's analytics
instead of warming up.

## Steps
1. In the air folder, double-click Set the Friday analytics time.
2. Type 1 or 2 and press Return, then type GO and press Return.
   The window must say: DONE

## Afterwards
Keep phones 1, 3 and 4 on and charging on Fridays.
`;

  it("reads the label, what changed, the steps and afterwards", () => {
    expect(parseInstallNotes(NOTES)).toEqual({
      label: "Friday analytics in robot hours",
      whatChanged:
        "On Fridays, one of the robot's usual windows reads every account's analytics\ninstead of warming up.",
      extraSteps: [
        { do: "In the air folder, double-click Set the Friday analytics time." },
        { do: "Type 1 or 2 and press Return, then type GO and press Return.", expect: "DONE" },
      ],
      afterwards: "Keep phones 1, 3 and 4 on and charging on Fridays.",
    });
  });

  it("takes None as no steps, and leaves out sections that are not there", () => {
    const notes = parseInstallNotes("# Fixes\n\n## What changed\nFewer stops.\n\n## Steps\nNone\n");
    expect(notes.extraSteps).toEqual([]);
    expect(notes.afterwards).toBeNull();
  });

  it("refuses notes it cannot read rather than guessing", () => {
    expect(() => parseInstallNotes("## What changed\nx\n")).toThrow(/# <label>/);
    expect(() => parseInstallNotes("# A\n\n## Steps\n1. x\n")).toThrow(/What changed/);
    expect(() => parseInstallNotes("# A\n\n## Notes\nx\n")).toThrow(/unknown section/);
    expect(() => parseInstallNotes("# A\n## What changed\nx\n## Steps\nDo this first\n")).toThrow(/not a numbered step/);
  });
});
