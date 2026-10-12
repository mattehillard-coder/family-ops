export type OccurrenceState =
  | "upcoming"
  | "due"
  | "overdue"
  | "done"
  | "skipped"
  | "snoozed";

export type RecurrenceType =
  | "fixed_annual"
  | "fixed_rule"
  | "interval"
  | "seasonal_window"
  | "one_off";

export interface FixedAnnualConfig {
  type: "fixed_annual";
  month: number; // 1-12
  day: number; // 1-31
}

export interface FixedRuleConfig {
  type: "fixed_rule";
  rrule: string; // RRULE string
}

export interface IntervalConfig {
  type: "interval";
  intervalDays: number;
  intervalMiles?: number;
}

export interface SeasonalWindowConfig {
  type: "seasonal_window";
  windowOpenMonth: number; // 1-12
  windowOpenDay: number; // 1-31
  windowCloseMonth: number; // 1-12
  windowCloseDay: number; // 1-31
  confirmed: boolean;
}

export interface OneOffConfig {
  type: "one_off";
  dueDate: string; // YYYY-MM-DD
}

export type RecurrenceConfig =
  | FixedAnnualConfig
  | FixedRuleConfig
  | IntervalConfig
  | SeasonalWindowConfig
  | OneOffConfig;

export interface Obligation {
  id: string;
  title: string;
  recurrence: RecurrenceConfig;
  leadTimeDays: number;
}

export interface Occurrence {
  obligationId: string;
  dueDate: string; // YYYY-MM-DD
  windowStart?: string; // YYYY-MM-DD, for seasonal windows
  windowEnd?: string; // YYYY-MM-DD, for seasonal windows
  confirmed: boolean;
}
