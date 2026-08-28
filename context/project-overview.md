# Goat Farm Manager

## Overview

Goat Farm Manager is a personal farm management app for a single farm owner. It uses a structured database to let the owner track individual goats — housed across one or more barns — and their full history: health, vaccinations, deworming, breeding, weight, and lineage. Alongside the goats it manages medicine and feed inventory, sales and purchases, farm to-dos, a calendar of activities, and a reference library of common goat ailments.

It also tracks each goat's family tree, warns against inbreeding when planning matings, and can export PDF reports.

It is built desktop-first and also works on a phone through the browser. The backend is designed from the start to be reusable, so that native iOS and Android apps can later share the same data and accounts.

It is an organizational and informational tool only. It is **not** a diagnostic tool and does not replace a veterinarian.

## Goals

1. Let the single owner sign in securely and manage all farm data in one place.
2. Organize goats into barns and move them between barns as needed.
3. Track individual goat profiles and their complete history over time.
4. Record health events: vaccinations, deworming, treatments, and medicine given.
5. Track each goat's lineage (sire, dam, and ancestors) as a family tree.
6. Warn against inbreeding by checking how closely two goats are related before a mating is recorded.
7. Keep an inventory of medicine and feed, with current stock levels.
8. Record sales and purchases.
9. Provide a calendar that shows all farm activities and due dates in one place.
10. Provide a health reference ("Doctor") of common ailments, symptoms, and warning signs — informational only.
11. Show dashboards, graphs, and simple data analysis across the whole farm.
12. Manage farm to-dos and reminders, including health checks that are due.
13. Export PDF reports (individual goat history, whole-herd summary, and sales).
14. Build a clean, well-structured backend that future iOS and Android apps can reuse.

## Core User Flow

1. Owner signs in.
2. Owner lands on a dashboard summarizing the herd, upcoming tasks, and key numbers.
3. Owner opens a module (e.g. Goats, Barns, Health, Breeding, Inventory, Sales, Calendar, Doctor, Analytics).
4. Owner adds, edits, or reviews records. New goats are assigned to a barn at registration.
5. Records are saved to the database and reflected in the dashboard, calendar, and graphs.
6. Owner can export any report as a PDF at any time.

## Features

### Authentication
- Single-owner sign-in (email and password) and protected routes.
- All data belongs to the signed-in owner.

### Goat Profiles
- Core details: name / tag ID, breed, sex, date of birth or age, reproductive state (intact or castrated), status (active, sold, deceased), photo, and notes.
- Housing: each goat is assigned to a barn when it is registered, and can be moved to another barn later.
- Stage / class is derived automatically from sex, age, and reproductive state — Doe, Doeling, Buck, Buckling, Wether, or Kid — so it stays correct on its own as a goat ages (a doeling becomes a doe without any manual update).
- Parents: links to the goat's sire (father) and dam (mother) — each can be a full record in the app or an external animal recorded by name.
- Each goat links to its own health, vaccination, deworming, breeding, weight, and lineage history.

### Barns / Housing
- Create and manage barns. Each barn has a name, an optional category (e.g. does, bucks, kids, or *mixed* — for seasonal breeding when males and females are housed together), and notes.
- At least one barn must exist before goats can be registered, so every goat has a known location.
- Move a goat from one barn to another, with an optional record of past moves (useful when the best animals are pulled into a separate barn).
- Goat lists and analytics can be filtered to one or more barns, with an "all barns" overview as the default.

### Family Tree & Pedigree
- Trace a goat's ancestry back through parents, grandparents, and earlier generations.
- Full sire (father) line and dam (mother) line are both viewable.
- Parents that are not in the system are stored by name so the line is still recorded.
- Offspring recorded in the breeding module automatically inherit their sire and dam links.

### Health & Veterinary Records
- Health history: illnesses, symptoms, treatments, and outcomes per goat, each with a date.
- Vaccinations: vaccine, date given, next due date.
- Deworming: product, date, next due date.
- Medicine records: what was administered, dose, and date.

### Breeding & Inbreeding Prevention
- Matings, expected and actual kidding dates, sire / dam, and offspring.
- Before a mating is recorded, the system checks how closely the two goats are related using the family tree.
- It flags close relationships (parent–offspring, full and half siblings, grandparent–grandchild, and other shared ancestors within a set number of generations).
- The warning shows the shared ancestor, and recording a flagged mating requires explicit confirmation to override.
- Note: the check is only as accurate as the recorded lineage; goats with unknown parents cannot be fully checked.

### Weight Records
- Weight entries over time per goat, shown as a growth curve.

### Inventory
- Medicine stock: item, quantity on hand, and low-stock awareness.
- Feed / food stock: item, quantity on hand, and low-stock awareness.

