"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { LoadingDots } from "@/components/loading/loading-dots";
import { cn } from "@/lib/utils";

/**
 * Spec 18.1 (§4C) — the one submit button for every form in the app.
 *
 * Before this, nineteen forms each carried their own near-identical six-line
 * `SubmitButton`: read `useFormStatus()`, disable while pending, swap in a
 * `Loader2` spinner, swap the label. This is that pattern built once, with the
 * two things those copies were missing:
 *
 * - **A stable width.** Both the idle label and the pending label are rendered
 *   into the same grid cell, one of them hidden, so the button is always as wide
 *   as the wider of the two. "Save" → "Saving…" no longer shifts a dialog footer
 *   sideways mid-submit.
 * - **`LoadingDots`, not a spinner.** The three-dot pulse is this app's loading
 *   language everywhere else (`UPD-015`, spec 17.3's skeletons, the "Show more"
 *   control), and a save is loading like any other.
 *
 * Double-tap protection needs nothing extra here: React sets `pending`
 * synchronously when the form action starts, so the second tap of a fast
 * double-tap lands on an already-disabled button. If the action fails, `pending`
 * returns to `false` and the button is live again for a retry.
 *
 * It must be rendered *inside* the `<form>` it submits — that is how
 * `useFormStatus` finds the form — which is exactly where the copies it replaces
 * already lived.
 */
export interface SubmitButtonProps {
  /** The idle label. A node, so a button can carry an icon alongside its text. */
  children: ReactNode;
  /** Present-tense label shown while the action runs. */
  pendingLabel?: string;
  /** Disables the button for a reason of the form's own (invalid input, etc.). */
  disabled?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  disabled,
  variant = "default",
  size = "default",
  className,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={className}
    >
      {/*
        Both labels occupy the same grid cell, so the button's width is the max
        of the two and never changes when the state flips. The hidden one keeps
        its space (`invisible`, not `hidden`) and is taken out of the accessibility
        tree, so a screen reader hears one label at a time.
      */}
      <span className="grid place-items-center">
        <span
          className={cn(
            "col-start-1 row-start-1 inline-flex items-center gap-1.5",
            pending && "invisible",
          )}
          aria-hidden={pending || undefined}
        >
          {children}
        </span>
        <span
          className={cn(
            "col-start-1 row-start-1 inline-flex items-center gap-1.5",
            !pending && "invisible",
          )}
          aria-hidden={!pending || undefined}
        >
          <LoadingDots size="sm" label={pendingLabel} className="text-current" />
          {pendingLabel}
        </span>
      </span>
    </Button>
  );
}
