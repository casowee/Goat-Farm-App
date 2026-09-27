// Feature 15, Task 1 — the Doctor module's static reference content.
//
// Pure data: no React, no Supabase, no I/O — so it stays portable if the mobile
// apps later want the same reference (architecture-context.md invariant 6) and
// so it can be read during render on the server without a round-trip.
//
// EVERY `name` below is copied character-for-character from the seeded preset
// names in `supabase/migrations/20260829000003_health_condition_presets.sql`
// (UPD-004's Appendix) — including the spaces around the slashes and the
// em-dashes in the Orf / FMD / PPR entries. That exact match is the whole
// linkage mechanism: `health_records.title` stores the picked preset name as
// plain text, so a condition page finds its history with a straight title
// comparison and no mapping table. If a preset name is ever edited, the
// matching `name` here has to be edited with it.
//
// This content is INFORMATIONAL ONLY and deliberately cautious. It never names
// a diagnosis for an individual goat, never prescribes a drug or a dose, and
// every entry ends in "when to call a vet". The non-diagnostic disclaimer is
// shown on every page of this module (architecture-context.md invariant 4).
//
// Not owner-editable by design (spec 15, Section 2): the reference ships in the
// repo. A health record logged under a name with no entry here still gets a
// working history page — it just has no guidance section, which is expected.

/**
 * The categories the Doctor module covers. `illness` and `injury` are the
 * original scope; `vaccination` was added at the owner's request while
 * resolving spec 15's Section 10 open questions — a *light* reference only
 * (what the vaccine is generally given for, plus handling and reaction signs),
 * never a schedule, since vaccination timing is regional and a vet's call.
 * Deworming, treatment, checkup and surgery records stay out: those describe
 * something done to a goat rather than something a goat has.
 */
export type DoctorCategory = "illness" | "injury" | "vaccination";

export const DOCTOR_CATEGORIES: readonly DoctorCategory[] = [
  "illness",
  "injury",
  "vaccination",
];

export const DOCTOR_CATEGORY_LABELS: Record<DoctorCategory, string> = {
  illness: "Illness",
  injury: "Injury & birth problems",
  vaccination: "Vaccinations",
};

export const DOCTOR_CATEGORY_BLURBS: Record<DoctorCategory, string> = {
  illness:
    "Conditions a goat can come down with. Symptoms overlap heavily between these — the list is here to help you describe what you are seeing, not to pick one.",
  injury:
    "Physical and birthing emergencies. Several of these move fast, so the emergency signs matter more than the general care.",
  vaccination:
    "What each vaccine on the farm is generally given to protect against. Which vaccines to give, and when, is a decision for your vet — timing differs by region and by outbreak history.",
};

export interface DoctorCondition {
  /** MUST exactly match a `health_condition_presets.name` string. */
  name: string;
  /** Stable URL segment for `/doctor/[condition]`. See `conditionSlug()`. */
  slug: string;
  category: DoctorCategory;
  /** One line for the browse list — the shortest honest description. */
  summary: string;
  /** What is commonly reported with this. Empty for vaccination entries. */
  commonSymptoms: string[];
  /** General, non-prescriptive care and husbandry notes. */
  generalGuidance: string[];
  /** Signs that mean stop reading and contact a vet. */
  emergencySigns: string[];
  /** Vaccination entries only — what the vaccine is generally given for. */
  protectsAgainst?: string[];
  /** Extra caveat, e.g. that the farm's past diagnoses were never lab-confirmed. */
  note?: string;
}

/**
 * Turn a condition name into a URL segment: lowercase, every run of
 * non-alphanumeric characters collapsed to a single hyphen, no leading or
 * trailing hyphen. Punctuation-only differences therefore collapse (so
 * "Severe Diarrhea" and "Severe / Diarrhea" would produce the same slug) —
 * acceptable here because the slug is only ever resolved back to a name by
 * looking for the first match, and the seeded names are all distinct words.
 */
export function conditionSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SUSPECTED_NOTE =
  "This farm's past records of this were suspected, not lab-confirmed — the name is kept that way on purpose. Several conditions look similar in the field, so treat any earlier record under this name as “what it looked like at the time”, not a settled diagnosis.";

