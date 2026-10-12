import { describe, it, expect } from "vitest";
import {
  getNextDueDate,
  getOccurrenceState,
  generateOccurrence,
  getSnoozedState,
  snoozeDate,
  rollWindowForward,
  clampDay,
  dateToString,
} from "./engine";
import type {
  Obligation,
  FixedAnnualConfig,
  FixedRuleConfig,
  IntervalConfig,
  SeasonalWindowConfig,
  OneOffConfig,
} from "./types";

function makeObligation(
  recurrence: Obligation["recurrence"],
  leadTimeDays = 7
): Obligation {
  return {
    id: "test-1",
    title: "Test obligation",
    recurrence,
    leadTimeDays,
  };
}

// ─── Fixed Annual ───────────────────────────────────────────

describe("Fixed Annual", () => {
  const config: FixedAnnualConfig = {
    type: "fixed_annual",
    month: 3,
    day: 21,
  };

  it("returns this year's date when it hasn't passed yet", () => {
    const ob = makeObligation(config);
    expect(getNextDueDate(ob, null, "2027-01-15")).toBe("2027-03-21");
  });

  it("returns next year's date when this year's has passed", () => {
    const ob = makeObligation(config);
    expect(getNextDueDate(ob, null, "2027-04-01")).toBe("2028-03-21");
  });

  it("returns today's date when today IS the date", () => {
    const ob = makeObligation(config);
    expect(getNextDueDate(ob, null, "2027-03-21")).toBe("2027-03-21");
  });

  it("handles leap year birthday (Feb 29)", () => {
    const leapConfig: FixedAnnualConfig = {
      type: "fixed_annual",
      month: 2,
      day: 29,
    };
    const ob = makeObligation(leapConfig);
    // 2027 is not a leap year, so Feb 29 clamps to Feb 28
    expect(getNextDueDate(ob, null, "2027-01-01")).toBe("2027-02-28");
    // 2028 is a leap year
    expect(getNextDueDate(ob, null, "2028-01-01")).toBe("2028-02-29");
  });

  it("handles end-of-month clamping (Jan 31 → Feb)", () => {
    const endOfMonth: FixedAnnualConfig = {
      type: "fixed_annual",
      month: 2,
      day: 30,
    };
    const ob = makeObligation(endOfMonth);
    // Feb 30 doesn't exist, clamp to Feb 28 (non-leap) or 29 (leap)
    expect(getNextDueDate(ob, null, "2027-01-01")).toBe("2027-02-28");
    expect(getNextDueDate(ob, null, "2028-01-01")).toBe("2028-02-29");
  });

  it("ignores lastCompletionDate (annual dates don't shift)", () => {
    const ob = makeObligation(config);
    expect(getNextDueDate(ob, "2027-03-20", "2027-01-15")).toBe("2027-03-21");
  });
});

// ─── Fixed Rule (RRULE) ─────────────────────────────────────

describe("Fixed Rule (RRULE)", () => {
  it("weekly rule returns next occurrence", () => {
    const config: FixedRuleConfig = {
      type: "fixed_rule",
      rrule: "DTSTART:20270101\nRRULE:FREQ=WEEKLY;BYDAY=SU",
    };
    const ob = makeObligation(config);
    // 2027-01-04 is a Monday; next Sunday is Jan 10
    expect(getNextDueDate(ob, null, "2027-01-04")).toBe("2027-01-10");
  });

  it("returns today if today matches the rule", () => {
    const config: FixedRuleConfig = {
      type: "fixed_rule",
      rrule: "DTSTART:20270101\nRRULE:FREQ=WEEKLY;BYDAY=SU",
    };
    const ob = makeObligation(config);
    // 2027-01-03 is a Sunday
    expect(getNextDueDate(ob, null, "2027-01-03")).toBe("2027-01-03");
  });

  it("monthly rule: first Saturday of odd months", () => {
    const config: FixedRuleConfig = {
      type: "fixed_rule",
      rrule:
        "DTSTART:20270101\nRRULE:FREQ=MONTHLY;BYMONTH=1,3,5,7,9,11;BYDAY=1SA",
    };
    const ob = makeObligation(config);
    // After March 6 2027 (first Sat of March), next is May
    expect(getNextDueDate(ob, null, "2027-03-07")).toBe("2027-05-01");
  });

  it("returns null for a finite rule that has ended", () => {
    const config: FixedRuleConfig = {
      type: "fixed_rule",
      rrule: "DTSTART:20270101\nRRULE:FREQ=DAILY;COUNT=3",
    };
    const ob = makeObligation(config);
    expect(getNextDueDate(ob, null, "2027-01-10")).toBeNull();
  });
});

// ─── Interval from Last Done ────────────────────────────────

