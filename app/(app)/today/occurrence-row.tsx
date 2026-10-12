"use client";

import { useState, useTransition } from "react";
import {
  markDone,
  snoozeOccurrence,
  skipOccurrence,
} from "@/app/actions/obligations";

interface Props {
  id: string;
  title: string;
  category: string | null;
  dueDate: string;
  state: "overdue" | "due";
  today: string;
}

const categoryColors: Record<string, string> = {
  Family: "bg-pink-100 text-pink-700",
  Kids: "bg-orange-100 text-orange-700",
  Cars: "bg-blue-100 text-blue-700",
  Home: "bg-green-100 text-green-700",
  Rentals: "bg-yellow-100 text-yellow-700",
  Pets: "bg-purple-100 text-purple-700",
  Admin: "bg-gray-100 text-gray-600",
};

export function OccurrenceRow({
  id,
  title,
  category,
  dueDate,
  state,
  today,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showDoneForm, setShowDoneForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const daysUntil = diffDays(dueDate, today);
  const dateLabel = formatDateLabel(dueDate, daysUntil);

  function handleDone(formData: FormData) {
    const notes = formData.get("notes") as string;
    const costStr = formData.get("cost") as string;
    const odometerStr = formData.get("odometer") as string;
    startTransition(async () => {
      await markDone(
        id,
        notes || undefined,
        costStr ? parseFloat(costStr) : undefined,
        odometerStr ? parseInt(odometerStr) : undefined
      );
    });
  }

  function handleSnooze(days: number) {
    startTransition(async () => {
      await snoozeOccurrence(id, days);
    });
  }

  function handleSkip() {
    startTransition(async () => {
      await skipOccurrence(id);
    });
  }

  return (
    <div
      className={`py-3 ${isPending ? "opacity-50" : ""}`}
    >
      <button
        type="button"
        className="flex w-full items-center gap-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
          <div className="mt-0.5 flex items-center gap-2">
            {category && (
              <span
                className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  categoryColors[category] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {category}
              </span>
            )}
            <span
              className={`text-xs ${
                state === "overdue" ? "text-red-500 font-medium" : "text-gray-400"
              }`}
            >
              {dateLabel}
            </span>
          </div>
        </div>
        <svg
          className={`h-4 w-4 text-gray-300 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {expanded && !showDoneForm && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setShowDoneForm(true)}
            disabled={isPending}
            className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white active:bg-green-700"
          >
            Done
          </button>
          <button
            type="button"
            onClick={() => handleSnooze(1)}
            disabled={isPending}
            className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 active:bg-gray-200"
          >
            +1d
          </button>
          <button
            type="button"
            onClick={() => handleSnooze(7)}
            disabled={isPending}
            className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 active:bg-gray-200"
          >
            +1w
          </button>
          <button
            type="button"
            onClick={handleSkip}
            disabled={isPending}
            className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 active:bg-gray-200"
          >
            Skip
          </button>
        </div>
      )}

      {showDoneForm && (
        <form action={handleDone} className="mt-2 space-y-2">
          <input
            name="notes"
            type="text"
            placeholder="Notes (optional)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <input
              name="cost"
              type="number"
              step="0.01"
              placeholder="Cost"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              name="odometer"
              type="number"
              placeholder="Odometer"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white active:bg-green-700"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowDoneForm(false)}
              className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function diffDays(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((da.getTime() - db.getTime()) / 86400000);
}

function formatDateLabel(dueDate: string, daysUntil: number): string {
  if (daysUntil < -1) return `${Math.abs(daysUntil)} days overdue`;
  if (daysUntil === -1) return "1 day overdue";
  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "Tomorrow";
  if (daysUntil <= 7) {
    const d = new Date(dueDate + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long" });
  }
  const d = new Date(dueDate + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
