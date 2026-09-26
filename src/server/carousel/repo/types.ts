/**
 * The Carousel Generator's domain, as the screens read it.
 *
 * Every screen from D1 to D16 draws from these shapes and nothing else. The
 * repository (repository.ts) is the one boundary between them and storage,
 * so a page never knows whether it is looking at Supabase or at the fixture
 * set that lets the app be clicked through with no keys on the machine.
 *
 * Vocabulary follows docs/CAROUSEL-GENERATOR-FLOWS.md: a *batch* is a row of
 * `carousel_briefs`, a *deck* is a `carousel_drafts` row, a *slide* is a
 * `carousel_draft_slides` row. The words on a deck's pill are the deck-state
 * table in that document.
 */
import type { DeckState } from "@/server/carousel/batches/status";

export type { DeckState };

export type BatchLifecycle = "open" | "stopped" | "finished";
export type BatchMode = "manual" | "auto";

export interface CarouselType {
  /** The registry key (`content_type_registry.content_type`) or, for a
   *  Studio-made type that is not wired yet, the template slug. */
  id: string;
  slug: string;
  name: string;
  character: string;
  lifecycle: "live" | "paused" | "retired" | "not_wired";
  /** Slide count and canvas shape of the active template, if there is one. */
  slides: number | null;
  size: string | null;
  templateId: string | null;
  templateVersion: number | null;
  libraryId: string | null;
  libraryName: string | null;
  /** The active Writing version; null reads "Needs writing" on the card. */
  writing: WritingVersion | null;
  /** Supply, from the lane table: rows the scheduler can still post. */
  postsLeft: number | null;
  daysOfCover: number | null;
  medianViews: number | null;
  /** The newest batch, whatever its state. */
  lastBatch: BatchSummary | null;
  /** The last batch that is writing or rendering, if any. */
  runningBatch: BatchSummary | null;
  /** The last batch waiting for a press (Render or Approve), if any. */
  waitingBatch: BatchSummary | null;
  /** Whether the type's last batch was made in Auto (DEV-50). */
  lastAuto: boolean;
  laneTable: string | null;
}

export interface WritingVersion {
  id: string;
  typeId: string;
  version: number;
  body: string;
  citedRuleKeys: string[];
  active: boolean;
  createdBy: string | null;
  createdAt: string;
}

export interface TemplateVersionSummary {
  id: string;
  version: number;
  active: boolean;
  createdAt: string;
  createdBy: string | null;
}