describe("Interval from Last Done", () => {
  const config: IntervalConfig = {
    type: "interval",
    intervalDays: 60,
  };

  it("returns null when there is no last completion", () => {
    const ob = makeObligation(config);
    expect(getNextDueDate(ob, null, "2027-01-01")).toBeNull();
  });

  it("computes next date from last completion", () => {
    const ob = makeObligation(config);
    expect(getNextDueDate(ob, "2027-01-15", "2027-02-01")).toBe("2027-03-16");
  });

  it("late completion shifts the schedule forward", () => {
    const ob = makeObligation(config);
    // Was due Jan 15 + 60 = Mar 16, but done late on Apr 1
    expect(getNextDueDate(ob, "2027-04-01", "2027-04-05")).toBe("2027-05-31");
  });

  it("does not generate occurrence without completion", () => {
    const ob = makeObligation(config);
    const occ = generateOccurrence(ob, null, "2027-01-01");
    expect(occ).toBeNull();
  });

  it("generates occurrence with completion", () => {
    const ob = makeObligation(config);
    const occ = generateOccurrence(ob, "2027-01-15", "2027-02-01");
    expect(occ).not.toBeNull();
    expect(occ!.dueDate).toBe("2027-03-16");
  });

  it("handles very short intervals (1 day)", () => {
    const shortConfig: IntervalConfig = {
      type: "interval",
      intervalDays: 1,
    };
    const ob = makeObligation(shortConfig);
    expect(getNextDueDate(ob, "2027-06-15", "2027-06-15")).toBe("2027-06-16");
  });

  it("handles long intervals crossing year boundary", () => {
    const longConfig: IntervalConfig = {
      type: "interval",
      intervalDays: 180,
    };
    const ob = makeObligation(longConfig);
    expect(getNextDueDate(ob, "2027-08-01", "2027-09-01")).toBe("2028-01-28");
  });
});

// ─── Seasonal Window ────────────────────────────────────────

describe("Seasonal Window", () => {
  const config: SeasonalWindowConfig = {
    type: "seasonal_window",
    windowOpenMonth: 1,
    windowOpenDay: 15,
    windowCloseMonth: 3,
    windowCloseDay: 1,
    confirmed: true,
  };

  it("due date is the window close date", () => {
    const ob = makeObligation(config);
    expect(getNextDueDate(ob, null, "2027-01-01")).toBe("2027-03-01");
  });

  it("rolls forward to next year when window has closed", () => {
    const ob = makeObligation(config);
    expect(getNextDueDate(ob, null, "2027-04-01")).toBe("2028-03-01");
  });

  it("returns this year's close if window is currently open", () => {
    const ob = makeObligation(config);
    expect(getNextDueDate(ob, null, "2027-02-15")).toBe("2027-03-01");
  });

  it("generates occurrence with window dates", () => {
    const ob = makeObligation(config);
    const occ = generateOccurrence(ob, null, "2027-01-01");
    expect(occ).not.toBeNull();
    expect(occ!.windowStart).toBe("2027-01-15");
    expect(occ!.windowEnd).toBe("2027-03-01");
    expect(occ!.dueDate).toBe("2027-03-01");
    expect(occ!.confirmed).toBe(true);
  });

  it("rollWindowForward sets confirmed to false", () => {
    const rolled = rollWindowForward(config, 2027);
    expect(rolled.confirmed).toBe(false);
    expect(rolled.windowOpenMonth).toBe(1);
    expect(rolled.windowOpenDay).toBe(15);
  });

  it("unconfirmed window generates unconfirmed occurrence", () => {
    const unconfirmed: SeasonalWindowConfig = {
      ...config,
      confirmed: false,
    };
    const ob = makeObligation(unconfirmed);
    const occ = generateOccurrence(ob, null, "2027-01-01");
    expect(occ!.confirmed).toBe(false);
  });

  it("handles window crossing year boundary (Nov open → Feb close)", () => {
    const crossYearConfig: SeasonalWindowConfig = {
      type: "seasonal_window",
      windowOpenMonth: 11,
      windowOpenDay: 1,
      windowCloseMonth: 2,
      windowCloseDay: 15,
      confirmed: true,
    };
    const ob = makeObligation(crossYearConfig);
    // In January, the close date of Feb 15 this year is still ahead
    expect(getNextDueDate(ob, null, "2027-01-10")).toBe("2027-02-15");
    // After Feb 15, rolls to next year
    expect(getNextDueDate(ob, null, "2027-03-01")).toBe("2028-02-15");
  });

  it("handles leap year in window close (Feb 29)", () => {
    const leapWindow: SeasonalWindowConfig = {
      type: "seasonal_window",
      windowOpenMonth: 1,
      windowOpenDay: 1,
      windowCloseMonth: 2,
      windowCloseDay: 29,
      confirmed: true,
    };
    const ob = makeObligation(leapWindow);
    // 2027 is not a leap year
    expect(getNextDueDate(ob, null, "2027-01-01")).toBe("2027-02-28");
    // 2028 is a leap year
    expect(getNextDueDate(ob, null, "2028-01-01")).toBe("2028-02-29");
  });
});

// ─── One-off ────────────────────────────────────────────────

