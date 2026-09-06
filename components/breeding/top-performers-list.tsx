import { GoatLink } from "@/components/goats/goat-link";
import type { TopPerformingDoe } from "@/lib/breeding/top-performers";

// Ranked list of currently-active does by lifetime kid count. Every row's tag is
// a link to that doe's own detail page (via the shared GoatLink component).

export function TopPerformersList({ does }: { does: TopPerformingDoe[] }) {
  const ranked = does.filter((doe) => doe.totalKids > 0);
  const withoutKids = does.length - ranked.length;

  if (does.length === 0) {
    return (
      <p className="text-sm text-copy-muted">You have no active does yet.</p>
    );
  }

  if (ranked.length === 0) {
    return (
      <p className="text-sm text-copy-muted">
        None of your {does.length} active does have kids on record yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col divide-y divide-surface-border overflow-hidden rounded-2xl border border-surface-border">
        {ranked.map((doe, index) => (
          <li
            key={doe.doeId}
            className="flex items-center gap-3 px-3 py-2.5"
          >
            <span className="w-6 shrink-0 text-sm tabular-nums text-copy-muted">
              {index + 1}
            </span>
            <span className="flex min-w-0 flex-col">
              <GoatLink
                goat={{ id: doe.doeId, tag: doe.tag, name: doe.name }}
                className="text-sm font-medium"
              />
              {doe.name && (
                <span className="truncate text-xs text-copy-muted">
                  {doe.name}
                </span>
              )}
            </span>
            <span className="ml-auto flex shrink-0 flex-col items-end">
              <span className="text-lg font-semibold tabular-nums text-copy-primary">
                {doe.totalKids}
              </span>
              <span className="text-xs text-copy-muted">
                {doe.totalKids === 1 ? "kid" : "kids"} ·{" "}
                {doe.kiddingEventCount}{" "}
                {doe.kiddingEventCount === 1 ? "kidding" : "kiddings"}
              </span>
            </span>
          </li>
        ))}
      </ol>
      {withoutKids > 0 && (
        <p className="text-xs text-copy-muted">
          {withoutKids} active{" "}
          {withoutKids === 1 ? "doe has" : "does have"} no kids on record yet and{" "}
          {withoutKids === 1 ? "is" : "are"} not shown.
        </p>
      )}
    </div>
  );
}
