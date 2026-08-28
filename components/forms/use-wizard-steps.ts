"use client";

import { useState } from "react";

/**
 * One step in a multi-step form wizard. Generic — it carries no knowledge of
 * what any particular form collects; the consumer computes `complete` from its
 * own field state each render and passes the array in fresh.
 */
export interface WizardStepDef {
  /** Stable identifier for the step (used as a React key). */
  id: string;
  /** Human label shown in the step indicator. */
  label: string;
  /**
   * Whether the current step's required fields are satisfied. `false` blocks
   * "Next" and blocks forward jumps past this step. Defaults to `true`.
   */
  complete?: boolean;
  /**
   * Whether the step may be passed without completing it (e.g. an optional
   * related-record picker). Defaults to `false`.
   */
  optional?: boolean;
}

export interface WizardControls {
  /** Current step index, clamped to a valid range. */
  index: number;
  /** The current step definition. */
  step: WizardStepDef;
  /** Total number of steps. */
  total: number;
  isFirst: boolean;
  isLast: boolean;
  /** Highest step index the user has reached so far. */
  maxReached: number;
  /** Whether "Next" is currently allowed from this step. */
  canAdvance: boolean;
  /** Advance one step, if allowed. */
  next: () => void;
  /** Go back one step. */
  back: () => void;
  /**
   * Jump to an arbitrary step. Allowed when `allowJump` is set (e.g. editing an
   * existing record where all data already exists) or when the target has
   * already been reached.
   */
  goTo: (target: number) => void;
  /** Reset to a given step (default 0), clearing the reached history. */
  reset: (to?: number) => void;
}

/**
 * Drives a multi-step form wizard: which step is showing, whether "Next" is
 * allowed, and how far the user is permitted to jump. Pure navigation state —
 * it holds none of the form's field values (the consuming form owns those so
 * they persist across steps within one open dialog).
 */
export function useWizardSteps(
  steps: WizardStepDef[],
  { allowJump = false }: { allowJump?: boolean } = {},
): WizardControls {
  const [index, setIndex] = useState(0);
  const [maxReached, setMaxReached] = useState(0);

  const total = steps.length;
  const clamped = Math.max(0, Math.min(index, total - 1));
  const step = steps[clamped];
  const isFirst = clamped === 0;
  const isLast = clamped === total - 1;
  const canAdvance =
    !isLast && (step?.complete !== false || step?.optional === true);

  function next() {
    if (!canAdvance) return;
    const target = clamped + 1;
    setIndex(target);
    setMaxReached((m) => Math.max(m, target));
  }

  function back() {
    if (isFirst) return;
    setIndex(clamped - 1);
  }

  function goTo(target: number) {
    const t = Math.max(0, Math.min(target, total - 1));
    if (!allowJump && t > maxReached) return;
    setIndex(t);
    setMaxReached((m) => Math.max(m, t));
  }

  function reset(to = 0) {
    setIndex(to);
    setMaxReached(to);
  }

  return {
    index: clamped,
    step,
    total,
    isFirst,
    isLast,
    maxReached,
    canAdvance,
    next,
    back,
    goTo,
    reset,
  };
}
