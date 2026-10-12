"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  getNextDueDate,
  todayLA,
} from "@/lib/recurrence/engine";
import type { RecurrenceConfig } from "@/lib/recurrence/types";
import type { Category } from "@/lib/constants";

interface CreateObligationInput {
  title: string;
  category: Category;
  recurrenceType: RecurrenceConfig["type"];
  recurrenceConfig: Record<string, unknown>;
  leadTimeDays: number;
  priority: "normal" | "milestone";
  notes?: string;
}

export async function createObligation(input: CreateObligationInput) {
  const supabase = await createClient();

  const config = {
    type: input.recurrenceType,
    ...input.recurrenceConfig,
  } as RecurrenceConfig;

  const { data: obligation, error } = await supabase
    .from("obligation")
    .insert({
      title: input.title,
      category: input.category,
      recurrence_type: input.recurrenceType,
      recurrence_config: input.recurrenceConfig,
      lead_time_days: input.leadTimeDays,
      priority: input.priority,
      notes: input.notes || null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const today = todayLA();
  const dueDate = getNextDueDate(
    { id: obligation.id, title: input.title, recurrence: config, leadTimeDays: input.leadTimeDays },
    null,
    today
  );

  if (dueDate) {
    const occurrenceData: Record<string, unknown> = {
      obligation_id: obligation.id,
      due_date: dueDate,
      state: "upcoming",
    };

    if (config.type === "seasonal_window") {
      const year = parseInt(dueDate.split("-")[0]);
      const openMonth = String(config.windowOpenMonth).padStart(2, "0");
      const openDay = String(config.windowOpenDay).padStart(2, "0");
      occurrenceData.window_start = `${year}-${openMonth}-${openDay}`;
      occurrenceData.window_end = dueDate;
    }

    await supabase.from("occurrence").insert(occurrenceData);
  }

  revalidatePath("/today");
  return { id: obligation.id };
}

export async function markDone(
  occurrenceId: string,
  notes?: string,
  cost?: number,
  odometer?: number
) {
  const supabase = await createClient();

  await supabase
    .from("occurrence")
    .update({ state: "done" })
    .eq("id", occurrenceId);

  const completionData: Record<string, unknown> = {
    occurrence_id: occurrenceId,
  };
  if (notes) completionData.notes = notes;
  if (cost != null) completionData.cost = cost;
  if (odometer != null) completionData.odometer = odometer;

  await supabase.from("completion").insert(completionData);

  await generateNextOccurrence(occurrenceId);
  revalidatePath("/today");
}

export async function snoozeOccurrence(
  occurrenceId: string,
  days: number
) {
  const supabase = await createClient();
  const today = todayLA();
  const [y, m, d] = today.split("-").map(Number);
  const snoozedDate = new Date(y, m - 1, d + days);
  const snoozedUntil = `${snoozedDate.getFullYear()}-${String(snoozedDate.getMonth() + 1).padStart(2, "0")}-${String(snoozedDate.getDate()).padStart(2, "0")}`;

  await supabase
    .from("occurrence")
    .update({ state: "snoozed", snoozed_until: snoozedUntil })
    .eq("id", occurrenceId);

  revalidatePath("/today");
}

export async function skipOccurrence(occurrenceId: string) {
  const supabase = await createClient();

  await supabase
    .from("occurrence")
    .update({ state: "skipped" })
    .eq("id", occurrenceId);

  await generateNextOccurrence(occurrenceId);
  revalidatePath("/today");
}

async function generateNextOccurrence(completedOccurrenceId: string) {
  const supabase = await createClient();

  const { data: occurrence } = await supabase
    .from("occurrence")
    .select("obligation_id, due_date")
    .eq("id", completedOccurrenceId)
    .single();

  if (!occurrence) return;

  const { data: obligation } = await supabase
    .from("obligation")
    .select("*")
    .eq("id", occurrence.obligation_id)
    .single();

  if (!obligation || obligation.status !== "active") return;

  const config = {
    type: obligation.recurrence_type,
    ...obligation.recurrence_config,
  } as RecurrenceConfig;

  if (config.type === "one_off") return;

  const today = todayLA();
  const lastCompletion = config.type === "interval" ? occurrence.due_date : null;

  const nextDueDate = getNextDueDate(
    {
      id: obligation.id,
      title: obligation.title,
      recurrence: config,
      leadTimeDays: obligation.lead_time_days,
    },
    lastCompletion,
    today
  );

  if (!nextDueDate) return;

  // For fixed_annual: if the next date equals the just-completed date, push to next year
  if (config.type === "fixed_annual" && nextDueDate === occurrence.due_date) {
    const [y, m, d] = nextDueDate.split("-").map(Number);
    const nextYear = new Date(y + 1, m - 1, d);
    const maxDay = new Date(y + 1, m, 0).getDate();
    const clampedDay = Math.min(d, maxDay);
    const pushed = `${y + 1}-${String(m).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
    await supabase.from("occurrence").insert({
      obligation_id: obligation.id,
      due_date: pushed,
      state: "upcoming",
    });
    return;
  }

  // For fixed_rule: if next date equals just-completed date, get the one after
  if (config.type === "fixed_rule" && nextDueDate === occurrence.due_date) {
    const dayAfter = addOneDayStr(occurrence.due_date);
    const nextNext = getNextDueDate(
      {
        id: obligation.id,
        title: obligation.title,
        recurrence: config,
        leadTimeDays: obligation.lead_time_days,
      },
      null,
      dayAfter
    );
    if (nextNext) {
      await supabase.from("occurrence").insert({
        obligation_id: obligation.id,
        due_date: nextNext,
        state: "upcoming",
      });
    }
    return;
  }

  const occurrenceData: Record<string, unknown> = {
    obligation_id: obligation.id,
    due_date: nextDueDate,
    state: "upcoming",
  };

  if (config.type === "seasonal_window") {
    const year = parseInt(nextDueDate.split("-")[0]);
    const openMonth = String(config.windowOpenMonth).padStart(2, "0");
    const openDay = String(config.windowOpenDay).padStart(2, "0");
    occurrenceData.window_start = `${year}-${openMonth}-${openDay}`;
    occurrenceData.window_end = nextDueDate;
  }

  await supabase.from("occurrence").insert(occurrenceData);
}

function addOneDayStr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(y, m - 1, d + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}