### Sales & Purchases
- Records of goats (and optionally supplies) bought and sold, with date, party, and amount.

### Calendar
- A month / week calendar showing all dated farm activities in one place.
- Pulls in vaccinations and deworming due, expected kidding dates, feeding schedule, and to-dos.
- Selecting a day shows that day's activities and lets the owner add a new task.

### Health Reference ("Doctor")
- A reference library of common goat ailments: typical symptoms, general guidance, and clear signs of an emergency.
- Informational only, with a visible disclaimer that it does not diagnose and does not replace a vet.

### Dashboard & Analytics
- Graphs and simple analysis: herd size, weight growth, vaccinations / deworming due soon, sales over time, and medicine / feed stock levels.
- Herd composition: counts by stage (Doe, Doeling, Buck, Buckling, Wether, Kid), total males vs females, and the buck-to-doe ratio for breeding planning.
- Views can be filtered by barn, with an "all barns" overview as the default.

### To-Do & Reminders
- Farm tasks and feeding schedule.
- Automatic reminders for vaccinations and deworming that are due, based on the recorded next-due dates.

### Reports & PDF Export
- Individual goat report: a goat's full profile and complete history as a PDF.
- Herd summary report: all goats with counts by status, stage, breed, and barn as a PDF.
- Sales report: sales and purchases over a chosen period, with totals, as a PDF.

## Scope

### In Scope (this project)
- Single-owner authentication and protected routes.
- Barns / housing groups, with goats assigned to a barn at registration and movable between barns.
- All modules above: goat profiles, family tree, health / vet records, breeding with inbreeding prevention, weight, inventory, sales & purchases, calendar, health reference, analytics, to-dos, and PDF reports.
- Desktop-first design that also works on a phone browser.
- Free-tier hosting and services only.
- A backend structured so future native mobile apps can reuse it.

### Out of Scope (for now)
- Native iOS and Android apps (planned for later — this is why the backend is built to support them).
- Tracking of other animals such as cows (planned for later).
- Multiple users, collaboration, or real-time shared editing.
- Billing or subscriptions.
- AI-generated content or automated diagnosis.

### Planned for Later (designed for, not built now)
- **Multiple farms.** A layer above barns (Farm → Barn → Goat), with a combined overview across farms, for an operation that spans separate properties or locations. The data model keeps barns grouped so a farm layer can be added on top later without changing existing records. Barns come first; farms are the future extension.
- **Seasonal patterns in health data.** Because every health record stores a date, the analytics can later break down which ailments tend to occur in which natural season, with no extra data entry now — the season is derived from the date. Farm seasons such as breeding and kidding periods could also be added later if wanted.
- **Breeding season planning.** Let the owner define a breeding window (when the males are introduced to the does and when they are separated), then automatically project the expected kidding window from the mating date — gestation is about 150 days — and show it on the calendar with reminders. For now, because matings and births are recorded with dates, the analytics can already reveal breeding and kidding patterns without this planning layer.

## Build Phases (suggested)

To keep the build manageable, features are grouped rather than built all at once:

1. **Foundation:** auth, database connection, barns, and goat profiles (with barn assignment and sire / dam parent links).
2. **Core records:** health, vaccinations, deworming, medicine, weight, breeding, family tree / pedigree, and the inbreeding check.
3. **Operations:** inventory and sales & purchases.
4. **Insight:** dashboard, graphs, analytics, and the calendar.
5. **Reference & output:** the "Doctor" health reference, to-dos / reminders, and PDF reports.

## Success Criteria

1. The owner can sign in and only sees their own data.
2. The owner can create a barn, and register a goat that is assigned to that barn.
3. The owner can move a goat from one barn to another.
4. The owner can add a goat and view its full profile.
5. A goat's profile shows its parents and an ancestry / family tree view.
6. When planning a mating, the app warns if the two goats are closely related and shows the shared ancestor.
7. Recording a vaccination or deworming creates a reminder when the next-due date approaches.
8. Weight entries display as a growth graph.
9. The calendar shows upcoming vaccinations, deworming, kidding dates, and tasks.
10. A goat's stage (Doe, Doeling, Buck, Buckling, Wether, Kid) is shown correctly from its sex, age, and reproductive state, and the analytics show herd counts by stage, male vs female totals, and the buck-to-doe ratio.
11. Inventory shows current medicine and feed stock.
12. A sale or purchase can be recorded and appears in the sales analytics.
13. The owner can browse the health reference, with the non-diagnostic disclaimer visible.
14. The owner can download a PDF of a single goat's full history, a herd summary, and a sales report.
15. All records persist correctly, and the same backend can be reached by a future mobile app.
