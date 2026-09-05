"use client";

import {
  SeasonFormDialog,
  type BarnOption,
} from "@/components/breeding/season-form-dialog";
import type { EligibleMale } from "@/lib/breeding/eligible-males";
import type { SeasonTemplate } from "@/lib/breeding/templates";

/**
 * Feature 09 (5a) — "Approve season". A thin wrapper that opens the EXISTING
 * Log Season dialog pre-filled with a template + its suggested start date.
 * There is no separate draft state — saving creates the real
 * `breeding_season_occurrences` row through the same action.
 */
export function ApproveSeasonButton({
  templateId,
  suggestedStart,
  bucks,
  bucklings,
  barns,
  templates,
  size = "sm",
  variant = "outline",
}: {
  templateId: number;
  /** ISO `YYYY-MM-DD`. */
  suggestedStart: string;
  bucks: EligibleMale[];
  bucklings: EligibleMale[];
  barns: BarnOption[];
  templates: SeasonTemplate[];
  size?: "default" | "sm";
  variant?: "default" | "outline";
}) {
  return (
    <SeasonFormDialog
      bucks={bucks}
      bucklings={bucklings}
      barns={barns}
      templates={templates}
      templateId={templateId}
      defaultStartDate={suggestedStart}
      triggerLabel="Approve season"
      triggerVariant={variant}
      triggerSize={size}
    />
  );
}
