/**
 * Reference documents listed on the Resources page (Garreth, 2026-11-03).
 * Each one is a live Claude Doc; the page only links to it, so edits made in
 * the doc show up without touching the dashboard. Add a document by adding an
 * entry here.
 */
export interface Resource {
  title: string;
  summary: string;
  url: string;
  /** A page inside the dashboard rather than a Claude Doc: opens in the same
   *  tab (Creators to follow, 2026-11-13). */
  internal?: boolean;
}

export const RESOURCES: Resource[] = [
  {
    title: "Character 6 Voice Bible",
    summary: "Who Character 6 is and how she sounds. Injected into every carousel writer prompt.",
    url: "https://claude.ai/artifact/CweNxev5SXHcRteQwVKSQg",
  },
  {
    title: "Carousel Render Blueprint",
    summary: "Font, sizes, placement and date and weight labels every jealousy carousel renders to.",
    url: "https://claude.ai/artifact/9CN9pvUkGhyQaiPBzNy5bb",
  },
  {
    title: "Hook Rules",
    summary: "The three rules of a hook, what makes one read as real, approved and rejected examples with reasons, and how the Comparison Carousel writer enforces them.",
    url: "https://claude.ai/artifact/21BD6CPdzo6H7eCoaQ7S21",
  },
  {
    title: "Wiring a New Content Type",
    summary: "The columns a new carousel table needs, the eight wiring steps across Supabase and n8n, and the query that proves a lane is live.",
    url: "https://claude.ai/artifact/XUj99rfkXJfy4HMzCYtLp2",
  },
  {
    title: "Warmup Upgrade Plan",
    summary: "What the Amine warm-up gap analysis means for us: seven warmup robot updates and six manual steps for Yurie, with a checklist to tick off.",
    url: "https://claude.ai/artifact/1WUDBxNyUJRmhr4KktS1fS",
  },
  {
    title: "Creators to follow",
    summary: "Small weight-loss and midlife creators who reply to comments, for following by hand on the phones, with who has followed whom.",
    url: "/resources/follow-creators",
    internal: true,
  },
];
