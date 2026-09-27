import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DisclaimerBanner } from "@/components/doctor/disclaimer-banner";
import { ConditionHistoryList } from "@/components/doctor/condition-history-list";
import { resolveConditionName } from "@/lib/doctor/browse";
import {
  DOCTOR_CATEGORY_LABELS,
  findConditionBySlug,
} from "@/lib/doctor/conditions";
import {
  listHealthConditionPresets,
  listHealthRecordsByTitle,
} from "@/lib/health/queries";

/**
 * Feature 15, Task 3 — one condition: the static reference, then this farm's own
 * history with it.
 *
 * The URL carries the slugified condition name. It is resolved against the
 * static reference first and then against the owner's own presets, so a name the
 * owner added through UPD-004's "+ Add new" gets a working page too — history
 * and effectiveness only, with no guidance section. Spec 15 §2 calls that
 * expected rather than a bug, so it renders as a short note, not an error. A
 * slug neither knows is a real 404.
 */

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 text-base font-semibold text-copy-primary">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * The guidance lists are authored with `**bold**` on the few lines that carry a
 * "call the vet / report this" instruction. Rendering that as real markdown
 * would mean pulling in a parser and sanitiser for one emphasis pattern, so the
 * two halves are split here instead — no HTML is ever interpolated.
 */
function GuidanceText({ text }: { text: string }) {
  // `[\s\S]` rather than the `s` flag — this project's `tsconfig` target predates
  // `dotAll`, and `tsc` rejects the flag outright.
  const match = /^\*\*([\s\S]+?)\*\*([\s\S]*)$/.exec(text);
  if (!match) return <>{text}</>;

  return (
    <>
      <strong className="font-semibold text-copy-primary">{match[1]}</strong>
      {match[2]}
    </>
  );
}

function BulletList({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  return (
    <ul
      className={
        className ??
        "flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-copy-secondary"
      }
    >
      {items.map((item) => (
        <li key={item}>
          <GuidanceText text={item} />
        </li>
      ))}
    </ul>
  );
}

export default async function ConditionPage({
  params,
}: {
  params: Promise<{ condition: string }>;
}) {
  const { condition: slug } = await params;

  const staticEntry = findConditionBySlug(slug);

  // The presets read is only needed to resolve a slug the static reference does
  // not know; it is `cache()`d, so asking for it unconditionally costs one query
  // per request at most and keeps the resolution in one place.
  const presets = await listHealthConditionPresets();
  const name = staticEntry?.name ?? resolveConditionName(slug, presets);
  if (!name) notFound();

  const records = await listHealthRecordsByTitle(name);
  const effectiveCount = records.filter((r) => r.marked_effective).length;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-3">
        <Button
          render={<Link href="/doctor" />}
          variant="outline"
          size="sm"
          nativeButton={false}
          className="self-start"
        >
          <ArrowLeft className="h-4 w-4" />
          Health Reference
        </Button>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-copy-primary">{name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {staticEntry && (
              <Badge variant="outline">
                {DOCTOR_CATEGORY_LABELS[staticEntry.category]}
              </Badge>
            )}
            {effectiveCount > 0 && (
              <Badge variant="secondary">
                <Check className="text-brand" aria-hidden />
                {effectiveCount === 1
                  ? "1 treatment marked effective"
                  : `${effectiveCount} treatments marked effective`}
              </Badge>
            )}
          </div>
          {staticEntry && (
            <p className="text-sm text-copy-muted">{staticEntry.summary}</p>
          )}
        </div>
      </div>

      <DisclaimerBanner />

      {staticEntry ? (
        <div className="flex flex-col gap-6">
          {staticEntry.note && (
            <p className="rounded-xl border border-surface-border bg-subtle px-3 py-2.5 text-xs leading-relaxed text-copy-secondary">
              {staticEntry.note}
            </p>
          )}

          {staticEntry.protectsAgainst &&
            staticEntry.protectsAgainst.length > 0 && (
              <Section
                title="Generally given to protect against"
                icon={
                  <ShieldCheck className="h-4 w-4 text-brand" aria-hidden />
                }
              >
                <BulletList items={staticEntry.protectsAgainst} />
              </Section>
            )}

          {staticEntry.commonSymptoms.length > 0 && (
            <Section title="Commonly reported signs">
              <BulletList items={staticEntry.commonSymptoms} />
            </Section>
          )}

          <Section title="General guidance">
            <BulletList items={staticEntry.generalGuidance} />
          </Section>

          <Section
            title="Call a vet now if you see"
            icon={<TriangleAlert className="h-4 w-4 text-error" aria-hidden />}
          >
            <div className="rounded-2xl border border-error/30 bg-error/5 px-3 py-3">
              <BulletList
                items={staticEntry.emergencySigns}
                className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-copy-primary"
              />
            </div>
          </Section>
        </div>
      ) : (
        <p className="text-sm text-copy-muted">
          No reference guidance written for this yet — it is a name you added
          yourself. Your farm&rsquo;s own history with it is below.
        </p>
      )}

      <Section title="Your farm's history with this condition">
        <p className="text-xs leading-relaxed text-copy-muted">
          Every health record you have logged under this exact name, across all
          your goats, newest first. Mark the ones that actually worked, so the
          treatment is a tap away the next time this comes up.
        </p>
        <div className="pt-1">
          <ConditionHistoryList records={records} />
        </div>
      </Section>
    </div>
  );
}
