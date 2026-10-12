"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createObligation } from "@/app/actions/obligations";
import { CATEGORIES, type Category } from "@/lib/constants";
import type { RecurrenceConfig } from "@/lib/recurrence/types";

export default function AddPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("Family");
  const [recurrenceType, setRecurrenceType] =
    useState<RecurrenceConfig["type"]>("fixed_annual");
  const [leadTimeDays, setLeadTimeDays] = useState(7);
  const [priority, setPriority] = useState<"normal" | "milestone">("normal");
  const [notes, setNotes] = useState("");

  // Fixed annual fields
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);

  // Interval fields
  const [intervalDays, setIntervalDays] = useState(30);

  // One-off fields
  const [dueDate, setDueDate] = useState("");

  // Seasonal window fields
  const [windowOpenMonth, setWindowOpenMonth] = useState(1);
  const [windowOpenDay, setWindowOpenDay] = useState(1);
  const [windowCloseMonth, setWindowCloseMonth] = useState(3);
  const [windowCloseDay, setWindowCloseDay] = useState(1);

  // Fixed rule fields
  const [rruleFreq, setRruleFreq] = useState("WEEKLY");
  const [rruleDay, setRruleDay] = useState("SU");

  function buildRecurrenceConfig(): Record<string, unknown> {
    switch (recurrenceType) {
      case "fixed_annual":
        return { month, day };
      case "interval":
        return { intervalDays };
      case "one_off":
        return { dueDate };
      case "seasonal_window":
        return {
          windowOpenMonth,
          windowOpenDay,
          windowCloseMonth,
          windowCloseDay,
          confirmed: true,
        };
      case "fixed_rule":
        return {
          rrule: `DTSTART:20270101\nRRULE:FREQ=${rruleFreq};BYDAY=${rruleDay}`,
        };
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      await createObligation({
        title: title.trim(),
        category,
        recurrenceType,
        recurrenceConfig: buildRecurrenceConfig(),
        leadTimeDays,
        priority,
        notes: notes.trim() || undefined,
      });
      router.push("/today");
    });
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Add obligation</h1>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-400"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Title */}
        <Field label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Oil change — Sienna"
            required
            className="input"
          />
        </Field>

        {/* Category */}
        <Field label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="input"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        {/* Recurrence type */}
        <Field label="Recurrence">
          <select
            value={recurrenceType}
            onChange={(e) =>
              setRecurrenceType(e.target.value as RecurrenceConfig["type"])
            }
            className="input"
          >
            <option value="fixed_annual">Annual date</option>
            <option value="fixed_rule">Repeating rule</option>
            <option value="interval">Every N days</option>
            <option value="seasonal_window">Seasonal window</option>
            <option value="one_off">One-off</option>
          </select>
        </Field>

        {/* Recurrence config fields */}
        {recurrenceType === "fixed_annual" && (
          <div className="flex gap-3">
            <Field label="Month" className="flex-1">
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="input"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Day" className="w-20">
              <input
                type="number"
                min={1}
                max={31}
                value={day}
                onChange={(e) => setDay(parseInt(e.target.value))}
                className="input"
              />
            </Field>
          </div>
        )}

        {recurrenceType === "interval" && (
          <Field label="Every how many days?">
            <input
              type="number"
              min={1}
              value={intervalDays}
              onChange={(e) => setIntervalDays(parseInt(e.target.value))}
              className="input"
            />
          </Field>
        )}

        {recurrenceType === "one_off" && (
          <Field label="Due date">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="input"
            />
          </Field>
        )}

        {recurrenceType === "seasonal_window" && (
          <>
            <div className="flex gap-3">
              <Field label="Opens month" className="flex-1">
                <select
                  value={windowOpenMonth}
                  onChange={(e) => setWindowOpenMonth(parseInt(e.target.value))}
                  className="input"
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Day" className="w-20">
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={windowOpenDay}
                  onChange={(e) => setWindowOpenDay(parseInt(e.target.value))}
                  className="input"
                />
              </Field>
            </div>
            <div className="flex gap-3">
              <Field label="Closes month" className="flex-1">
                <select
                  value={windowCloseMonth}
                  onChange={(e) => setWindowCloseMonth(parseInt(e.target.value))}
                  className="input"
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Day" className="w-20">
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={windowCloseDay}
                  onChange={(e) => setWindowCloseDay(parseInt(e.target.value))}
                  className="input"
                />
              </Field>
            </div>
          </>
        )}

        {recurrenceType === "fixed_rule" && (
          <div className="flex gap-3">
            <Field label="Frequency" className="flex-1">
              <select
                value={rruleFreq}
                onChange={(e) => setRruleFreq(e.target.value)}
                className="input"
              >
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </Field>
            <Field label="Day" className="flex-1">
              <select
                value={rruleDay}
                onChange={(e) => setRruleDay(e.target.value)}
                className="input"
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {/* Lead time */}
        <Field label="Lead time (days)">
          <input
            type="number"
            min={0}
            value={leadTimeDays}
            onChange={(e) => setLeadTimeDays(parseInt(e.target.value))}
            className="input"
          />
        </Field>

        {/* Priority */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={priority === "milestone"}
            onChange={(e) =>
              setPriority(e.target.checked ? "milestone" : "normal")
            }
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Milestone (show in "Coming up big")</span>
        </label>

        {/* Notes */}
        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            rows={2}
            className="input"
          />
        </Field>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white active:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Adding..." : "Add obligation"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-gray-500">
        {label}
      </label>
      {children}
    </div>
  );
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DAYS = [
  { value: "MO", label: "Monday" },
  { value: "TU", label: "Tuesday" },
  { value: "WE", label: "Wednesday" },
  { value: "TH", label: "Thursday" },
  { value: "FR", label: "Friday" },
  { value: "SA", label: "Saturday" },
  { value: "SU", label: "Sunday" },
];
