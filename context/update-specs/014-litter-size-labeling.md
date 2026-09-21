# 014 — Litter Size Labeling & Multi-Birth Capability

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-014`                                                          |
| Title             | Label kidding events by litter size (Single/Twins/Triplets) + a per-doe capability stat |
| Status            | `approved` — owner requested directly                             |
| Owner approved?   | yes                                                              |
| Feature spec(s)   | extends `UPD-012` (kidding events), exercised by `UPD-013` (multi-kid entry) |
| Depends on        | `UPD-012` (`computeKiddingEvents`, already returns `kidCount` per event) |
| Schema impact     | **none** — pure display layer on data that already exists         |
| Created           | 2026-09                                                           |

---

## 1. Reason for update

Now that litters can be entered properly (`UPD-013`), the owner wants to see **which does tend toward
multiples** — twins, triplets — not just a bare kidding date. This is valuable for understanding each
doe's reproductive characteristics, not only whether she's on schedule.

## 2. Current behavior

`computeKiddingEvents` (`UPD-012`) already returns `kidCount` for every event, and the goat card's
Breeding tab already lists the actual kids per event (from the earlier goat-link improvement). Nothing
currently labels an event by its size (single vs. twins vs. triplets), and there's no per-doe summary of
her litter-size pattern.

## 3. Desired behavior

- Every kidding event shown anywhere (the goat card's Breeding tab, at minimum) is labeled by its litter
  size in plain terms: **Single**, **Twins**, **Triplets**, **Quadruplets**, or "N kids" beyond that.
- A doe's card shows a small **capability summary** — her average litter size and a simple breakdown
  (e.g. "3 singles, 2 twins, 1 triplet") — so a pattern toward multiples is visible at a glance, not
  something the owner has to mentally tally from the raw event list.

## 4. Scope (in and out)

**In scope**
- `labelLitterSize(kidCount)` and `computeDoeLitterStats(events)` as pure `lib` functions.
- Labeling each kidding event on the goat card's Breeding tab.
- A per-doe litter-size summary stat, shown with the same prominent styling already established for the
  Total Kids number.

**Out of scope**
- Adding litter-size info to the Doe Performance or Top Performers tabs — not requested here; flagged as
  an open question in case it's wanted as a follow-on, not built now.
- Any ranking or "best for twins" leaderboard — this spec shows the data per doe, it doesn't rank does by
  it.

## 5. UX / interaction requirements

- On the goat card's Breeding tab, each kidding event's date is followed by its label, e.g.
  "12 March 2026 — **Twins**", above or alongside the list of that event's actual kids (already built).
- A doe's card shows, near the existing Total Kids stat: **"Average litter size: 1.8"** with a short
  breakdown underneath, e.g. "3 singles · 2 twins · 1 triplet" — only showing categories she's actually
  had (don't list "0 quadruplets").
- If she has zero kidding events, show nothing here (no "N/A" clutter) — this only appears once she has
  history.
- Tokens, consistent with the existing card styling — this is a small addition to an already-built tab,
  not a new page.

## 6. Domain / data / API requirements

**No migration, no schema change.** New pure functions, likely in `lib/breeding/doe-performance.ts`
alongside `computeKiddingEvents` (or a small neighboring file — keep it wherever `KiddingEvent` already
lives):

```ts
export function labelLitterSize(kidCount: number): string {
  switch (kidCount) {
    case 1: return 'Single'
    case 2: return 'Twins'
    case 3: return 'Triplets'
    case 4: return 'Quadruplets'
    default: return `${kidCount} kids`
  }
}

export interface DoeLitterStats {
  averageLitterSize: number
  countsByLabel: Record<string, number>   // e.g. { Single: 3, Twins: 2, Triplets: 1 }
}

export function computeDoeLitterStats(events: KiddingEvent[]): DoeLitterStats | null
// null if she has no kidding events yet — nothing to summarize.
```

Both pure, no Supabase/React — same convention as everything else in this area.

## 7. Safety and data integrity rules

None — read-only display over data that's already correctly computed and stored (no new writes, no RLS
change).

## 8. Acceptance criteria

- [ ] Every kidding event on a doe's Breeding tab shows its litter-size label (Single/Twins/Triplets/...).
- [ ] A doe with kidding history shows her average litter size and a non-zero-only breakdown.
- [ ] A doe with no kidding history shows neither (no empty/placeholder clutter).
- [ ] A litter of 4+ (if any test data has one) falls back to "N kids" correctly.

## 9. Verification required — automatic and manual

**Automatic** — `npm run build` passes; `tsc` clean.

**Manual (user flow)** — open a doe with a mix of singles and a twin/triplet litter (using the `UPD-013`
data already tested) and confirm each event is labeled correctly and her summary stat reads correctly;
open a doe with no history and confirm nothing extra shows.

## 10. Related spec files

- Extends: `context/update-specs/012-doe-performance-tracking.md` (`computeKiddingEvents`, unchanged).
- Exercised by: `context/update-specs/013-multi-kid-litter-entry.md`.

## 11. Implementation note

*(fill during/after build)*

## 12. Verification evidence

*(fill at the verification gate)*

## 13. Resolution / final state

*(fill when done)*

## 14. Open questions (resolve, don't guess)

- **Doe Performance / Top Performers integration.** Should average litter size also appear as a column
  or filter on those tabs, so does can be compared side by side on this trait? Not built now — confirm
  if it's wanted as a small follow-on.