describe("One-off", () => {
  const config: OneOffConfig = {
    type: "one_off",
    dueDate: "2027-06-15",
  };

  it("returns the fixed due date regardless of today", () => {
    const ob = makeObligation(config);
    expect(getNextDueDate(ob, null, "2027-01-01")).toBe("2027-06-15");
  });

  it("returns the due date even if it has passed", () => {
    const ob = makeObligation(config);
    expect(getNextDueDate(ob, null, "2027-12-01")).toBe("2027-06-15");
  });

  it("ignores lastCompletionDate", () => {
    const ob = makeObligation(config);
    expect(getNextDueDate(ob, "2027-06-14", "2027-01-01")).toBe("2027-06-15");
  });
});

// ─── Occurrence State ───────────────────────────────────────

describe("getOccurrenceState", () => {
  it("upcoming: due date is far in the future", () => {
    expect(getOccurrenceState("2027-06-15", 7, "2027-01-01")).toBe("upcoming");
  });

  it("due: within lead time", () => {
    expect(getOccurrenceState("2027-01-08", 7, "2027-01-01")).toBe("due");
  });

  it("due: exactly on the lead time boundary", () => {
    expect(getOccurrenceState("2027-01-08", 7, "2027-01-01")).toBe("due");
  });

  it("due: today is the due date", () => {
    expect(getOccurrenceState("2027-01-01", 7, "2027-01-01")).toBe("due");
  });

  it("overdue: past the due date", () => {
    expect(getOccurrenceState("2027-01-01", 7, "2027-01-02")).toBe("overdue");
  });

  it("overdue: way past the due date", () => {
    expect(getOccurrenceState("2027-01-01", 7, "2027-03-01")).toBe("overdue");
  });

  it("upcoming with 0 lead time: not due until the exact date", () => {
    expect(getOccurrenceState("2027-01-05", 0, "2027-01-04")).toBe("upcoming");
    expect(getOccurrenceState("2027-01-05", 0, "2027-01-05")).toBe("due");
  });

  it("large lead time: due far in advance", () => {
    expect(getOccurrenceState("2027-06-09", 60, "2027-04-15")).toBe("due");
  });
});

// ─── Snooze ─────────────────────────────────────────────────

describe("Snooze", () => {
  it("snoozeDate adds days to a date", () => {
    expect(snoozeDate("2027-01-15", 1)).toBe("2027-01-16");
    expect(snoozeDate("2027-01-15", 7)).toBe("2027-01-22");
    expect(snoozeDate("2027-01-30", 3)).toBe("2027-02-02");
  });

  it("snooze across month boundary", () => {
    expect(snoozeDate("2027-02-27", 3)).toBe("2027-03-02");
  });

  it("snooze across year boundary", () => {
    expect(snoozeDate("2027-12-30", 5)).toBe("2028-01-04");
  });

  it("getSnoozedState returns snoozed when snooze is active", () => {
    expect(getSnoozedState("2027-01-10", "2027-01-05")).toBe("snoozed");
  });

  it("getSnoozedState returns null when snooze has expired", () => {
    expect(getSnoozedState("2027-01-05", "2027-01-06")).toBeNull();
  });

  it("getSnoozedState returns snoozed on the snooze date itself", () => {
    expect(getSnoozedState("2027-01-05", "2027-01-05")).toBe("snoozed");
  });
});

// ─── Edge cases ─────────────────────────────────────────────

describe("Edge cases", () => {
  it("clampDay handles Feb in non-leap year", () => {
    const d = clampDay(2027, 2, 31);
    expect(dateToString(d)).toBe("2027-02-28");
  });

  it("clampDay handles Feb in leap year", () => {
    const d = clampDay(2028, 2, 31);
    expect(dateToString(d)).toBe("2028-02-29");
  });

  it("clampDay handles Apr 31 → Apr 30", () => {
    const d = clampDay(2027, 4, 31);
    expect(dateToString(d)).toBe("2027-04-30");
  });

  it("clampDay passes through valid dates unchanged", () => {
    const d = clampDay(2027, 6, 15);
    expect(dateToString(d)).toBe("2027-06-15");
  });

  it("fixed annual wrapping from December to next year", () => {
    const dec: FixedAnnualConfig = {
      type: "fixed_annual",
      month: 12,
      day: 25,
    };
    const ob = makeObligation(dec);
    expect(getNextDueDate(ob, null, "2027-12-26")).toBe("2028-12-25");
    expect(getNextDueDate(ob, null, "2027-12-25")).toBe("2027-12-25");
  });

  it("interval with leap year crossing", () => {
    const config: IntervalConfig = {
      type: "interval",
      intervalDays: 60,
    };
    const ob = makeObligation(config);
    // 60 days from Jan 1 2028 crosses Feb 29 (leap year)
    expect(getNextDueDate(ob, "2028-01-01", "2028-01-01")).toBe("2028-03-01");
  });

  it("multiple obligations can be computed independently", () => {
    const ob1 = makeObligation({
      type: "fixed_annual",
      month: 3,
      day: 21,
    });
    const ob2 = makeObligation({
      type: "interval",
      intervalDays: 30,
    });

    const d1 = getNextDueDate(ob1, null, "2027-01-01");
    const d2 = getNextDueDate(ob2, "2027-01-01", "2027-01-01");
    expect(d1).toBe("2027-03-21");
    expect(d2).toBe("2027-01-31");
  });
});
