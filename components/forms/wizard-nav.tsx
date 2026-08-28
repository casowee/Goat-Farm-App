"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WizardNavProps {
  /** Back handler. Omit on the first step to hide the Back button. */
  onBack?: () => void;
  /** Next handler. Ignored when `children` is provided (final step). */
  onNext?: () => void;
  /** Disables the Next button (current step not yet complete). */
  nextDisabled?: boolean;
  nextLabel?: string;
  /** Skip handler for an optional step. Omit to hide the skip affordance. */
  onSkip?: () => void;
  skipLabel?: string;
  /**
   * Rendered in place of the Next button — used on the final step to supply the
   * form's submit button.
   */
  children?: ReactNode;
  className?: string;
}

/**
 * Generic Back / Next / Skip footer for a multi-step form wizard. Carries no
 * form-specific logic; the consumer wires the handlers and supplies the submit
 * button for the last step via `children`.
 */
export function WizardNav({
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Next",
  onSkip,
  skipLabel = "Skip for now — add later",
  children,
  className,
}: WizardNavProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {onSkip && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="self-start"
        >
          {skipLabel}
        </Button>
      )}
      <div className="flex items-center justify-between gap-2">
        {onBack ? (
          <Button type="button" variant="outline" onClick={onBack}>
            <ChevronLeft />
            Back
          </Button>
        ) : (
          <span />
        )}
        {children ?? (
          <Button type="button" onClick={onNext} disabled={nextDisabled}>
            {nextLabel}
            <ChevronRight />
          </Button>
        )}
      </div>
    </div>
  );
}
