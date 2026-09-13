import * as React from "react";

export interface SkeletonProps {
  /** @default "100%" */
  width?: number | string;
  /** @default 16 */
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

/** Pulsing placeholder block on the control ground. */
export function Skeleton(props: SkeletonProps): React.JSX.Element;

export interface CardSkeletonProps {
  title: string;
  /** @default 5 */
  lines?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** A DashCard whose body pulses while its data loads. */
export function CardSkeleton(props: CardSkeletonProps): React.JSX.Element;

export interface TableSkeletonProps {
  /** @default 8 */
  rows?: number;
  /** @default true */
  header?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** Placeholder rows at the real table's 40px pitch. */
export function TableSkeleton(props: TableSkeletonProps): React.JSX.Element;
