"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getNextDueDate, todayLA } from "@/lib/recurrence/engine";
import type { RecurrenceConfig } from "@/lib/recurrence/types";

interface OnboardingItem {
  obligationId: string;
  title: string;
  category: string;
  type: "last_done" | "lease_end";
  currentValue?: string;
}

export async function getOnboardingItems(): Promise<OnboardingItem[]> {
  const supabase = await createClient();

  const { data: obligations } = await supabase
    .from("obligation")
    .select("id, title, category, recurrence_type, recurrence_config, status")
    .eq("status", "active")
    .in("recurrence_type", ["interval", "one_off"])
    .order("category")
    .order("title");

  if (!obligations) return [];

  const items: OnboardingItem[] = [];

  for (const obl of obligations) {
    if (obl.recurrence_type === "interval") {
      items.push({
        obligationId: obl.id,
        title: obl.title,
        category: obl.category || "Other",
        type: "last_done",
      });
    }
  }

  return items;
}

export async function submitOnboarding(
  values: Record<string, string>
) {
  const supabase = await createClient();
  const today = todayLA();

  for (const [obligationId, dateStr] of Object.entries(values)) {
    if (!dateStr) continue;

    const { data: obligation } = await supabase
      .from("obligation")
      .select("*")
      .eq("id", obligationId)
      .single();

    if (!obligation) continue;

    const config = {
      type: obligation.recurrence_type,
      ...obligation.recurrence_config,
    } as RecurrenceConfig;

    if (config.type === "interval") {
      // Create a synthetic completion to record the last-done date, then generate next occurrence
      const { data: existingOcc } = await supabase
        .from("occurrence")
        .select("id")
        .eq("obligation_id", obligationId)
        .in("state", ["upcoming", "due", "overdue", "snoozed"])
        .limit(1);

      // Delete any existing upcoming occurrences for this obligation
      if (existingOcc && existingOcc.length > 0) {
        for (const occ of existingOcc) {
          await supabase.from("occurrence").delete().eq("id", occ.id);
        }
      }

      // Compute next due from the provided last-done date
      const nextDueDate = getNextDueDate(
        {
          id: obligation.id,
          title: obligation.title,
          recurrence: config,
          leadTimeDays: obligation.lead_time_days,
        },
        dateStr,
        today
      );

      if (nextDueDate) {
        await supabase.from("occurrence").insert({
          obligation_id: obligationId,
          due_date: nextDueDate,
          state: "upcoming",
        });
      }
    }
  }

  revalidatePath("/today");
  revalidatePath("/cards");
}
