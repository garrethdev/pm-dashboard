// Reads a robot update's install notes (install-notes.md) into what the
// robot_updates row holds. Used by publish-robot-update.mjs; the format is in
// docs/ROBOT-UPDATES.md:
//
//   # <label, a few words>
//
//   ## What changed
//   <plain sentences for Yurie>
//
//   ## Steps
//   1. <one action, done while the robot is stopped>
//      The window must say: <words>
//
//   ## Afterwards
//   <anything she does differently from now on>
//
// "Steps" and "Afterwards" are optional; "None" under either means none.

const SECTION = {
  "what changed": "whatChanged",
  steps: "steps",
  "extra steps": "steps",
  "steps for this version": "steps",
  afterwards: "afterwards",
  "after this update": "afterwards",
};

const EXPECT_RE = /^(?:the window must say|expect|you should see)\s*:\s*/i;
const NONE_RE = /^(?:none|nothing)\.?$/i;

export function parseInstallNotes(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let label = null;
  let current = null;
  const sections = { whatChanged: [], steps: [], afterwards: [] };

  for (const line of lines) {
    const h1 = /^#\s+(.+?)\s*$/.exec(line);
    const h2 = /^##\s+(.+?)\s*:?\s*$/.exec(line);
    if (h1 && !line.startsWith("##")) {
      if (label !== null) throw new Error("there is more than one # title.");
      label = h1[1];
      current = null;
    } else if (h2) {
      const name = SECTION[h2[1].toLowerCase()];
      if (!name) throw new Error(`unknown section "## ${h2[1]}". Use What changed, Steps or Afterwards.`);
      current = name;
    } else if (current) {
      sections[current].push(line);
    } else if (line.trim() !== "") {
      throw new Error(`text before the first ## section: "${line.trim()}".`);
    }
  }

  if (!label) throw new Error('the first line must be "# <label>".');
  if (label.length > 80) throw new Error(`the label is ${label.length} characters; keep it under 80.`);

  const prose = (ls) => {
    const t = ls.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    return t === "" || NONE_RE.test(t) ? null : t;
  };

  const whatChanged = prose(sections.whatChanged);
  if (!whatChanged) throw new Error('"## What changed" is missing or empty.');

  const extraSteps = [];
  for (const raw of sections.steps) {
    const line = raw.trim();
    if (line === "" || NONE_RE.test(line)) continue;
    const item = /^\d+[.)]\s+(.+)$/.exec(line);
    if (item) {
      extraSteps.push({ do: item[1] });
      continue;
    }
    const last = extraSteps[extraSteps.length - 1];
    if (!last) throw new Error(`under ## Steps, "${line}" is not a numbered step.`);
    if (EXPECT_RE.test(line)) {
      const words = line.replace(EXPECT_RE, "");
      last.expect = last.expect ? `${last.expect}\n${words}` : words;
    } else {
      last.do = `${last.do} ${line}`;
    }
  }

  return { label, whatChanged, extraSteps, afterwards: prose(sections.afterwards) };
}
