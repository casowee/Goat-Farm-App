import { Info } from "lucide-react";
import { DOCTOR_DISCLAIMER } from "@/lib/doctor/conditions";

/**
 * Feature 15 — the non-diagnostic disclaimer.
 *
 * `architecture-context.md` invariant 4: "the health reference is informational
 * only and always shows the non-diagnostic disclaimer." Built as one component
 * used by every page in this module so "always" is structural rather than
 * something each page has to remember, and so the wording can never drift
 * between the browse page and a condition page.
 *
 * A server component on purpose — it has no interactivity, and it must never be
 * dismissible or collapsible: an invariant that can be closed is not an
 * invariant.
 */
export function DisclaimerBanner() {
  return (
    <div
      role="note"
      className="flex items-start gap-2.5 rounded-2xl border border-surface-border bg-subtle px-3 py-3"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
      <p className="text-xs leading-relaxed text-copy-secondary">
        <span className="font-medium text-copy-primary">
          Not a diagnosis.{" "}
        </span>
        {DOCTOR_DISCLAIMER}
      </p>
    </div>
  );
}
