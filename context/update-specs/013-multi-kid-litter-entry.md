# 013 — Multi-Kid Litter Entry (Twins / Triplets)

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-013`                                                          |
| Title             | Fast "add another from this litter" loop after registering a newborn kid |
| Status            | `approved` — owner requested directly                             |
| Owner approved?   | yes                                                              |
| Feature spec(s)   | extends `UPD-010` (newborn temp-tag registration, done)           |
| Depends on        | `UPD-010` (done); relies on `UPD-012`'s existing kidding-event grouping (done) — **no change needed there** |
| Schema impact     | **none** — this is a front-end efficiency fix, not a data model change |
| Created           | 2026-09                                                           |

---

## 1. Reason for update

Registering a doe's newborn kids currently means running the full "Add newborn kid" wizard separately for
every single kid — even though a real birth is very often twins or triplets. There's no fast way to say
"and here's her second/third kid from that same birth."

## 2. Current behavior

`UPD-010`'s "Add newborn kid" (launched from a doe's card) opens the full wizard once per kid: Dam and
Origin are locked, but Sex, DOB, Sire, and everything else is filled from scratch every time. The
sequential temp-tag generator (`{dam_tag}-K{n}`) already correctly avoids collisions across repeated
uses — that part already works fine for a litter, it's just slow to reach.

## 3. Desired behavior

After successfully saving a newborn kid, offer an immediate, lightweight **"Add another kid from this
same birth"** action. It opens a **short** form — not the full wizard — with Dam, Origin, and **Date of
birth locked to match the first kid exactly** (litter mates share a birth date), Sire pre-filled from the
kid just entered (editable, in case it's ever actually different), and only asks fresh for **Sex** (plus
Breed, same as before, auto-suggested from parents when applicable). Repeat as many times as needed; the
owner sees a running list of what's been added so far before closing out.

**Nothing changes about how kids are counted, grouped, or analyzed** — `UPD-012`'s `computeKiddingEvents`
already groups by same dam + same date of birth, so twins/triplets entered this way are already correctly
treated as one kidding event with a kid count > 1, everywhere that already reads that data (Total kids,
kidding history, the impossible-interval check, Top Performers).

## 4. Scope (in and out)

**In scope**
- The "Add another kid from this same birth" quick-loop after a newborn kid is saved.
- A short, locked-fields form for each subsequent litter mate.
- A visible running list of what's been added in the current session before the owner finishes.

**Out of scope**
- Any new "litter" table or explicit litter ID — same dam + same date of birth already functions as the
  litter grouping (reliably, since one dam can't have two unrelated births on the same day), and
  `UPD-012` already relies on exactly this. Adding a separate id would be redundant. Flagged as an open
  question only in case the owner wants litters as a distinct browsable unit for some future reason.
- Retroactively merging kids that were already entered separately with slightly mismatched dates by
  mistake before this update — that stays a manual date correction by the owner, not automated.
- Any change to `UPD-012`'s grouping logic itself — it already does the right thing; this spec only
  makes it faster to produce correctly-grouped data in the first place.

## 5. UX / interaction requirements

- After the first kid's wizard completes and saves successfully, show a brief confirmation with two
  actions: **"Done"** and **"Add another kid from this same birth."**
- Tapping "Add another..." opens a short form, well under the Form Length Standard's threshold:
  - **Dam, Origin, Date of birth** — shown read-only, locked to match the first kid exactly.
  - **Sex** — required, asked fresh each time (no default/carry-over — twins are very often mixed sex).
  - **Sire** — pre-filled from the previous kid's entry, but editable.
  - **Breed** — same behavior as the original wizard: auto-suggested from both parents if `06`'s
    parent-based computation is active and a sire is set, otherwise the normal manual picker.
  - **Notes** — optional, per kid.
- Saving generates the next sequential temp tag for that dam (`{dam_tag}-K{n}`, continuing the same
  sequence — e.g. if the first kid was `MJ02-K1`, the next is `MJ02-K2`) and returns to the same
  confirmation screen, so the loop can repeat.
- Show a **running list** during the loop (e.g. "Added so far: MJ02-K1 (Male), MJ02-K2 (Female)") so the
  owner can see what's been entered without navigating away.
- The owner ends the loop whenever they're done — there's no fixed count to declare upfront.

## 6. Domain / data / API requirements

**No migration, no schema change.** This reuses:
- `generateTempTag()` (`UPD-010`) — already collision-safe across repeated calls for the same dam.
- The existing `createGoat` action and validation — each litter mate is still just a normal goat row with
  `dam_id`, `origin = 'born_here'`, `is_temp_tag = true`, and a matching `date_of_birth`.
- `computeKiddingEvents` (`UPD-012`) — **unchanged**; already groups correctly by dam + date.

The only new code is UI/flow state: a small client-side loop tracking "what's been added this session" and
pre-filling the next short form from the previous entry.

## 7. Safety and data integrity rules

- The locked date-of-birth field is the mechanism that keeps litter mates correctly grouped by
  `UPD-012`'s existing logic — it must not be editable in the quick-add loop, or a mistyped date could
  silently split a real litter into separate "events."
- No change to any existing table, RLS, or validation rule.

## 8. Acceptance criteria

- [ ] After saving a newborn kid, "Add another kid from this same birth" is offered.
- [ ] The quick-add form locks Dam/Origin/Date of birth to match the first kid exactly.
- [ ] Sex is asked fresh every time; Sire is pre-filled but editable; Breed behaves as in the original wizard.
- [ ] Temp tags generate correctly in sequence across the whole litter (K1, K2, K3, ...).
- [ ] The running "added so far" list is accurate during the loop.
- [ ] A litter entered this way shows correctly as ONE kidding event with the right kid count everywhere
      that already reads kidding events (Total kids, kidding history, Doe Performance, Top Performers,
      the impossible-interval check) — with no changes needed to that logic.

## 9. Verification required — automatic and manual

**Automatic** — `npm run build` passes; `tsc` clean.

**Manual (user flow)** — register a doe's triplets using the new loop (3 kids, mixed sex), confirm all
three get sequential temp tags and the same date of birth, then check her goat card's Breeding tab and
confirm the litter shows as one kidding event listing all three kids (each clickable, per the earlier
goat-link fix), with Total kids counting all three correctly.

## 10. Related spec files

- Extends: `context/update-specs/010-newborn-temp-tag.md` (done).
- Relies on, unchanged: `context/update-specs/012-doe-performance-tracking.md`'s `computeKiddingEvents`.

## 11. Implementation note

*(fill during/after build)*

## 12. Verification evidence

*(fill at the verification gate)*

## 13. Resolution / final state

*(fill when done)*

## 14. Open questions (resolve, don't guess)

- **Explicit litter grouping.** This spec relies on same-dam + same-date as the implicit litter concept,
  matching what `UPD-012` already assumes. Confirm this is sufficient, or whether the owner ever wants an
  explicit "litter" as its own browsable/taggable unit later (e.g., if two unrelated events genuinely
  needed to share a date for some edge-case reason) — not built now either way.
