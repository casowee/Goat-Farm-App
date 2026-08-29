// Feature 07 — Health Records. Pure, portable domain constants and helpers for
// health records: no React, no Supabase. Shared by the server action (input
// validation), the add/edit form, and the goat-profile Health tab, so the
// record-type rules live in one place and can move to a Supabase function
// later if mobile needs them (architecture-context.md invariant 6).

export const HEALTH_RECORD_TYPES = [
  "vaccination",
  "illness",
  "treatment",
  "deworming",
  "checkup",
  "injury",
  "surgery",
] as const;

export type HealthRecordType = (typeof HEALTH_RECORD_TYPES)[number];

export const HEALTH_RECORD_STATUSES = [
  "active",
  "completed",
  "cancelled",
] as const;

export type HealthRecordStatus = (typeof HEALTH_RECORD_STATUSES)[number];

/**
 * Record types that describe a medication / treatment course — the only ones
 * that show the medication and course fields (Spec 07, Section 6).
 */
export const COURSE_RECORD_TYPES: readonly HealthRecordType[] = [
  "illness",
  "treatment",
  "injury",
  "surgery",
];

/**
 * Record types that describe recurring care — the only ones that show the
 * "next due date" field (Spec 07, Section 6).
 */
export const FOLLOW_UP_RECORD_TYPES: readonly HealthRecordType[] = [
  "vaccination",
  "deworming",
  "checkup",
];

export const HEALTH_RECORD_TYPE_LABELS: Record<HealthRecordType, string> = {
  vaccination: "Vaccination",
  illness: "Illness",
  treatment: "Treatment",
  deworming: "Deworming",
  checkup: "Checkup",
  injury: "Injury",
  surgery: "Surgery",
};

export const HEALTH_RECORD_STATUS_LABELS: Record<HealthRecordStatus, string> = {
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function isHealthRecordType(value: string): value is HealthRecordType {
  return (HEALTH_RECORD_TYPES as readonly string[]).includes(value);
}

export function isHealthRecordStatus(
  value: string,
): value is HealthRecordStatus {
  return (HEALTH_RECORD_STATUSES as readonly string[]).includes(value);
}

export function isCourseType(value: string): boolean {
  return (COURSE_RECORD_TYPES as readonly string[]).includes(value);
}

export function isFollowUpType(value: string): boolean {
  return (FOLLOW_UP_RECORD_TYPES as readonly string[]).includes(value);
}

/**
 * The status a new record should default to: `active` for a course type
 * (there is likely an ongoing course to track), `completed` for a one-off
 * event (Spec 07, Section 6).
 */
export function defaultStatusForType(value: string): HealthRecordStatus {
  return isCourseType(value) ? "active" : "completed";
}