export interface TemplateRecord {
  id: string;
  slug: string;
  name: string;
  character: string;
  contentType: string | null;
  libraryId: string | null;
  status: "draft" | "active" | "archived";
  sourceReferenceId: number | null;
  activeVersion: number | null;
  versions: TemplateVersionSummary[];
  /** The active version's template object, or the newest draft's. */
  template: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeckSlide {
  position: number;
  /** The painted copy for this slide, by box name. */
  copy: Record<string, string>;
  imageUrls: string[];
  renderedUrl: string | null;
  /** The painter's preview markup, drawn inline on the deck card. */
  renderedSvg: string | null;
}

export interface Deck {
  id: string;
  batchId: string;
  position: number;
  version: number;
  state: DeckState;
  /** Auto's try counter (1 to 3). */
  tries: number;
  hook: string | null;
  caption: string | null;
  /** Copy by role, as the writer returned it. */
  copy: Record<string, string>;
  music: string | null;
  musicStatus: "found" | "not_found" | "checking" | null;
  score: number | null;
  flagKind: string | null;
  flagReason: string | null;
  lastError: string | null;
  feedback: string | null;
  laneRowId: string | null;
  slides: DeckSlide[];
  renderedAt: string | null;
  approvedAt: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface BatchSummary {
  id: string;
  typeId: string;
  typeName: string;
  character: string;
  slides: number | null;
  size: string | null;
  batchName: string;
  requested: number;
  lifecycle: BatchLifecycle;
  /** The stored status word, for the runner's own bookkeeping. */
  phase: string;
  mode: BatchMode;
  madeInAuto: boolean;
  revision: number;
  rerunOf: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  lastMovementAt: string;
  renderRequestedAt: string | null;
  approvedAt: string | null;
  finishedAt: string | null;
  /** Deck counts. `written`, `rendered` and `approved` are cumulative, the
   *  way History's columns read them: a rendered deck is also written. */
  counts: {
    requested: number;
    decks: number;
    pending: number;
    writing: number;
    written: number;
    rendering: number;
    rendered: number;
    approved: number;
    flagged: number;
    dropped: number;
    failed: number;
    discarded: number;
  };
}

export interface Batch extends BatchSummary {
  templateId: string | null;
  templateVersion: number | null;
  libraryId: string | null;
  writingVersionId: string | null;
  perBatchText: Record<string, string>;
  /** The copy roles in slide order, so a card lists lines the way the deck reads. */
  roles: string[];
  decks: Deck[];
}

export interface NewBatch {
  typeId: string;
  requested: number;
  auto: boolean;
  note: string;
  perBatchText: Record<string, string>;
  libraryId: string | null;
  createdBy: string;
  rerunOf?: string | null;
}

export interface LibrarySet {
  id: string;
  name: string;
  parentId: string | null;
  count: number;
}

export interface LibraryImage {
  id: string;
  url: string;
  setName: string | null;
  subsetName: string | null;
  isCover: boolean;
  luminance: number | null;
  status: string;
  /** DEV-41 details, when the image has been read. */
  details: Record<string, unknown> | null;
}

export interface Library {
  id: string;
  slug: string;
  name: string;
  readOnly: boolean;
  count: number;
  cover: string | null;
  /** The first three images, for the tile's mosaic. */
  covers: string[];
  sets: LibrarySet[];
  /** Which types draw from this library. */
  usedBy: string[];
  untagged: number;
}

export interface LibraryDetail extends Library {
  images: LibraryImage[];
}

export interface Reference {
  id: number;
  platform: string;
  handle: string | null;
  hook: string | null;
  sourceUrl: string | null;
  thumbnail: string | null;
  slides: { position: number; media: string | null; copy: string | null; visual: string | null; role: string | null }[];
  views: number | null;
  likes: number | null;
  saves: number | null;
  publishedAt: string | null;
  topics: string[];
  hookFamily: string | null;
  score: number;
  createdAt: string | null;
  saved: boolean;
  vote: "up" | "down" | null;
  /** When this viewer saw it, on the seen part of the feed. */
  seenAt?: string;
}

export interface ReferenceAnalysis {
  status: "complete" | "partial" | "blocked" | "none";
  readAt: string | null;
  summary: Record<string, string>;
  howItWorks: Record<string, string>;
  keep: string[];
  limits: string[];
  themes: string[];
  questions: string[];
  slidesRead: { read: number; of: number } | null;
}

export interface Digest {
  id: number;
  receivedAt: string;
  subject: string | null;
  body: string | null;
  analysedAt: string | null;
  carouselCount: number | null;
  rules: { rule: string; confidence: string | null; types: string[] }[];
  carousels: Reference[];
  queued: { url: string; queuedAt: string }[];
}

export interface KnowledgeRule {
  id: number;
  ruleKey: string;
  category: string | null;
  ruleText: string;
  rationale: string | null;
  confidence: string | null;
  status: string;
  source: string;
  supportCount: number;
  platform: string | null;
  updatedAt: string;
}

export interface LaneRow {
  id: string;
  caption: string | null;
  music: string | null;
  postingDate: string | null;
  profile: string | null;
  status: string;
  /** Why it cannot post, in words; null when it can. */
  blocker: string | null;
  thumbnail: string | null;
  deckId: string | null;
  createdAt: string | null;
}

export interface OverviewData {
  today: { written: number; rendered: number; approved: number; needsInput: number };
  tasks: BatchSummary[];
  types: CarouselType[];
  totalTypes: number;
  trending: { asOf: string | null; isToday: boolean; items: Reference[] };
  saved: Reference[];
  firstRun: boolean;
}
