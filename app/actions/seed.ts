"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getNextDueDate, todayLA } from "@/lib/recurrence/engine";
import type { RecurrenceConfig } from "@/lib/recurrence/types";

interface EntitySeed {
  type: "person" | "vehicle" | "property" | "pet" | "household";
  name: string;
  attributes?: Record<string, unknown>;
  circle?: "household" | "family" | "friend";
  relationship?: string;
  deceased?: boolean;
  notes?: string;
  childrenNames?: string[];
}

interface ObligationSeed {
  title: string;
  category: string;
  recurrenceType: RecurrenceConfig["type"];
  recurrenceConfig: Record<string, unknown>;
  leadTimeDays: number;
  priority?: "normal" | "milestone";
  notes?: string;
  entityNames: string[];
}

export async function clearHousehold() {
  const supabase = await createClient();
  // Delete in order respecting foreign keys
  await supabase.from("completion").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("occurrence").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("obligation_entity").delete().neq("obligation_id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("obligation").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("entity").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  revalidatePath("/today");
  revalidatePath("/cards");
}

export async function seedHousehold() {
  const supabase = await createClient();

  const { count } = await supabase
    .from("entity")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) {
    return { error: "Household already seeded. Delete existing data first to re-seed." };
  }

  try {
    return await doSeed(supabase);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown seed error" };
  }
}

