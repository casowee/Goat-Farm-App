"use client";

import { cn } from "@/lib/utils";

export interface StepIndicatorStep {
  id: string;
  label: string;
}

export interface StepIndicatorProps {
  steps: StepIndicatorStep[];
  /** Zero-based index of the active step. */
  index: number;
  /**
   * Called when a step segment is tapped. Omit to render a non-interactive
   * indicator.
   */
  onStepSelect?: (index: number) => void;
  /**
   * Highest index that may be selected via a tap. Segments past this are shown
   * but not tappable. Ignored when `onStepSelect` is omitted; omit for no limit.
   */
  maxSelectable?: number;
  className?: string;
}

/**
 * Generic "Step X of N" indicator with a segmented progress bar. Token-styled,
 * no form-specific logic — reused by any multi-step wizard in `components/forms`.
 */
export function StepIndicator({
  steps,
  index,
  onStepSelect,
  maxSelectable,
  className,
}: StepIndicatorProps) {
  const total = steps.length;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-copy-secondary">
          Step {index + 1} of {total}
        </span>
        <span className="truncate text-xs text-copy-muted">
          {steps[index]?.label}
        </span>
      </div>
      <div className="flex gap-1.5">
        {steps.map((s, i) => {
          const filled = i <= index;
          const selectable =
            !!onStepSelect && (maxSelectable == null || i <= maxSelectable);
          const barClass = cn(
            "h-1.5 w-full rounded-full transition-colors",
            filled ? "bg-brand" : "bg-surface-border",
          );

          if (selectable) {
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onStepSelect?.(i)}
                aria-label={`Go to step ${i + 1}: ${s.label}`}
                aria-current={i === index ? "step" : undefined}
                className="flex flex-1 items-center py-2"
              >
                <span className={barClass} />
              </button>
            );
          }

          return (
            <span
              key={s.id}
              aria-current={i === index ? "step" : undefined}
              className="flex flex-1 items-center py-2"
            >
              <span className={barClass} />
            </span>
          );
        })}
      </div>
    </div>
  );
}
