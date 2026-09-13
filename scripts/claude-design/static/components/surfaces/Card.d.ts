import * as React from "react";

export interface CardProps {
  /** The one-per-page accent gradient. @default false */
  hero?: boolean;
  /** One step toward the page ground; for a card whose content carries the weight. @default false */
  sunken?: boolean;
  /** Lit translucent surface. Needs a `.glow-layer` behind it or it reads as a flat box. @default false */
  glass?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** Bare card surface: 24px radius, 20px padding. */
export function Card(props: CardProps): React.JSX.Element;

export interface DashCardProps {
  /** Card title, shown muted. */
  title: string;
  /** Segmented filter pills, inline beside the title. */
  toolbar?: React.ReactNode;
  /** Controls pinned right of the header row (dropdowns, search, counts). */
  actions?: React.ReactNode;
  /** The card's one way out, a CTA that behaves like "View all". */
  headerAction?: React.ReactNode;
  /** Renders the "View all ›" pill link. */
  viewAllHref?: string;
  sunken?: boolean;
  glass?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** Dashboard section card with a title row and body. */
export function DashCard(props: DashCardProps): React.JSX.Element;