async function doSeed(supabase: Awaited<ReturnType<typeof createClient>>) {

  // --- ENTITIES (flat list, children tracked by parentName) ---

  const parentEntities: Array<{
    type: string; name: string; attributes: Record<string, unknown>;
    circle: string | null; relationship: string | null;
    deceased: boolean; notes: string | null;
  }> = [];

  const childEntities: Array<{
    type: string; name: string; attributes: Record<string, unknown>;
    circle: string | null; relationship: string | null;
    deceased: boolean; notes: string | null;
    parentName: string;
  }> = [];

  function addEntity(e: EntitySeed) {
    parentEntities.push({
      type: e.type,
      name: e.name,
      attributes: e.attributes || {},
      circle: e.circle || null,
      relationship: e.relationship || null,
      deceased: e.deceased || false,
      notes: e.notes || null,
    });
  }

  function addChild(e: EntitySeed, parentName: string) {
    childEntities.push({
      type: e.type,
      name: e.name,
      attributes: e.attributes || {},
      circle: e.circle || null,
      relationship: e.relationship || null,
      deceased: e.deceased || false,
      notes: e.notes || null,
      parentName,
    });
  }

  // Household
  addEntity({ type: "person", name: "Matt", circle: "household", relationship: "self" });
  addEntity({ type: "person", name: "Brittany", circle: "household", relationship: "wife", attributes: { birthday: "1986-02-01", anniversary: "2017-06-09" } });
  addEntity({ type: "person", name: "Everett", circle: "household", relationship: "son", attributes: { birthday: "2019-03-21", grade: "2nd grade (2026-27)", activities: ["swimming", "basketball", "baseball", "soccer", "golf", "scouts"], scoutPack: "Pack 351", scoutDen: "Wolf Den" } });
  addEntity({ type: "person", name: "Cash", circle: "household", relationship: "son", attributes: { birthday: "2021-01-29", grade: "Kindergarten (2026-27)", activities: ["swimming", "basketball", "soccer", "golf", "scouts"], scoutPack: "Pack 351", scoutDen: "Lion Den" } });
  addEntity({ type: "person", name: "Berkeley", circle: "household", relationship: "daughter", attributes: { birthday: "2023-03-03", grade: "Preschool (2026-27); TK fall 2027" } });

  // Extended family
  addEntity({ type: "person", name: "Mom", circle: "family", relationship: "mother", attributes: { birthday: "xxxx-08-23", reminderType: "gift" } });
  addEntity({ type: "person", name: "Dad", circle: "family", relationship: "father", deceased: true, attributes: { birthday: "xxxx-03-08", dateOfPassing: "2025-11-27" } });
  addEntity({ type: "person", name: "Londa", circle: "family", relationship: "stepmother", attributes: { birthday: "xxxx-10-22", reminderType: "gift" } });
  addEntity({ type: "person", name: "Dave Rolfe", circle: "family", relationship: "father-in-law", attributes: { birthday: "xxxx-12-09", reminderType: "gift" } });
  addEntity({ type: "person", name: "Stacy Rolfe", circle: "family", relationship: "mother-in-law", attributes: { birthday: "xxxx-02-26", reminderType: "gift" } });
  addEntity({ type: "person", name: "Alli Rolfe", circle: "family", relationship: "sister-in-law", attributes: { birthday: "xxxx-05-15" } });
  addEntity({ type: "person", name: "Christina Rolfe", circle: "family", relationship: "sister-in-law", attributes: { birthday: "xxxx-07-11" } });
  addEntity({ type: "person", name: "Laurel Davies", circle: "family", relationship: "aunt", attributes: { birthday: "xxxx-12-10" } });
  addEntity({ type: "person", name: "Robert Hasson", circle: "family", relationship: "uncle", attributes: { birthday: "xxxx-04-16" } });
  addEntity({ type: "person", name: "Griff Hillard", circle: "family", relationship: "uncle", deceased: true, attributes: { birthday: "xxxx-12-27" } });
  addEntity({ type: "person", name: "Jack Davies", circle: "family", relationship: "cousin", attributes: { birthday: "xxxx-06-07" } });
  addChild({ type: "person", name: "Cloe Davies", circle: "family", relationship: "cousin's child", attributes: { birthday: "xxxx-09-04" } }, "Jack Davies");
  addChild({ type: "person", name: "Shea Davies", circle: "family", relationship: "cousin's child", attributes: { birthday: "xxxx-09-04" } }, "Jack Davies");
  addEntity({ type: "person", name: "Riley Novak", circle: "family", relationship: "nephew", attributes: { birthday: "xxxx-12-31" } });
  addEntity({ type: "person", name: "Hunter Novak", circle: "family", relationship: "nephew", attributes: { birthday: "xxxx-06-05" }, notes: "Confirm birthday" });
  addEntity({ type: "person", name: "Noah Novak", circle: "family", relationship: "nephew", notes: "Birthday date needed" });

  // Friends
  addEntity({ type: "person", name: "Nate Edelstein", circle: "friend", attributes: { birthday: "xxxx-04-15" } });
  addChild({ type: "person", name: "Noa Edelstein", circle: "friend", relationship: "friend's child", attributes: { birthday: "xxxx-02-01" } }, "Nate Edelstein");
  addEntity({ type: "person", name: "Jordan Corbett", circle: "friend", attributes: { birthday: "xxxx-09-29" } });
  addEntity({ type: "person", name: "Brian Hubbs", circle: "friend", attributes: { birthday: "xxxx-12-12" } });
  addEntity({ type: "person", name: "Evan Fleming", circle: "friend", notes: "Birthday date needed" });
  addChild({ type: "person", name: "Lennon Fleming", circle: "friend", relationship: "friend's child", attributes: { birthday: "xxxx-02-07" } }, "Evan Fleming");
  addChild({ type: "person", name: "Quincy Fleming", circle: "friend", relationship: "friend's child", attributes: { birthday: "xxxx-08-18" } }, "Evan Fleming");
  addEntity({ type: "person", name: "Devon Wilson", circle: "friend", attributes: { birthday: "xxxx-08-16" } });
  addChild({ type: "person", name: "Bennett Wilson", circle: "friend", relationship: "friend's child", attributes: { birthday: "xxxx-02-09" } }, "Devon Wilson");
  addChild({ type: "person", name: "Landon Wilson", circle: "friend", relationship: "friend's child", attributes: { birthday: "xxxx-07-11" } }, "Devon Wilson");
  addEntity({ type: "person", name: "Sean O'Ran", circle: "friend", attributes: { birthday: "xxxx-07-13" } });
  addChild({ type: "person", name: "Frankie O'Ran", circle: "friend", relationship: "friend's child", attributes: { birthday: "xxxx-02-23" } }, "Sean O'Ran");
  addEntity({ type: "person", name: "Aron Szecsey", circle: "friend", attributes: { birthday: "xxxx-06-14" } });
  addChild({ type: "person", name: "Isabelle Szecsey", circle: "friend", relationship: "friend's child", attributes: { birthday: "xxxx-06-26" } }, "Aron Szecsey");
  addEntity({ type: "person", name: "Celine", circle: "friend", attributes: { birthday: "xxxx-09-28" }, notes: "Last name needed" });
  addEntity({ type: "person", name: "Andrew Nesbit", circle: "friend", attributes: { birthday: "xxxx-07-24" } });
  addChild({ type: "person", name: "Reese Nesbit", circle: "friend", relationship: "friend's child", attributes: { birthday: "xxxx-07-23" } }, "Andrew Nesbit");
  addChild({ type: "person", name: "Maddie Nesbit", circle: "friend", relationship: "friend's child" }, "Andrew Nesbit");
  addChild({ type: "person", name: "Finn Nesbit", circle: "friend", relationship: "friend's child" }, "Andrew Nesbit");
  addEntity({ type: "person", name: "Gauri Hearty", circle: "friend", notes: "Birthday date needed" });
  addChild({ type: "person", name: "Jai Hearty", circle: "friend", relationship: "friend's child", attributes: { birthday: "xxxx-07-29" } }, "Gauri Hearty");
  addEntity({ type: "person", name: "Anna Quant", circle: "friend", notes: "Birthday date needed" });
  addChild({ type: "person", name: "Roman Kabrich", circle: "friend", relationship: "friend's child", attributes: { birthday: "xxxx-08-05" } }, "Anna Quant");
  addChild({ type: "person", name: "Camilla Kabrich", circle: "friend", relationship: "friend's child" }, "Anna Quant");
  addChild({ type: "person", name: "Daniel Kabrich", circle: "friend", relationship: "friend's child" }, "Anna Quant");
  addEntity({ type: "person", name: "Rishi Sachdeva", circle: "friend", attributes: { birthday: "xxxx-08-28" }, notes: "Birthday may be Aug 28 or 29 — confirm" });
  addEntity({ type: "person", name: "Nick Sgarlata", circle: "friend", attributes: { birthday: "xxxx-12-08" } });

  // Non-people
  addEntity({ type: "vehicle", name: "2023 Toyota Sienna", attributes: { make: "Toyota", model: "Sienna", year: 2023 }, notes: "Family car" });
  addEntity({ type: "vehicle", name: "2016 Honda CR-V", attributes: { make: "Honda", model: "CR-V", year: 2016 }, notes: "Second car" });
  addEntity({ type: "property", name: "Home", attributes: { address: "Moraga, CA", sqft: 2000, features: ["hot tub"] } });
  addEntity({ type: "property", name: "Rental 1 — Camino Velasquez", attributes: { address: "1213 W Camino Velasquez, Green Valley, AZ", leaseStart: "2025-05-28", leaseEnd: "2026-11-30" } });
  addEntity({ type: "property", name: "Rental 2 — Via Del Jarrito", attributes: { address: "1501 Via Del Jarrito, Green Valley, AZ", originalLeaseStart: "2025-05-22", originalLeaseEnd: "2026-02-28", extensionStart: "2026-03-01", extensionEnd: "2027-05-28" } });
  addEntity({ type: "pet", name: "Cats", attributes: { count: 2 } });
  addEntity({ type: "household", name: "Household Supplies", notes: "Costco runs and general supplies" });

  // BATCH INSERT: all parent entities at once
  const entityMap = new Map<string, string>();

  const { data: parentData, error: parentError } = await supabase
    .from("entity")
    .insert(parentEntities.map((e) => ({
      type: e.type,
      name: e.name,
      attributes: e.attributes,
      circle: e.circle,
      relationship: e.relationship,
      deceased: e.deceased,
      notes: e.notes,
      parent_id: null,
    })))
    .select("id, name");

  if (parentError) throw new Error(`Parent entities: ${parentError.message}`);
  for (const row of parentData ?? []) {
    entityMap.set(row.name, row.id);
  }

  // BATCH INSERT: all child entities at once
  if (childEntities.length > 0) {
    const { data: childData, error: childError } = await supabase
      .from("entity")
      .insert(childEntities.map((e) => ({
        type: e.type,
        name: e.name,
        attributes: e.attributes,
        circle: e.circle,
        relationship: e.relationship,
        deceased: e.deceased,
        notes: e.notes,
        parent_id: entityMap.get(e.parentName) || null,
      })))
      .select("id, name");

    if (childError) throw new Error(`Child entities: ${childError.message}`);
    for (const row of childData ?? []) {
      entityMap.set(row.name, row.id);
    }
  }

  // --- OBLIGATIONS ---

  const today = todayLA();

  const obligations: ObligationSeed[] = [
    { title: "Brittany's birthday", category: "Family", recurrenceType: "fixed_annual", recurrenceConfig: { month: 2, day: 1 }, leadTimeDays: 21, entityNames: ["Brittany"] },
    { title: "Anniversary", category: "Family", recurrenceType: "fixed_annual", recurrenceConfig: { month: 6, day: 9 }, leadTimeDays: 30, priority: "milestone", notes: "10th anniversary in 2027 — extra lead time that year", entityNames: ["Brittany"] },
    { title: "Everett's birthday", category: "Family", recurrenceType: "fixed_annual", recurrenceConfig: { month: 3, day: 21 }, leadTimeDays: 42, entityNames: ["Everett"] },
    { title: "Cash's birthday", category: "Family", recurrenceType: "fixed_annual", recurrenceConfig: { month: 1, day: 29 }, leadTimeDays: 42, entityNames: ["Cash"] },
    { title: "Berkeley's birthday", category: "Family", recurrenceType: "fixed_annual", recurrenceConfig: { month: 3, day: 3 }, leadTimeDays: 42, entityNames: ["Berkeley"] },
    { title: "Valentine's Day", category: "Family", recurrenceType: "fixed_annual", recurrenceConfig: { month: 2, day: 14 }, leadTimeDays: 21, priority: "milestone", entityNames: ["Brittany"] },
    { title: "Mother's Day", category: "Family", recurrenceType: "fixed_rule", recurrenceConfig: { rrule: "DTSTART:20270101\nRRULE:FREQ=YEARLY;BYMONTH=5;BYDAY=2SU" }, leadTimeDays: 21, priority: "milestone", entityNames: ["Brittany", "Mom", "Londa", "Stacy Rolfe"] },
    { title: "Father's Day", category: "Family", recurrenceType: "fixed_rule", recurrenceConfig: { rrule: "DTSTART:20270101\nRRULE:FREQ=YEARLY;BYMONTH=6;BYDAY=3SU" }, leadTimeDays: 21, priority: "milestone", entityNames: ["Dave Rolfe"] },

    // Extended family — gift tier
    ...bday("Mom", 8, 23, 14, "gift"), ...bday("Londa", 10, 22, 14, "gift"),
    ...bday("Dave Rolfe", 12, 9, 14, "gift"), ...bday("Stacy Rolfe", 2, 26, 14, "gift"),

    // Extended family — day-of
    ...bday("Alli Rolfe", 5, 15, 1), ...bday("Christina Rolfe", 7, 11, 1),
    ...bday("Laurel Davies", 12, 10, 1), ...bday("Robert Hasson", 4, 16, 1),
    ...bday("Jack Davies", 6, 7, 1), ...bday("Riley Novak", 12, 31, 1),
    ...bday("Hunter Novak", 6, 5, 1),

    // Remembrance
    { title: "Dad — remembrance", category: "Family", recurrenceType: "fixed_annual", recurrenceConfig: { month: 3, day: 8 }, leadTimeDays: 0, notes: "Quiet day-of note", entityNames: ["Dad"] },
    { title: "Anniversary of Dad's passing", category: "Family", recurrenceType: "fixed_annual", recurrenceConfig: { month: 11, day: 27 }, leadTimeDays: 0, notes: "Quiet day-of note", entityNames: ["Dad"] },
    { title: "Griff Hillard — remembrance", category: "Family", recurrenceType: "fixed_annual", recurrenceConfig: { month: 12, day: 27 }, leadTimeDays: 0, notes: "Quiet day-of note", entityNames: ["Griff Hillard"] },

    // Friends — day-of
    ...bday("Nate Edelstein", 4, 15, 1), ...bday("Jordan Corbett", 9, 29, 1),
    ...bday("Brian Hubbs", 12, 12, 1), ...bday("Devon Wilson", 8, 16, 1),
    ...bday("Sean O'Ran", 7, 13, 1), ...bday("Aron Szecsey", 6, 14, 1),
    ...bday("Celine", 9, 28, 1), ...bday("Andrew Nesbit", 7, 24, 1),
    ...bday("Rishi Sachdeva", 8, 28, 1), ...bday("Nick Sgarlata", 12, 8, 1),

    // Cars
    { title: "Oil change — Sienna", category: "Cars", recurrenceType: "interval", recurrenceConfig: { intervalDays: 180 }, leadTimeDays: 14, entityNames: ["2023 Toyota Sienna"] },
    { title: "Oil change — CR-V", category: "Cars", recurrenceType: "interval", recurrenceConfig: { intervalDays: 180 }, leadTimeDays: 14, entityNames: ["2016 Honda CR-V"] },
    { title: "Deep clean — Sienna", category: "Cars", recurrenceType: "interval", recurrenceConfig: { intervalDays: 120 }, leadTimeDays: 7, entityNames: ["2023 Toyota Sienna"] },
    { title: "Deep clean — CR-V", category: "Cars", recurrenceType: "interval", recurrenceConfig: { intervalDays: 120 }, leadTimeDays: 7, entityNames: ["2016 Honda CR-V"] },

    // Home
    { title: "Trash and recycling to the curb", category: "Home", recurrenceType: "fixed_rule", recurrenceConfig: { rrule: "DTSTART:20270101\nRRULE:FREQ=WEEKLY;BYDAY=WE" }, leadTimeDays: 0, entityNames: ["Home"] },
    { title: "HVAC air filter", category: "Home", recurrenceType: "interval", recurrenceConfig: { intervalDays: 60 }, leadTimeDays: 7, entityNames: ["Home"] },
    { title: "Hot tub chemicals", category: "Home", recurrenceType: "fixed_rule", recurrenceConfig: { rrule: "DTSTART:20270101\nRRULE:FREQ=WEEKLY;BYDAY=SU" }, leadTimeDays: 0, entityNames: ["Home"] },

    // Rentals
    { title: "Lease end — Camino Velasquez", category: "Rentals", recurrenceType: "one_off", recurrenceConfig: { dueDate: "2026-11-30" }, leadTimeDays: 90, entityNames: ["Rental 1 — Camino Velasquez"] },
    { title: "Lease end — Via Del Jarrito", category: "Rentals", recurrenceType: "one_off", recurrenceConfig: { dueDate: "2027-05-28" }, leadTimeDays: 90, entityNames: ["Rental 2 — Via Del Jarrito"] },

    // Pets & supplies
    { title: "Cat litter change", category: "Pets", recurrenceType: "fixed_rule", recurrenceConfig: { rrule: "DTSTART:20270101\nRRULE:FREQ=WEEKLY;BYDAY=WE" }, leadTimeDays: 0, entityNames: ["Cats"] },
    { title: "Cat food and litter purchase", category: "Pets", recurrenceType: "interval", recurrenceConfig: { intervalDays: 60 }, leadTimeDays: 5, entityNames: ["Cats"] },
    { title: "Costco run", category: "Pets", recurrenceType: "interval", recurrenceConfig: { intervalDays: 60 }, leadTimeDays: 5, entityNames: ["Household Supplies"] },
  ];

  // BATCH INSERT: all obligations at once
  const { data: oblData, error: oblError } = await supabase
    .from("obligation")
    .insert(obligations.map((o) => ({
      title: o.title,
      category: o.category,
      recurrence_type: o.recurrenceType,
      recurrence_config: o.recurrenceConfig,
      lead_time_days: o.leadTimeDays,
      priority: o.priority || "normal",
      notes: o.notes || null,
      source: "manual",
    })))
    .select("id, title");

  if (oblError) throw new Error(`Obligations: ${oblError.message}`);

  const oblMap = new Map<string, string>();
  for (const row of oblData ?? []) {
    oblMap.set(row.title, row.id);
  }

  // BATCH INSERT: all obligation_entity links at once
  const links: Array<{ obligation_id: string; entity_id: string }> = [];
  for (const obl of obligations) {
    const oblId = oblMap.get(obl.title);
    if (!oblId) continue;
    for (const entityName of obl.entityNames) {
      const entityId = entityMap.get(entityName);
      if (entityId) {
        links.push({ obligation_id: oblId, entity_id: entityId });
      }
    }
  }
  if (links.length > 0) {
    const { error: linkError } = await supabase
      .from("obligation_entity")
      .insert(links);
    if (linkError) throw new Error(`Links: ${linkError.message}`);
  }

  // BATCH INSERT: all first occurrences at once
  const occurrences: Array<Record<string, unknown>> = [];
  for (const obl of obligations) {
    const oblId = oblMap.get(obl.title);
    if (!oblId) continue;

    const config = { type: obl.recurrenceType, ...obl.recurrenceConfig } as RecurrenceConfig;
    if (config.type === "interval") continue;

    const dueDate = getNextDueDate(
      { id: oblId, title: obl.title, recurrence: config, leadTimeDays: obl.leadTimeDays },
      null,
      today
    );

    if (dueDate) {
      const occ: Record<string, unknown> = {
        obligation_id: oblId,
        due_date: dueDate,
        state: "upcoming",
      };
      if (config.type === "seasonal_window") {
        const year = parseInt(dueDate.split("-")[0]);
        occ.window_start = `${year}-${String((config as { windowOpenMonth: number }).windowOpenMonth).padStart(2, "0")}-${String((config as { windowOpenDay: number }).windowOpenDay).padStart(2, "0")}`;
        occ.window_end = dueDate;
      }
      occurrences.push(occ);
    }
  }

  if (occurrences.length > 0) {
    const { error: occError } = await supabase
      .from("occurrence")
      .insert(occurrences);
    if (occError) throw new Error(`Occurrences: ${occError.message}`);
  }

  revalidatePath("/today");
  revalidatePath("/cards");
  return { success: true, entityCount: entityMap.size, obligationCount: obligations.length };
}

function bday(name: string, month: number, day: number, lead: number, tier?: "gift"): ObligationSeed[] {
  return [{
    title: tier === "gift" ? `${name}'s birthday — card/gift` : `${name}'s birthday — check in`,
    category: "Family",
    recurrenceType: "fixed_annual",
    recurrenceConfig: { month, day },
    leadTimeDays: lead,
    entityNames: [name],
  }];
}
