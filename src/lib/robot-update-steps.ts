/**
 * The steps on a robot update's "How to install" page (2026-11-27).
 *
 * The same four every time, taken from the Word guides they replace (the last
 * one, "Robot update 27 November"), with the version's own steps put in while
 * the robot is stopped: that is where every one-off step in those guides went
 * (e.g. "Set the Friday analytics time" refuses while the robot runs).
 *
 * Each usual step is a short action plus the detail of how, so the page reads
 * as a list of four things to do (the redesign asked for the same day). The
 * words Yurie is told to look for are the words the robot's windows print
 * (warmup-runner air/Update the robot.command, air/Start the robot.command).
 */

import type { ExtraStep } from "@/lib/data/robot-updates";

export interface InstallStep {
  /** The action, short. */
  do: string;
  /** How, in one sentence. Optional. */
  how?: string;
  /** What she should see when it worked: words the window prints, one per line. */
  expect?: string[];
  /** This step is the download: the page puts the Download button in it. */
  download?: boolean;
  /** Came from this version, not from the usual four. */
  extra?: boolean;
}

/** The robot's working hours, Manila time (fleet.json on the Air, 2026-10-20:
 *  01:00-04:00 and 12:00-15:00 New York, plus the last warmup's half hour). */
export const ROBOT_HOURS_MANILA = "2–5 PM and 1–4 AM";

export function installSteps(version: string, extra: ExtraStep[]): InstallStep[] {
  return [
    {
      do: "Download the update",
      how: "It goes into Downloads. Don't open it.",
      download: true,
    },
    {
      do: "Stop the robot",
      how: "Click the Start the robot window and press Control + C.",
    },
    {
      do: "Run Update the robot",
      how: "In Finder, open warmup-runner, then air, and double-click Update the robot.",
      expect: ["DONE: the robot is up to date.", `Version: ${version}`],
    },
    ...extra.map((s) => ({ do: s.do, ...(s.expect ? { expect: [s.expect] } : {}), extra: true })),
    {
      do: "Start the robot",
      how: "In the air folder, double-click Start the robot, type GO and press Return. Leave the window open.",
      expect: [`Robot version: ${version}`],
    },
  ];
}
