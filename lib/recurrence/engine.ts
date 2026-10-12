import { RRule } from "rrule";
import type {
  FixedAnnualConfig,
  FixedRuleConfig,
  IntervalConfig,
  Obligation,
  Occurrence,
  OccurrenceState,
  SeasonalWindowConfig,
} from "./types";

/**
 * All date strings are YYYY-MM-DD in America/Los_Angeles.
 * Functions accept a `today` param for testability (defaults to real today).
 */

export function todayLA(): string {
  return new Date()
    .toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" })
    .slice(0, 10);
}

function dateFromString(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dateToString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function clampDay(year: number, month: number, day: number): Date {
  const maxDay = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, Math.min(day, maxDay));
}

function addDays(dateStr: string, days: number): string {
  const d = dateFromString(dateStr);
  d.setDate(d.getDate() + days);
  return dateToString(d);
}

function diffDays(a: string, b: string): number {
  const da = dateFromString(a);
  const db = dateFromString(b);
  return Math.round((da.getTime() - db.getTime()) / 86400000);
}

// --- Next due date computation ---

export function getNextDueDate(
  obligation: Obligation,
  lastCompletionDate: string | null,
  today?: string
): string | null {
  const ref = today ?? todayLA();

  switch (obligation.recurrence.type) {
    case "fixed_annual":
      return nextFixedAnnual(obligation.recurrence, ref);
    case "fixed_rule":
      return nextFixedRule(obligation.recurrence, ref);
    case "interval":
      return nextInterval(obligation.recurrence, lastCompletionDate);
    case "seasonal_window":
      return nextSeasonalWindow(obligation.recurrence, ref);
    case "one_off":
      return obligation.recurrence.dueDate;
  }
}

function nextFixedAnnual(config: FixedAnnualConfig, today: string): string {
  const ref = dateFromString(today);
  const year = ref.getFullYear();

  const thisYear = clampDay(year, config.month, config.day);
  if (thisYear >= ref) return dateToString(thisYear);

  return dateToString(clampDay(year + 1, config.month, config.day));
}

function nextFixedRule(config: FixedRuleConfig, today: string): string | null {
  const [y, m, d] = today.split("-").map(Number);
  const ref = new Date(Date.UTC(y, m - 1, d));

  const rule = RRule.fromString(config.rrule);
  const next = rule.after(new Date(ref.getTime() - 1), true);
  if (!next) return null;

  const ny = next.getUTCFullYear();
  const nm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(next.getUTCDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

function nextInterval(
  config: IntervalConfig,
  lastCompletionDate: string | null
): string | null {
  if (!lastCompletionDate) return null;
  return addDays(lastCompletionDate, config.intervalDays);
}

function nextSeasonalWindow(
  config: SeasonalWindowConfig,
  today: string
): string {
  const ref = dateFromString(today);
  const year = ref.getFullYear();

  const closeThisYear = clampDay(year, config.windowCloseMonth, config.windowCloseDay);
  if (closeThisYear >= ref) {
    return dateToString(
      clampDay(year, config.windowCloseMonth, config.windowCloseDay)
    );
  }

  return dateToString(
    clampDay(year + 1, config.windowCloseMonth, config.windowCloseDay)
  );
}

// --- Occurrence generation ---

export function generateOccurrence(
  obligation: Obligation,
  lastCompletionDate: string | null,
  today?: string
): Occurrence | null {
  const ref = today ?? todayLA();

  if (obligation.recurrence.type === "interval" && !lastCompletionDate) {
    return null;
  }

  const dueDate = getNextDueDate(obligation, lastCompletionDate, ref);
  if (!dueDate) return null;

  const occ: Occurrence = {
    obligationId: obligation.id,
    dueDate,
    confirmed: true,
  };

  if (obligation.recurrence.type === "seasonal_window") {
    const config = obligation.recurrence;
    const dueD = dateFromString(dueDate);
    const year = dueD.getFullYear();

    occ.windowStart = dateToString(
      clampDay(year, config.windowOpenMonth, config.windowOpenDay)
    );
    occ.windowEnd = dueDate;
    occ.confirmed = config.confirmed;
  }

  return occ;
}

// --- State computation ---

export function getOccurrenceState(
  dueDate: string,
  leadTimeDays: number,
  today?: string
): Extract<OccurrenceState, "upcoming" | "due" | "overdue"> {
  const ref = today ?? todayLA();
  const daysUntilDue = diffDays(dueDate, ref);

  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= leadTimeDays) return "due";
  return "upcoming";
}

export function getSnoozedState(
  snoozedUntil: string,
  today?: string
): "snoozed" | null {
  const ref = today ?? todayLA();
  if (diffDays(snoozedUntil, ref) >= 0) return "snoozed";
  return null;
}

// --- Window rollover ---

export function rollWindowForward(
  config: SeasonalWindowConfig,
  fromYear: number
): SeasonalWindowConfig {
  return {
    ...config,
    confirmed: false,
  };
  // Dates stay the same month/day, just applied to the next year.
  // The year is determined by getNextDueDate at query time.
  // Setting confirmed=false flags it for user review.
}

// --- Helpers for snooze ---

export function snoozeDate(
  currentDueDate: string,
  snoozeDays: number
): string {
  return addDays(currentDueDate, snoozeDays);
}

export { addDays, diffDays, clampDay, dateToString, dateFromString };
