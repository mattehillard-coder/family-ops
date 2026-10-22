import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOccurrenceState, todayLA } from "@/lib/recurrence/engine";
import { OccurrenceRow } from "./occurrence-row";
import SignOutButton from "@/app/sign-out-button";
import Link from "next/link";

interface OccurrenceWithObligation {
  id: string;
  due_date: string;
  window_start: string | null;
  window_end: string | null;
  state: string;
  snoozed_until: string | null;
  obligation: {
    id: string;
    title: string;
    category: string | null;
    lead_time_days: number;
    priority: string;
  };
}

export default async function TodayPage() {
  await connection();
  const supabase = await createClient();
  const today = todayLA();

  const { data: occurrences } = await supabase
    .from("occurrence")
    .select(
      "id, due_date, window_start, window_end, state, snoozed_until, obligation!inner(id, title, category, lead_time_days, priority)"
    )
    .in("state", ["upcoming", "due", "overdue", "snoozed"])
    .order("due_date", { ascending: true });

  const items: OccurrenceWithObligation[] = (occurrences ?? []).map(
    (o: Record<string, unknown>) => ({
      id: o.id as string,
      due_date: o.due_date as string,
      window_start: o.window_start as string | null,
      window_end: o.window_end as string | null,
      state: o.state as string,
      snoozed_until: o.snoozed_until as string | null,
      obligation: o.obligation as OccurrenceWithObligation["obligation"],
    })
  );

  // Compute live state and filter snoozed items that are still snoozed
  const enriched = items
    .map((item) => {
      if (item.state === "snoozed" && item.snoozed_until) {
        if (item.snoozed_until > today) return { ...item, computedState: "snoozed" as const };
        // Snooze expired, treat as normal
      }
      const state = getOccurrenceState(
        item.due_date,
        item.obligation.lead_time_days,
        today
      );
      return { ...item, computedState: state };
    })
    .filter((item) => item.computedState !== "snoozed");

  const overdue = enriched.filter((i) => i.computedState === "overdue");
  const thisWeek = enriched.filter((i) => {
    if (i.computedState !== "due") return false;
    const days = diffDays(i.due_date, today);
    return days <= 7;
  });
  const next30 = enriched.filter((i) => {
    if (i.computedState !== "due") return false;
    const days = diffDays(i.due_date, today);
    return days > 7 && days <= 30;
  });
  const milestones = enriched.filter((i) => {
    if (i.obligation.priority !== "milestone") return false;
    if (i.computedState === "overdue") return false;
    const days = diffDays(i.due_date, today);
    return days > 0 && days <= 90;
  });

  // Check if onboarding is needed (interval obligations with no occurrences)
  const { count: intervalWithNoOcc } = await supabase
    .from("obligation")
    .select("id", { count: "exact", head: true })
    .eq("recurrence_type", "interval")
    .eq("status", "active");

  const { count: intervalOccCount } = await supabase
    .from("occurrence")
    .select("id", { count: "exact", head: true })
    .in("state", ["upcoming", "due", "overdue", "snoozed", "done"]);

  const hasEntities = (await supabase.from("entity").select("id", { count: "exact", head: true })).count;
  const needsOnboarding =
    hasEntities && hasEntities > 0 && intervalWithNoOcc && intervalWithNoOcc > 0;

  const isEmpty =
    overdue.length === 0 &&
    thisWeek.length === 0 &&
    next30.length === 0 &&
    milestones.length === 0;

  return (
    <div className="mx-auto w-full max-w-lg px-4 pt-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">Today</h1>
        <SignOutButton />
      </div>

      {needsOnboarding && (
        <Link
          href="/onboarding"
          className="mt-4 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3 active:bg-blue-100"
        >
          <div>
            <p className="text-sm font-medium text-blue-900">Finish setup</p>
            <p className="text-xs text-blue-600">Enter last-done dates for interval items</p>
          </div>
          <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      )}

      {isEmpty && (
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-400">No obligations yet.</p>
          <p className="mt-1 text-sm text-gray-400">
            Tap the + button to add one.
          </p>
        </div>
      )}

      {overdue.length > 0 && (
        <Section title="Overdue" color="red">
          {overdue.map((o) => (
            <OccurrenceRow
              key={o.id}
              id={o.id}
              title={o.obligation.title}
              category={o.obligation.category}
              dueDate={o.due_date}
              state="overdue"
              today={today}
            />
          ))}
        </Section>
      )}

      {thisWeek.length > 0 && (
        <Section title="This week" color="amber">
          {thisWeek.map((o) => (
            <OccurrenceRow
              key={o.id}
              id={o.id}
              title={o.obligation.title}
              category={o.obligation.category}
              dueDate={o.due_date}
              state="due"
              today={today}
            />
          ))}
        </Section>
      )}

      {next30.length > 0 && (
        <Section title="Next 30 days" color="blue">
          {next30.map((o) => (
            <OccurrenceRow
              key={o.id}
              id={o.id}
              title={o.obligation.title}
              category={o.obligation.category}
              dueDate={o.due_date}
              state="due"
              today={today}
            />
          ))}
        </Section>
      )}

      {milestones.length > 0 && (
        <Section title="Coming up big" color="purple">
          {milestones.map((o) => (
            <OccurrenceRow
              key={o.id}
              id={o.id}
              title={o.obligation.title}
              category={o.obligation.category}
              dueDate={o.due_date}
              state="due"
              today={today}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  color,
  children,
}: {
  title: string;
  color: "red" | "amber" | "blue" | "purple";
  children: React.ReactNode;
}) {
  const colorMap = {
    red: "text-red-600",
    amber: "text-amber-600",
    blue: "text-blue-600",
    purple: "text-purple-600",
  };

  return (
    <section className="mt-6">
      <h2 className={`text-xs font-semibold uppercase tracking-wide ${colorMap[color]}`}>
        {title}
      </h2>
      <div className="mt-2 divide-y divide-gray-100">{children}</div>
    </section>
  );
}

function diffDays(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((da.getTime() - db.getTime()) / 86400000);
}