export const DOCTOR_CONDITIONS: readonly DoctorCondition[] = [
  // ---------------------------------------------------------------- illness
  {
    name: "Worm / Parasite Infestation",
    slug: conditionSlug("Worm / Parasite Infestation"),
    category: "illness",
    summary:
      "Internal worms — the most common drain on condition, growth and blood levels in goats.",
    commonSymptoms: [
      "Losing weight or failing to gain, while still eating",
      "Rough, staring coat and a generally “tucked up” look",
      "Pale gums or pale inner eyelids, a sign of blood loss",
      "Soft or watery dung, sometimes on and off rather than constant",
      "A soft swelling under the jaw (“bottle jaw”) in heavy, long-running cases",
      "Slow growth in kids, and does that struggle to hold condition after kidding",
    ],
    generalGuidance: [
      "Goats carry some worm burden almost always; the question is whether it has grown past what the animal can cope with, not whether worms are present at all.",
      "A vet or lab can check a dung sample and say how heavy the burden is and which worms are involved — that is what decides whether and what to treat, not the symptoms alone.",
      "Which dewormer to use, and at what dose, is a vet's call. Under-dosing and repeatedly using the same product are the two main reasons dewormers stop working on a farm.",
      "Deworming every animal on a fixed calendar tends to breed resistant worms. Treating the animals that actually need it, based on condition scoring and dung checks, holds a product's usefulness for longer.",
      "Pasture and pen management do as much as any drug: avoid grazing very short grass, keep feed and water off the ground, don't overstock a pen, and rest or rotate grazing where you can.",
      "Kids and freshly kidded does are the most vulnerable groups — worth watching more closely than the adults.",
      "Record every deworming on the goat's Health tab with the product and date. That history is what lets you see a product losing its effect over time.",
    ],
    emergencySigns: [
      "Very pale, almost white gums or inner eyelids, with weakness or staggering — this is severe blood loss",
      "A goat that is down and unable to rise",
      "Marked swelling under the jaw together with collapse or laboured breathing",
      "Rapid weight loss over days, especially in a kid",
    ],
  },
  {
    name: "Listeriosis (suspected)",
    slug: conditionSlug("Listeriosis (suspected)"),
    category: "illness",
    summary:
      "A bacterial infection that can affect the brain, producing one-sided nerve signs. Moves fast.",
    commonSymptoms: [
      "Circling, always in the same direction",
      "Head tilted or turned to one side",
      "One side of the face drooping — ear, eyelid or lip",
      "Drooling, or food packed in one cheek because chewing has gone weak",
      "Stumbling, leaning on a wall or fence, or pressing the head against something",
      "Off feed, dull, sometimes with a fever early on",
      "Abortion in pregnant does, sometimes with no nerve signs at all",
    ],
    generalGuidance: [
      "Nerve signs in a goat are always urgent. Several very different conditions produce them, and they cannot be told apart by eye — this needs a vet the same day, not overnight.",
      "Spoiled or soil-contaminated silage and wet, mouldy feed are classically involved, so it is worth checking what the affected animals have been eating and removing anything spoiled from the whole group.",
      "While waiting for the vet: move the goat somewhere quiet, level and well-bedded where it cannot fall into water or get trampled, and keep it out of direct sun.",
      "A goat that cannot chew or swallow properly can inhale food and water. Do not drench or force-feed one with nerve signs unless your vet tells you how.",
      "Treatment, if it is this, is a prescription decision and depends heavily on how early it starts. That is the whole reason to call early rather than watch another day.",
      "The bacteria involved can infect people, so wash hands thoroughly after handling an affected animal, its bedding or an aborted foetus and membranes.",
    ],
    emergencySigns: [
      "Any circling, head tilt or facial droop — call a vet immediately",
      "A goat down on its side and unable to right itself",
      "Unable to swallow, or water running back out of the mouth",
      "Fitting or paddling",
      "Abortion in a pregnant doe, with or without nerve signs",
    ],
    note: SUSPECTED_NOTE,
  },
  {
    name: "Orf — Contagious Ecthyma (suspected)",
    slug: conditionSlug("Orf — Contagious Ecthyma (suspected)"),
    category: "illness",
    summary:
      "A viral condition producing scabby sores around the mouth and nose. Spreads easily, and to people.",
    commonSymptoms: [
      "Blisters then thick, crusty scabs on the lips, muzzle, nostrils or gums",
      "Sores at the corners of the mouth that crack and bleed when the goat eats",
      "Kids going off the udder because nursing hurts",
      "Matching sores on a nursing doe's teats and udder",
      "Sometimes scabs on the feet, around the coronet, or on the vulva",
      "Usually eating and drinking less rather than looking systemically ill",
    ],
    generalGuidance: [
      "Most cases run their course over a few weeks. The real damage is usually indirect — a kid that stops nursing, or a goat that stops eating because its mouth hurts.",
      "Keep affected animals separate from the rest where you can, and handle them last so you are not carrying it down the line on your hands and equipment.",
      "The virus survives a long time in scabs and in the environment, including on feeders, bedding and gate latches, so cleaning matters as much as separating.",
      "Soft, palatable feed and easily reached water help a sore-mouthed goat keep eating. A kid that has stopped nursing may need help to keep getting milk — ask your vet how.",
      "Do not pick or scrub the scabs off. It hurts, it opens the sore to secondary infection, and it puts virus straight onto your hands.",
      "**This one infects people.** Wear gloves handling affected goats and always wash afterwards. Sores on a person's hands should be seen by a doctor — mention the animal contact.",
      "A vet may treat or prevent secondary bacterial infection in the broken skin; the virus itself is not something a medicine clears.",
    ],
    emergencySigns: [
      "A goat or kid that has stopped eating or drinking altogether",
      "Sores spreading widely, or becoming hot, swollen and foul-smelling — secondary infection",
      "A kid going quiet, cold or weak after refusing the udder",
      "Sores on the feet with lameness that keeps the goat from moving to feed and water",
      "Any sore appearing on a person who handled the animals",
    ],
    note: SUSPECTED_NOTE,
  },
  {
    name: "FMD — Foot-and-Mouth Disease (suspected)",
    slug: conditionSlug("FMD — Foot-and-Mouth Disease (suspected)"),
    category: "illness",
    summary:
      "A highly contagious viral disease of hooved livestock. In most countries it must be reported.",
    commonSymptoms: [
      "Sudden, severe lameness, often in more than one animal at once",
      "Blisters or raw, eroded patches in the mouth, on the tongue or on the dental pad",
      "Blisters or splits at the top of the hoof and between the toes",
      "Drooling, smacking the lips, obvious reluctance to eat",
      "Fever, dullness, a sharp drop in milk",
      "Deaths in young kids, sometimes before any blisters are seen",
    ],
    generalGuidance: [
      "**If this is suspected, it is not an ordinary sick-goat call.** Foot-and-mouth is a notifiable disease in most countries — contact your vet or the government veterinary service immediately and follow their instructions exactly.",
      "Stop all movement on and off the farm until you have spoken to them: no animals in or out, no shared equipment, no visitors through the pens.",
      "Do not move affected animals to another farm, a market or a slaughter point, and do not sell or give away animals from the group.",
      "In goats the signs can be mild and easy to dismiss as sore feet, which is exactly how it spreads unnoticed. Several animals going lame within a day or two of each other is the pattern that should raise it.",
      "Keep whatever notes you can — which animals, which day, what you saw. The investigating vet will want the timeline.",
      "It is not a food-safety risk to people, but it spreads readily on boots, clothing, vehicles and hands, so treat yourself as a way it travels.",
    ],
    emergencySigns: [
      "Any suspicion at all of foot-and-mouth — report it immediately, do not wait to see how it develops",
      "Several goats suddenly lame or drooling at the same time",
      "Blisters or raw patches in the mouth together with blisters at the hooves",
      "Sudden deaths in young kids in an affected group",
    ],
    note: SUSPECTED_NOTE,
  },
  {
    name: "PPR — Peste des Petits Ruminants (suspected)",
    slug: conditionSlug("PPR — Peste des Petits Ruminants (suspected)"),
    category: "illness",
    summary:
      "A serious viral disease of goats and sheep — fever, discharge, mouth sores, diarrhoea. Often notifiable.",
    commonSymptoms: [
      "High fever and sudden dullness, off feed",
      "Watery then thick, crusty discharge from the nose and eyes, sometimes gluing the eyelids",
      "Sores and grey, dying patches inside the mouth and on the gums",
      "Foul-smelling, sometimes blood-streaked diarrhoea starting a few days in",
      "Coughing and laboured breathing as it progresses",
      "Several animals affected in quick succession, with deaths — kids worst hit",
      "Abortion in pregnant does",
    ],
    generalGuidance: [
      "**Suspected PPR is an immediate vet call, and in many countries a notifiable disease.** Contact your vet or the veterinary authority the same day and follow what they tell you.",
      "Hold all animal movement on and off the farm until you have spoken to them, and keep the affected group away from the rest.",
      "A confirmed diagnosis needs a laboratory test on samples a vet takes. Early signs look like several other conditions, which is why an unconfirmed record stays “suspected”.",
      "There is no medicine that clears the virus. What a vet can do is support the animal and treat the secondary infections, mainly pneumonia and gut infection, that do much of the killing.",
      "Supportive care matters: clean water always within reach, soft feed, shade, and gentle cleaning of the crusted nose and eyes so the animal can breathe and see.",
      "Where PPR is present in a region, vaccination is the main defence — a herd-level plan to make with your vet, not a response to an outbreak already underway.",
      "Handle affected animals last, and clean boots, hands and equipment afterwards.",
    ],
    emergencySigns: [
      "Any suspicion of PPR — contact a vet or the veterinary authority immediately",
      "Several goats with fever, nasal discharge and diarrhoea at the same time",
      "Deaths, especially several kids in a short period",
      "Laboured or open-mouthed breathing",
      "A goat too weak to stand or too dehydrated to drink",
    ],
    note: SUSPECTED_NOTE,
  },
  {
    name: "Bacterial Infection / Diarrhea",
    slug: conditionSlug("Bacterial Infection / Diarrhea"),
    category: "illness",
    summary:
      "Gut upset with loose dung where a bacterial cause is suspected — most dangerous in young kids.",
    commonSymptoms: [
      "Loose, watery or pasty dung, sometimes yellow, pale or blood-flecked",
      "A dirty, soiled tail and back legs",
      "Dull, hunched, off feed or nursing less",
      "Sunken eyes, tacky gums, skin that stays tented when pinched — dehydration",
      "Fever in some cases, a low temperature and cold ears in a collapsing kid",
      "Belly pain — grinding teeth, crying, straining",
    ],
    generalGuidance: [
      "With diarrhoea, dehydration is usually what threatens the animal's life, not the infection itself. Keeping fluid going in is the first priority while you get advice.",
      "Clean water should always be within reach. A vet can advise on an oral rehydration solution and how to give it — dose and timing matter, especially for a kid.",
      "Kids go downhill in hours rather than days. A scouring kid that has gone quiet or cold needs a vet now, not in the morning.",
      "Keep milk feeding going for a scouring kid unless your vet says otherwise; a kid taken off milk loses condition fast.",
      "Bacteria, worms, coccidia, viruses and a sudden feed change all produce diarrhoea and cannot be told apart by looking. A dung sample is what separates them, and it changes what actually helps.",
      "Antibiotics are a prescription decision and are the wrong answer for many causes of scours. Using leftovers from a previous case is how resistance builds and how the real cause gets missed.",
      "Check the obvious husbandry triggers across the group: a feed or milk change, spoiled or mouldy feed, a dirty water trough, overcrowded or wet bedding.",
      "Move affected animals onto clean, dry bedding, away from the rest, and handle them last.",
    ],
    emergencySigns: [
      "Blood in the dung, or a dark, tarry appearance",
      "A kid that is cold, floppy, or will not suck",
      "Skin that stays tented when pinched, or eyes visibly sunken",
      "Unable or unwilling to stand",
      "Diarrhoea continuing more than about a day in a kid, or with a fever in an adult",
      "Several animals in the group scouring at once",
    ],
  },
  {
    name: "Severe Diarrhea",
    slug: conditionSlug("Severe Diarrhea"),
    category: "illness",
    summary:
      "Profuse, watery scouring — treated as an emergency in its own right because of fluid loss.",
    commonSymptoms: [
      "Water-thin dung, often running freely rather than passed",
      "Weakness, staggering, standing with the head down",
      "Sunken eyes, dry nose, tacky or cold gums",
      "A pinched, empty-looking flank",
      "Low body temperature and cold ears in a collapsing animal",
      "Little or no urine passed",
    ],
    generalGuidance: [
      "This is the point at which diarrhoea has stopped being a gut problem and become a fluid problem. It deserves a vet call the day you see it.",
      "Fluid replacement is what keeps the animal alive while the cause is worked out. Ask your vet about an oral rehydration solution, how much and how often — and expect a badly dehydrated animal to need fluids under the skin or by vein, which is a vet's job.",
      "A goat too weak to swallow properly can inhale a drench. If it cannot hold its head up on its own, do not drench it — say so when you call.",
      "Keep the animal warm, dry and out of wind and sun. A chilled, dehydrated goat loses ground quickly.",
      "Keep milk going for a scouring kid unless your vet says otherwise, and give rehydration fluid between milk feeds rather than instead of them.",
      "Do not reach for a leftover antibiotic or an anti-diarrhoeal. Several common causes get worse with the wrong medicine, and the delay costs more than the drug helps.",
      "Note what changed in the last few days — feed, milk, water source, new animals, weather — and tell the vet. It is often the fastest route to the cause.",
      "Isolate the animal on clean dry bedding and check the rest of the group: severe scours in more than one animal points at something shared.",
    ],
    emergencySigns: [
      "A goat down and unable to rise",
      "Skin that stays tented when pinched, or clearly sunken eyes",
      "Cold ears and cold mouth",
      "No urine passed, or very dark urine",
      "Blood in the dung",
      "Any severe scour in a kid — treat as an emergency from the start",
    ],
  },
  {
    name: "Skin Abscess / Boils",
    slug: conditionSlug("Skin Abscess / Boils"),
    category: "illness",
    summary:
      "A walled-off pocket of pus under the skin. Location matters more than size.",
    commonSymptoms: [
      "A firm or springy lump under the skin, often on the jaw, neck or shoulder",
      "The lump growing over weeks, sometimes going soft and hairless on top",
      "Bursting to release thick, pasty pus",
      "Heat and pain over the lump early on, or none at all in a slow, cold abscess",
      "Usually a normal, bright goat otherwise — which is why these get left too long",
      "Sometimes more than one animal in the herd with lumps in the same places",
    ],
    generalGuidance: [
      "Where the lump is matters. Abscesses sitting exactly where the lymph nodes are — under the jaw, in front of the shoulder, at the flank — and recurring in more than one animal raise the question of a contagious herd disease. That is a question for your vet, and it changes how you manage the whole group.",
      "Do not lance or squeeze an abscess yourself. Cutting into the wrong lump can open a blood vessel or a joint, and the pus from a contagious abscess contaminates the pen, your hands and your equipment for a long time.",
      "A vet can decide whether to open and flush it, when, and whether to sample the pus to find out what is in it — which is the only way to know if the herd has a bigger problem.",
      "Keep an animal with a bursting or draining abscess away from the rest, and handle it last. Catch and bin the discharge and the used bedding rather than letting it dry into the pen.",
      "Wear gloves. Some organisms behind goat abscesses can infect people.",
      "Not every lump is an abscess — swellings can also be a hernia, a cyst, a swollen gland, a bite reaction, or a tumour. Do not treat it as an abscess just because it looks like one.",
      "Record where on the body each lump was, so a pattern across the herd is visible later rather than remembered vaguely.",
    ],
    emergencySigns: [
      "A swelling on the throat or under the jaw that is affecting breathing or swallowing",
      "A lump near the eye, or one pressing on the eye",
      "The goat off feed, feverish or dull alongside the lump",
      "Rapidly spreading heat and swelling, or a foul-smelling discharge",
      "A swelling over a joint, or with lameness",
      "Several animals developing lumps in the same locations — call a vet about the herd, not just the animal",
    ],
  },
  {
    name: "Respiratory Illness (Sneezing / Nasal Discharge)",
    slug: conditionSlug("Respiratory Illness (Sneezing / Nasal Discharge)"),
    category: "illness",
    summary:
      "Coughing, sneezing or a runny nose. Ranges from dusty-air irritation to pneumonia.",
    commonSymptoms: [
      "Sneezing, snorting, or a persistent cough",
      "Clear, then thick yellow or green discharge from the nose",
      "Fast, shallow or laboured breathing; flanks working hard",
      "Off feed, dull, standing apart from the group",
      "Fever early on",
      "Discharge from the eyes as well as the nose",
      "In kids: falling behind the others and breathing fast at rest",
    ],
    generalGuidance: [
      "The distinction that matters is upper airway irritation versus pneumonia in the lungs. Breathing effort at rest, fever and going off feed point at the second, and that needs a vet promptly.",
      "Pneumonia in goats is often triggered rather than caught: dusty or ammonia-heavy air, poor ventilation, overcrowding, a long transport, sudden weather change, or an existing worm burden. Fixing the trigger is part of the treatment.",
      "Check the shed honestly. If the air stings your eyes or smells of ammonia at goat height, it is worse down there than where you are standing.",
      "Make it easy to breathe and easy to eat: clean dry bedding, open airflow without a direct draught, dust-free feed, water within reach.",
      "A vet may want to listen to the chest, take the temperature, and decide on antibiotics or anti-inflammatories. Which drug, and whether one is needed at all, is a prescription decision — a viral case gains nothing from an antibiotic.",
      "Watch the rest of the group. Respiratory disease that moves through the herd changes the picture from one sick animal to a management problem.",
      "Nasal discharge from one nostril only, or a foul smell, can mean something quite different — a foreign body, a tooth root problem, or a sinus issue. Worth mentioning specifically.",
    ],
    emergencySigns: [
      "Open-mouthed breathing, or breathing with the neck stretched out",
      "Blue or grey gums or tongue",
      "Standing rather than lying down because lying makes breathing worse",
      "Off feed with a high fever",
      "A sudden onset over hours rather than days",
      "Coughing after a drench — the fluid may have gone into the lungs",
      "Several animals breathing hard at once",
    ],
  },

  // ----------------------------------------------------------------- injury
  {
    name: "Bloat / Abdominal Distension",
    slug: conditionSlug("Bloat / Abdominal Distension"),
    category: "injury",
    summary:
      "Gas trapped in the rumen, swelling the left flank. Can kill within hours.",
    commonSymptoms: [
      "The left flank swollen and drum-tight, sometimes both sides",
      "Restlessness, repeatedly getting up and down, kicking at the belly",
      "Grinding teeth, stretching, crying out",
      "Fast, shallow breathing; standing with the front legs apart",
      "Stopped eating and stopped chewing the cud",
      "Drooling",
      "Collapse, then death, in a severe case",
    ],
    generalGuidance: [
      "**Bloat is a genuine emergency.** A tight, distended rumen presses on the lungs, and a badly bloated goat can die in a couple of hours. Call a vet as soon as you see it rather than waiting to see if it settles.",
      "Keep the goat standing and walking slowly if it can. Lying flat makes the pressure on the lungs worse.",
      "Take the feed away and look at what it just ate — a sudden feed change, grain, a gate left open onto lush wet legumes, or a big drink of milk in a kid are the usual precipitants.",
      "Do not pour anything down the throat on your own initiative. A goat in distress inhales drenches easily, and that turns a treatable bloat into pneumonia. Ask the vet what to give and how.",
      "Passing a stomach tube or relieving the rumen with a needle both have a place, and both are procedures to be shown by a vet — done blind they can cause serious injury or infection.",
      "Bloat in a bottle-fed kid usually traces to feeding — too much at once, too fast, milk too cold, or an inconsistent schedule. Worth reviewing the routine rather than just treating the episode.",
      "Prevent it going forward: introduce grain and new pasture gradually, keep roughage always available, avoid turning hungry goats onto rich wet growth, and keep feed stores latched.",
      "A goat that bloats repeatedly has an underlying reason. That is a vet conversation, not a repeated home fix.",
    ],
    emergencySigns: [
      "Any tight, drum-like swelling of the flank — call a vet immediately",
      "Laboured or open-mouthed breathing",
      "Down, unable to rise, or unable to stay standing",
      "Gums turning pale, blue or grey",
      "Rapidly worsening over minutes",
    ],
  },
  {
    name: "Constipation / Failure to Pass Dung",
    slug: conditionSlug("Constipation / Failure to Pass Dung"),
    category: "injury",
    summary:
      "No dung passed, or straining without result. In a newborn or a male, treat as urgent.",
    commonSymptoms: [
      "No dung in the pen from that animal, or hard, dry, scant pellets",
      "Straining, arching the back, tail up with nothing passed",
      "A hunched, tucked-up stance and a tight belly",
      "Off feed, dull, grinding teeth",
      "A newborn kid straining and crying, with no first dung passed",
      "A bloated belly developing alongside it",
    ],
    generalGuidance: [
      "First, be sure what is not being passed. Straining with no **urine** is a different and faster emergency than straining with no dung, and it is easy to confuse the two from across a pen. In male goats especially, blocked urine is life-threatening within a day — if you cannot tell, call the vet and say so.",
      "In a newborn, a plug of first dung that has not passed, or a malformation of the back end, both present like this and both need a vet quickly.",
      "In an adult, dung slowing or stopping is often a symptom rather than the problem — dehydration, a gut that has stopped moving, pain, a blockage, or a heavy worm burden can all do it. Treating the constipation alone misses the reason.",
      "What safely helps in the meantime is water and roughage: clean water always within reach, good long hay, gentle walking, and stopping grain until the animal is passing dung normally again.",
      "Do not give an enema, a purgative, or mineral oil on your own judgement, particularly to a newborn. Both a home enema and a drench can do real damage, and oil inhaled into the lungs is often fatal.",
      "Check water access honestly — a frozen, empty, fouled or hard-to-reach trough is a common cause and a quick fix.",
      "Note the last time you actually saw that goat pass dung. It is the single most useful thing to tell the vet.",
    ],
    emergencySigns: [
      "Straining to urinate, dribbling urine, or no urine passed — especially in a male goat; this is an immediate emergency",
      "No dung in 24 hours together with a swelling belly",
      "A newborn kid that has passed no dung and is straining or crying",
      "Off feed, dull or in obvious pain",
      "Repeated straining with nothing passed",
      "Vomiting or material coming back up the nose",
    ],
  },
  {
    name: "Newborn Weakness / Difficulty Standing or Breathing",
    slug: conditionSlug("Newborn Weakness / Difficulty Standing or Breathing"),
    category: "injury",
    summary:
      "A kid that is slow to breathe, slow to stand, or slow to suck. The first hours decide the outcome.",
    commonSymptoms: [
      "Not breathing, or gasping, right after birth",
      "Limp, floppy, unable to lift the head or hold itself up",
      "Cold mouth and cold ears",
      "No suck reflex, or too weak to find and hold the teat",
      "Crying weakly then going quiet",
      "Still not standing well after the first hour or two while littermates are up",
    ],
    generalGuidance: [
      "Three things kill a weak newborn, in this order: cold, no colostrum, and no oxygen. Everything below is about those three.",
      "Clear the airway first — wipe the mouth and nostrils, and hold the kid head-down briefly to let fluid drain. Rubbing the chest and body briskly with a dry towel stimulates breathing. **Do not swing a kid by its legs.**",
      "Dry it completely and get it warm. A wet newborn loses heat frighteningly fast. Dry bedding, out of draughts, and a safe heat source if you have one.",
      "A cold kid cannot digest milk. Warming comes before feeding, always — feeding a chilled kid can do more harm than waiting.",
      "Colostrum in the first hours is not optional; it is where a kid's entire early immunity comes from, and the gut's ability to absorb it fades over the first day. A kid that cannot suck needs help getting it — ask your vet how much and by what method.",
      "**Do not tube-feed a kid unless a vet or an experienced person has shown you how.** Milk delivered into the lungs is usually fatal, and a weak kid cannot protect its own airway.",
      "Check the doe too: has she enough colostrum, is the udder working, has she accepted the kid, and was the birth difficult. Any of those changes what the kid needs.",
      "Keep a record with the time of birth and the time of the first real feed. It tells you and your vet how far behind this kid actually is.",
    ],
    emergencySigns: [
      "Not breathing, gasping, or breathing with obvious effort",
      "Cold mouth — this kid is hypothermic and needs warming now",
      "Limp with no suck reflex",
      "Has not had colostrum within a few hours of birth",
      "Still unable to stand after the first couple of hours",
      "Fluid or milk coming back out of the nose",
      "Going quiet and still after crying — often the last stage, not an improvement",
    ],
  },
  {
    name: "Difficult Birth / Assisted Delivery",
    slug: conditionSlug("Difficult Birth / Assisted Delivery"),
    category: "injury",
    summary:
      "A kidding that is not progressing, or one that needed hands-on help.",
    commonSymptoms: [
      "Straining hard for a long stretch with nothing appearing",
      "Only a head, only a tail, or only one leg showing",
      "A kid visibly stuck and not advancing between pushes",
      "The doe exhausted, lying flat, stopping pushing altogether",
      "A foul-smelling or dark discharge, or a very swollen vulva",
      "Time passing between kids with the doe still clearly straining",
    ],
    generalGuidance: [
      "Know your own limit before you start. A birth that is not progressing needs a vet, and the earlier the call the better the odds for both doe and kids — an hour of waiting costs far more than a call that turns out to be unnecessary.",
      "Steady straining with no progress over roughly half an hour, or a kid presenting wrongly, is the point to phone rather than keep trying.",
      "If you do assist: scrub your hands and arms, keep nails short, use plenty of clean obstetric lubricant, and work with the doe's pushes rather than against them. Everything about this is gentler and slower than instinct suggests.",
      "Never pull hard, never use a rope or a winch, and never pull on a head with no legs or a leg with no head — sort the presentation out first, and if you cannot, stop and call.",
      "After any assisted delivery, the doe needs checking for tearing, for a retained kid, and for retained membranes — and she is at real risk of infection afterwards. Whether she needs treatment is a vet's call.",
      "Deal with the kids as their own emergency: clear airways, dry them, get them warm, get colostrum in. See the newborn weakness entry.",
      "Keep the doe warm, quiet and with water and feed within reach, and watch her for the following days — appetite, temperature, discharge, and whether she is caring for the kids.",
      "Record that the birth was assisted, and what was wrong, on the doe's record. A doe with a repeat history of difficult kiddings is a breeding decision, and that only shows up if it is written down.",
    ],
    emergencySigns: [
      "Hard straining for about half an hour with nothing appearing",
      "A kid stuck, or presenting head-only, tail-first or one-leg-only",
      "The doe giving up and lying flat, or going dull and unresponsive",
      "A foul smell, or dark red-brown discharge before any kid is born",
      "Heavy bleeding",
      "Membranes still not passed many hours after kidding",
      "The doe off feed, feverish or dull in the days afterwards",
    ],
  },

  // ------------------------------------------------------------ vaccination
  {
    name: "CDT / Clostridial Vaccine",
    slug: conditionSlug("CDT / Clostridial Vaccine"),
    category: "vaccination",
    summary:
      "The common combined clostridial vaccine — overeating disease and tetanus.",
    commonSymptoms: [],
    protectsAgainst: [
      "Enterotoxaemia, “overeating disease” — a clostridial gut infection that can kill a well-fed kid with almost no warning",
      "Tetanus, which typically follows a wound, a castration, or disbudding",
    ],
    generalGuidance: [
      "This is the vaccine most commonly given as a routine on goat farms, because the diseases it covers kill suddenly and are very hard to treat once started.",
      "How many doses, how far apart, and when to give a booster all depend on the product and the animal's age — follow your vet's advice and the label, not a remembered schedule.",
      "Protection from the doe is what covers a young kid, so a doe's timing before kidding and the kid's own first course are connected. Worth planning together with your vet rather than separately.",
      "Store it as the label says. A vaccine that has been warm, frozen, or left in sunlight may simply not work, and you will not be able to tell.",
      "Use clean needles, change them regularly, and give it in the site and by the route the label specifies — the wrong route can cause an abscess or a poor response.",
      "Record every dose with the date and product on the goat's Health tab, and set the next-due date. A vaccine given but not recorded is a booster that gets missed.",
      "A vaccine is not a substitute for the management it depends on: gradual feed changes and clean wound handling are what the two diseases really hinge on.",
    ],
    emergencySigns: [
      "Collapse, swelling of the face, difficulty breathing or hives shortly after injection — an allergic reaction needs a vet immediately",
      "A hot, growing, painful swelling at the injection site days later",
      "A goat off feed, feverish or dull for more than a day afterwards",
    ],
    note: "Vaccination timing and which vaccines are appropriate are regional decisions — they depend on the diseases present where you are and on your herd's history. Everything here is general background only; your vet decides the plan.",
  },
  {
    name: "PPR Vaccine",
    slug: conditionSlug("PPR Vaccine"),
    category: "vaccination",
    summary:
      "Vaccine against Peste des Petits Ruminants, used where PPR is present in the region.",
    commonSymptoms: [],
    protectsAgainst: [
      "Peste des Petits Ruminants — a severe, highly contagious viral disease of goats and sheep (see the PPR entry under Illness)",
    ],
    generalGuidance: [
      "Where PPR occurs, vaccination is the main practical defence: there is no medicine that clears the virus once an animal has it.",
      "Whether to use it, at what age, and how often is decided by what is happening in your region — in many places it runs through a national or government programme, so your vet or local veterinary service is the right first call.",
      "It protects animals vaccinated in good time. It does nothing for an outbreak already underway in the animals that are already infected, which is why the decision belongs in a quiet period rather than a crisis.",
      "Cold-chain handling matters a great deal with this one. A dose that has gone warm may give no protection at all while looking exactly like a dose that worked.",
      "Vaccinate healthy animals. A goat that is already sick, heavily parasitised or badly stressed may respond poorly — mention any of that to whoever is vaccinating.",
      "Record the date, product and batch on each goat's Health tab, and set the next-due date. In an outbreak investigation, that record is what establishes which animals were covered.",
    ],
    emergencySigns: [
      "Collapse, facial swelling or difficulty breathing shortly after injection — an allergic reaction needs a vet immediately",
      "A hot, painful, spreading swelling at the injection site",
      "Fever or dullness lasting more than a day afterwards",
    ],
    note: "Vaccination timing and which vaccines are appropriate are regional decisions — they depend on the diseases present where you are and on your herd's history. Everything here is general background only; your vet decides the plan.",
  },
  {
    name: "Orf Vaccine",
    slug: conditionSlug("Orf Vaccine"),
    category: "vaccination",
    summary:
      "Vaccine against orf (contagious ecthyma), used on farms with a history of it.",
    commonSymptoms: [],
    protectsAgainst: [
      "Orf / contagious ecthyma — the scabby mouth and muzzle sores described under Illness",
    ],
    generalGuidance: [
      "This is generally used on farms that already have a problem with orf, rather than as a routine everywhere — it is a decision to make with your vet based on the farm's own history.",
      "Orf vaccines are usually live, which means the vaccine itself can spread and can infect people handling it. Handle it strictly as the label says, wear gloves, and do not improvise the method or the site.",
      "Because it is live, introducing it onto a farm that has never had orf is a real consideration, not a formality. That trade-off is exactly what the vet conversation is for.",
      "It reduces how badly a herd is affected rather than guaranteeing no sores. Hygiene, separating affected animals and cleaning shared feeders still do a great deal of the work.",
      "A person who accidentally injects or scratches themselves with this vaccine should see a doctor and say what it was.",
      "Record the date and product on the goat's Health tab so you can see how the herd's orf history tracks against when it was used.",
    ],
    emergencySigns: [
      "Accidental self-injection or a scratch with the vaccine — see a doctor and say what it was",
      "Collapse, facial swelling or difficulty breathing shortly after injection — call a vet immediately",
      "A spreading, hot or foul-smelling swelling at the vaccination site",
    ],
    note: "Vaccination timing and which vaccines are appropriate are regional decisions — they depend on the diseases present where you are and on your herd's history. Everything here is general background only; your vet decides the plan.",
  },
  {
    name: "FMD Vaccine",
    slug: conditionSlug("FMD Vaccine"),
    category: "vaccination",
    summary:
      "Vaccine against foot-and-mouth disease, where its use is permitted and advised.",
    commonSymptoms: [],
    protectsAgainst: [
      "Foot-and-mouth disease — the notifiable viral disease described under Illness",
    ],
    generalGuidance: [
      "Foot-and-mouth vaccination is controlled by government policy in most countries: in some it is routine, in others it is restricted or banned outright because it interferes with proving a region is disease-free. Your veterinary authority, not the farm, decides whether it is used.",
      "The vaccine has to match the virus types circulating in your region to protect, which is another reason the choice is not a farm-level one.",
      "Protection is relatively short-lived compared with many vaccines, so boosters at the interval your vet or the programme specifies are what keeps it meaningful.",
      "It does not remove the need for the movement controls and reporting described in the FMD illness entry. A suspected case is still reported immediately, vaccinated herd or not.",
      "Cold-chain handling and correct route and site apply as with every vaccine.",
      "Record the date, product and batch per goat. Where a programme or an outbreak investigation is involved, that record is the proof of what was given and when.",
    ],
    emergencySigns: [
      "Collapse, facial swelling or difficulty breathing shortly after injection — call a vet immediately",
      "A hot, painful or spreading swelling at the injection site",
      "Fever, lameness or dullness lasting more than a day afterwards",
      "Any suspicion of foot-and-mouth itself, vaccinated or not — report it immediately",
    ],
    note: "Vaccination timing and which vaccines are appropriate are regional decisions — they depend on the diseases present where you are and on your herd's history. Everything here is general background only; your vet decides the plan.",
  },
];

/** The non-diagnostic disclaimer text — architecture-context.md invariant 4. */
export const DOCTOR_DISCLAIMER =
  "This is general reference information, not a diagnosis. Always consult a veterinarian for a confirmed diagnosis or treatment plan.";

/** Static entries for one category, in the order written above. */
export function conditionsByCategory(
  category: DoctorCategory,
): DoctorCondition[] {
  return DOCTOR_CONDITIONS.filter((c) => c.category === category);
}

/** The static entry for a URL slug, if one exists. */
export function findConditionBySlug(slug: string): DoctorCondition | undefined {
  return DOCTOR_CONDITIONS.find((c) => c.slug === slug);
}

/** The static entry for an exact `health_records.title`, if one exists. */
export function findConditionByName(name: string): DoctorCondition | undefined {
  return DOCTOR_CONDITIONS.find((c) => c.name === name);
}
