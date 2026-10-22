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
  children?: EntitySeed[];
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

export async function seedHousehold() {
  const supabase = await createClient();

  const { count } = await supabase
    .from("entity")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) {
    return { error: "Household already seeded. Delete existing data first to re-seed." };
  }

  const entityMap = new Map<string, string>();

  // --- ENTITIES ---

  const entities: EntitySeed[] = [
    // Household members
    {
      type: "person",
      name: "Matt",
      circle: "household",
      relationship: "self",
    },
    {
      type: "person",
      name: "Brittany",
      circle: "household",
      relationship: "wife",
      attributes: { birthday: "1986-02-01", anniversary: "2017-06-09" },
    },
    {
      type: "person",
      name: "Everett",
      circle: "household",
      relationship: "son",
      attributes: {
        birthday: "2019-03-21",
        grade: "2nd grade (2026-27)",
        activities: ["swimming", "basketball", "baseball", "soccer", "golf", "scouts"],
        scoutPack: "Pack 351",
        scoutDen: "Wolf Den",
      },
    },
    {
      type: "person",
      name: "Cash",
      circle: "household",
      relationship: "son",
      attributes: {
        birthday: "2021-01-29",
        grade: "Kindergarten (2026-27)",
        activities: ["swimming", "basketball", "soccer", "golf", "scouts"],
        scoutPack: "Pack 351",
        scoutDen: "Lion Den",
      },
    },
    {
      type: "person",
      name: "Berkeley",
      circle: "household",
      relationship: "daughter",
      attributes: {
        birthday: "2023-03-03",
        grade: "Preschool (2026-27); TK fall 2027",
      },
    },
    // Extended family
    {
      type: "person",
      name: "Mom",
      circle: "family",
      relationship: "mother",
      attributes: { birthday: "xxxx-08-23", reminderType: "gift" },
    },
    {
      type: "person",
      name: "Dad",
      circle: "family",
      relationship: "father",
      deceased: true,
      attributes: { birthday: "xxxx-03-08", dateOfPassing: "2025-11-27" },
    },
    {
      type: "person",
      name: "Londa",
      circle: "family",
      relationship: "stepmother",
      attributes: { birthday: "xxxx-10-22", reminderType: "gift" },
    },
    {
      type: "person",
      name: "Dave Rolfe",
      circle: "family",
      relationship: "father-in-law",
      attributes: { birthday: "xxxx-12-09", reminderType: "gift" },
    },
    {
      type: "person",
      name: "Stacy Rolfe",
      circle: "family",
      relationship: "mother-in-law",
      attributes: { birthday: "xxxx-02-26", reminderType: "gift" },
    },
    {
      type: "person",
      name: "Alli Rolfe",
      circle: "family",
      relationship: "sister-in-law",
      attributes: { birthday: "xxxx-05-15" },
    },
    {
      type: "person",
      name: "Christina Rolfe",
      circle: "family",
      relationship: "sister-in-law",
      attributes: { birthday: "xxxx-07-11" },
    },
    {
      type: "person",
      name: "Laurel Davies",
      circle: "family",
      relationship: "aunt",
      attributes: { birthday: "xxxx-12-10" },
    },
    {
      type: "person",
      name: "Robert Hasson",
      circle: "family",
      relationship: "uncle",
      attributes: { birthday: "xxxx-04-16" },
    },
    {
      type: "person",
      name: "Griff Hillard",
      circle: "family",
      relationship: "uncle",
      deceased: true,
      attributes: { birthday: "xxxx-12-27" },
    },
    {
      type: "person",
      name: "Jack Davies",
      circle: "family",
      relationship: "cousin",
      attributes: { birthday: "xxxx-06-07" },
      children: [
        {
          type: "person",
          name: "Cloe Davies",
          circle: "family",
          relationship: "cousin's child",
          attributes: { birthday: "xxxx-09-04" },
        },
        {
          type: "person",
          name: "Shea Davies",
          circle: "family",
          relationship: "cousin's child",
          attributes: { birthday: "xxxx-09-04" },
        },
      ],
    },
    {
      type: "person",
      name: "Riley Novak",
      circle: "family",
      relationship: "nephew",
      attributes: { birthday: "xxxx-12-31" },
    },
    {
      type: "person",
      name: "Hunter Novak",
      circle: "family",
      relationship: "nephew",
      attributes: { birthday: "xxxx-06-05" },
      notes: "Confirm birthday",
    },
    {
      type: "person",
      name: "Noah Novak",
      circle: "family",
      relationship: "nephew",
      notes: "Birthday date needed",
    },
    // Friends
    {
      type: "person",
      name: "Nate Edelstein",
      circle: "friend",
      attributes: { birthday: "xxxx-04-15" },
      children: [
        {
          type: "person",
          name: "Noa Edelstein",
          circle: "friend",
          relationship: "friend's child",
          attributes: { birthday: "xxxx-02-01" },
        },
      ],
    },
    {
      type: "person",
      name: "Jordan Corbett",
      circle: "friend",
      attributes: { birthday: "xxxx-09-29" },
    },
    {
      type: "person",
      name: "Brian Hubbs",
      circle: "friend",
      attributes: { birthday: "xxxx-12-12" },
    },
    {
      type: "person",
      name: "Evan Fleming",
      circle: "friend",
      notes: "Birthday date needed",
      children: [
        {
          type: "person",
          name: "Lennon Fleming",
          circle: "friend",
          relationship: "friend's child",
          attributes: { birthday: "xxxx-02-07" },
        },
        {
          type: "person",
          name: "Quincy Fleming",
          circle: "friend",
          relationship: "friend's child",
          attributes: { birthday: "xxxx-08-18" },
        },
      ],
    },
    {
      type: "person",
      name: "Devon Wilson",
      circle: "friend",
      attributes: { birthday: "xxxx-08-16" },
      children: [
        {
          type: "person",
          name: "Bennett Wilson",
          circle: "friend",
          relationship: "friend's child",
          attributes: { birthday: "xxxx-02-09" },
        },
        {
          type: "person",
          name: "Landon Wilson",
          circle: "friend",
          relationship: "friend's child",
          attributes: { birthday: "xxxx-07-11" },
        },
      ],
    },
    {
      type: "person",
      name: "Sean O'Ran",
      circle: "friend",
      attributes: { birthday: "xxxx-07-13" },
      children: [
        {
          type: "person",
          name: "Frankie O'Ran",
          circle: "friend",
          relationship: "friend's child",
          attributes: { birthday: "xxxx-02-23" },
        },
      ],
    },
    {
      type: "person",
      name: "Aron Szecsey",
      circle: "friend",
      attributes: { birthday: "xxxx-06-14" },
      children: [
        {
          type: "person",
          name: "Isabelle Szecsey",
          circle: "friend",
          relationship: "friend's child",
          attributes: { birthday: "xxxx-06-26" },
        },
      ],
    },
    {
      type: "person",
      name: "Celine",
      circle: "friend",
      attributes: { birthday: "xxxx-09-28" },
      notes: "Last name needed",
    },
    {
      type: "person",
      name: "Andrew Nesbit",
      circle: "friend",
      attributes: { birthday: "xxxx-07-24" },
      children: [
        {
          type: "person",
          name: "Reese Nesbit",
          circle: "friend",
          relationship: "friend's child",
          attributes: { birthday: "xxxx-07-23" },
        },
        {
          type: "person",
          name: "Maddie Nesbit",
          circle: "friend",
          relationship: "friend's child",
          notes: "Birthday date needed",
        },
        {
          type: "person",
          name: "Finn Nesbit",
          circle: "friend",
          relationship: "friend's child",
          notes: "Birthday date needed",
        },
      ],
    },
    {
      type: "person",
      name: "Gauri Hearty",
      circle: "friend",
      notes: "Birthday date needed",
      children: [
        {
          type: "person",
          name: "Jai Hearty",
          circle: "friend",
          relationship: "friend's child",
          attributes: { birthday: "xxxx-07-29" },
        },
      ],
    },
    {
      type: "person",
      name: "Anna Quant",
      circle: "friend",
      notes: "Birthday date needed",
      children: [
        {
          type: "person",
          name: "Roman Kabrich",
          circle: "friend",
          relationship: "friend's child",
          attributes: { birthday: "xxxx-08-05" },
        },
        {
          type: "person",
          name: "Camilla Kabrich",
          circle: "friend",
          relationship: "friend's child",
          notes: "Birthday date needed",
        },
        {
          type: "person",
          name: "Daniel Kabrich",
          circle: "friend",
          relationship: "friend's child",
          notes: "Birthday date needed",
        },
      ],
    },
    {
      type: "person",
      name: "Rishi Sachdeva",
      circle: "friend",
      attributes: { birthday: "xxxx-08-28" },
      notes: "Birthday may be Aug 28 or 29 — confirm",
    },
    {
      type: "person",
      name: "Nick Sgarlata",
      circle: "friend",
      attributes: { birthday: "xxxx-12-08" },
    },
    // Vehicles
    {
      type: "vehicle",
      name: "2023 Toyota Sienna",
      attributes: { make: "Toyota", model: "Sienna", year: 2023 },
      notes: "Family car",
    },
    {
      type: "vehicle",
      name: "2016 Honda CR-V",
      attributes: { make: "Honda", model: "CR-V", year: 2016 },
      notes: "Second car",
    },
    // Properties
    {
      type: "property",
      name: "Home",
      attributes: {
        address: "Moraga, CA",
        sqft: 2000,
        features: ["hot tub"],
      },
    },
    {
      type: "property",
      name: "Rental 1 — Camino Velasquez",
      attributes: {
        address: "1213 W Camino Velasquez, Green Valley, AZ",
        leaseStart: "2025-05-28",
        leaseEnd: "2026-11-30",
      },
    },
    {
      type: "property",
      name: "Rental 2 — Via Del Jarrito",
      attributes: {
        address: "1501 Via Del Jarrito, Green Valley, AZ",
        originalLeaseStart: "2025-05-22",
        originalLeaseEnd: "2026-02-28",
        extensionStart: "2026-03-01",
        extensionEnd: "2027-05-28",
      },
    },
    // Pets
    {
      type: "pet",
      name: "Cats",
      attributes: { count: 2 },
    },
    // Household
    {
      type: "household",
      name: "Household Supplies",
      notes: "Costco runs and general supplies",
    },
  ];

  async function insertEntity(
    entity: EntitySeed,
    parentId?: string
  ): Promise<void> {
    const { data, error } = await supabase
      .from("entity")
      .insert({
        type: entity.type,
        name: entity.name,
        attributes: entity.attributes || {},
        circle: entity.circle || null,
        relationship: entity.relationship || null,
        parent_id: parentId || null,
        deceased: entity.deceased || false,
        notes: entity.notes || null,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Entity "${entity.name}": ${error.message}`);
    entityMap.set(entity.name, data.id);

    if (entity.children) {
      for (const child of entity.children) {
        await insertEntity(child, data.id);
      }
    }
  }

  for (const entity of entities) {
    await insertEntity(entity);
  }

  // --- OBLIGATIONS ---

  const today = todayLA();

  const obligations: ObligationSeed[] = [
    // Family birthdays — household
    {
      title: "Brittany's birthday",
      category: "Family",
      recurrenceType: "fixed_annual",
      recurrenceConfig: { month: 2, day: 1 },
      leadTimeDays: 21,
      entityNames: ["Brittany"],
    },
    {
      title: "Anniversary",
      category: "Family",
      recurrenceType: "fixed_annual",
      recurrenceConfig: { month: 6, day: 9 },
      leadTimeDays: 30,
      priority: "milestone",
      notes: "10th anniversary in 2027 — extra lead time that year",
      entityNames: ["Brittany"],
    },
    {
      title: "Everett's birthday",
      category: "Family",
      recurrenceType: "fixed_annual",
      recurrenceConfig: { month: 3, day: 21 },
      leadTimeDays: 42,
      entityNames: ["Everett"],
    },
    {
      title: "Cash's birthday",
      category: "Family",
      recurrenceType: "fixed_annual",
      recurrenceConfig: { month: 1, day: 29 },
      leadTimeDays: 42,
      entityNames: ["Cash"],
    },
    {
      title: "Berkeley's birthday",
      category: "Family",
      recurrenceType: "fixed_annual",
      recurrenceConfig: { month: 3, day: 3 },
      leadTimeDays: 42,
      entityNames: ["Berkeley"],
    },
    {
      title: "Valentine's Day",
      category: "Family",
      recurrenceType: "fixed_annual",
      recurrenceConfig: { month: 2, day: 14 },
      leadTimeDays: 21,
      priority: "milestone",
      entityNames: ["Brittany"],
    },
    {
      title: "Mother's Day — Brittany, Mom, Londa, Stacy",
      category: "Family",
      recurrenceType: "fixed_rule",
      recurrenceConfig: { rrule: "DTSTART:20270101\nRRULE:FREQ=YEARLY;BYMONTH=5;BYDAY=2SU" },
      leadTimeDays: 21,
      priority: "milestone",
      entityNames: ["Brittany", "Mom", "Londa", "Stacy Rolfe"],
    },
    {
      title: "Father's Day — Dave",
      category: "Family",
      recurrenceType: "fixed_rule",
      recurrenceConfig: { rrule: "DTSTART:20270101\nRRULE:FREQ=YEARLY;BYMONTH=6;BYDAY=3SU" },
      leadTimeDays: 21,
      priority: "milestone",
      entityNames: ["Dave Rolfe"],
    },

    // Extended family birthdays — gift tier (14-day lead + day-of)
    ...birthdayObligation("Mom", 8, 23, 14, "gift"),
    ...birthdayObligation("Londa", 10, 22, 14, "gift"),
    ...birthdayObligation("Dave Rolfe", 12, 9, 14, "gift"),
    ...birthdayObligation("Stacy Rolfe", 2, 26, 14, "gift"),

    // Extended family — day-of check-in
    ...birthdayObligation("Alli Rolfe", 5, 15, 1),
    ...birthdayObligation("Christina Rolfe", 7, 11, 1),
    ...birthdayObligation("Laurel Davies", 12, 10, 1),
    ...birthdayObligation("Robert Hasson", 4, 16, 1),
    ...birthdayObligation("Jack Davies", 6, 7, 1),
    ...birthdayObligation("Riley Novak", 12, 31, 1),
    ...birthdayObligation("Hunter Novak", 6, 5, 1),

    // Remembrance dates
    {
      title: "Dad — remembrance",
      category: "Family",
      recurrenceType: "fixed_annual",
      recurrenceConfig: { month: 3, day: 8 },
      leadTimeDays: 0,
      notes: "Quiet day-of note",
      entityNames: ["Dad"],
    },
    {
      title: "Anniversary of Dad's passing",
      category: "Family",
      recurrenceType: "fixed_annual",
      recurrenceConfig: { month: 11, day: 27 },
      leadTimeDays: 0,
      notes: "Quiet day-of note",
      entityNames: ["Dad"],
    },
    {
      title: "Griff Hillard — remembrance",
      category: "Family",
      recurrenceType: "fixed_annual",
      recurrenceConfig: { month: 12, day: 27 },
      leadTimeDays: 0,
      notes: "Quiet day-of note",
      entityNames: ["Griff Hillard"],
    },

    // Friends birthdays — day-of
    ...birthdayObligation("Nate Edelstein", 4, 15, 1),
    ...birthdayObligation("Jordan Corbett", 9, 29, 1),
    ...birthdayObligation("Brian Hubbs", 12, 12, 1),
    ...birthdayObligation("Devon Wilson", 8, 16, 1),
    ...birthdayObligation("Sean O'Ran", 7, 13, 1),
    ...birthdayObligation("Aron Szecsey", 6, 14, 1),
    ...birthdayObligation("Celine", 9, 28, 1),
    ...birthdayObligation("Andrew Nesbit", 7, 24, 1),
    ...birthdayObligation("Rishi Sachdeva", 8, 28, 1),
    ...birthdayObligation("Nick Sgarlata", 12, 8, 1),

    // Cars — interval-based (last-done entered during onboarding)
    {
      title: "Oil change — Sienna",
      category: "Cars",
      recurrenceType: "interval",
      recurrenceConfig: { intervalDays: 180 },
      leadTimeDays: 14,
      entityNames: ["2023 Toyota Sienna"],
    },
    {
      title: "Oil change — CR-V",
      category: "Cars",
      recurrenceType: "interval",
      recurrenceConfig: { intervalDays: 180 },
      leadTimeDays: 14,
      entityNames: ["2016 Honda CR-V"],
    },
    {
      title: "Deep clean — Sienna",
      category: "Cars",
      recurrenceType: "interval",
      recurrenceConfig: { intervalDays: 120 },
      leadTimeDays: 7,
      entityNames: ["2023 Toyota Sienna"],
    },
    {
      title: "Deep clean — CR-V",
      category: "Cars",
      recurrenceType: "interval",
      recurrenceConfig: { intervalDays: 120 },
      leadTimeDays: 7,
      entityNames: ["2016 Honda CR-V"],
    },

    // Home
    {
      title: "Trash and recycling to the curb",
      category: "Home",
      recurrenceType: "fixed_rule",
      recurrenceConfig: { rrule: "DTSTART:20270101\nRRULE:FREQ=WEEKLY;BYDAY=WE" },
      leadTimeDays: 0,
      entityNames: ["Home"],
    },
    {
      title: "HVAC air filter",
      category: "Home",
      recurrenceType: "interval",
      recurrenceConfig: { intervalDays: 60 },
      leadTimeDays: 7,
      entityNames: ["Home"],
    },
    {
      title: "Hot tub chemicals",
      category: "Home",
      recurrenceType: "fixed_rule",
      recurrenceConfig: { rrule: "DTSTART:20270101\nRRULE:FREQ=WEEKLY;BYDAY=SU" },
      leadTimeDays: 0,
      entityNames: ["Home"],
    },

    // Rentals — lease tracking
    {
      title: "Lease end — Camino Velasquez",
      category: "Rentals",
      recurrenceType: "one_off",
      recurrenceConfig: { dueDate: "2026-11-30" },
      leadTimeDays: 90,
      entityNames: ["Rental 1 — Camino Velasquez"],
    },
    {
      title: "Lease end — Via Del Jarrito",
      category: "Rentals",
      recurrenceType: "one_off",
      recurrenceConfig: { dueDate: "2027-05-28" },
      leadTimeDays: 90,
      entityNames: ["Rental 2 — Via Del Jarrito"],
    },

    // Pets
    {
      title: "Cat litter change",
      category: "Pets",
      recurrenceType: "fixed_rule",
      recurrenceConfig: { rrule: "DTSTART:20270101\nRRULE:FREQ=WEEKLY;BYDAY=WE" },
      leadTimeDays: 0,
      entityNames: ["Cats"],
    },
    {
      title: "Cat food and litter purchase",
      category: "Pets",
      recurrenceType: "interval",
      recurrenceConfig: { intervalDays: 60 },
      leadTimeDays: 5,
      entityNames: ["Cats"],
    },
    {
      title: "Costco run",
      category: "Pets",
      recurrenceType: "interval",
      recurrenceConfig: { intervalDays: 60 },
      leadTimeDays: 5,
      entityNames: ["Household Supplies"],
    },
  ];

  for (const obl of obligations) {
    const config = {
      type: obl.recurrenceType,
      ...obl.recurrenceConfig,
    } as RecurrenceConfig;

    const { data: oblData, error: oblError } = await supabase
      .from("obligation")
      .insert({
        title: obl.title,
        category: obl.category,
        recurrence_type: obl.recurrenceType,
        recurrence_config: obl.recurrenceConfig,
        lead_time_days: obl.leadTimeDays,
        priority: obl.priority || "normal",
        notes: obl.notes || null,
        source: "manual",
      })
      .select("id")
      .single();

    if (oblError) throw new Error(`Obligation "${obl.title}": ${oblError.message}`);

    // Link to entities
    for (const entityName of obl.entityNames) {
      const entityId = entityMap.get(entityName);
      if (entityId) {
        await supabase.from("obligation_entity").insert({
          obligation_id: oblData.id,
          entity_id: entityId,
        });
      }
    }

    // Generate first occurrence (skip interval types — those need a last-done date from onboarding)
    if (config.type === "interval") continue;

    const dueDate = getNextDueDate(
      { id: oblData.id, title: obl.title, recurrence: config, leadTimeDays: obl.leadTimeDays },
      null,
      today
    );

    if (dueDate) {
      const occurrenceData: Record<string, unknown> = {
        obligation_id: oblData.id,
        due_date: dueDate,
        state: "upcoming",
      };

      if (config.type === "seasonal_window") {
        const year = parseInt(dueDate.split("-")[0]);
        const openMonth = String(
          (config as { windowOpenMonth: number }).windowOpenMonth
        ).padStart(2, "0");
        const openDay = String(
          (config as { windowOpenDay: number }).windowOpenDay
        ).padStart(2, "0");
        occurrenceData.window_start = `${year}-${openMonth}-${openDay}`;
        occurrenceData.window_end = dueDate;
      }

      await supabase.from("occurrence").insert(occurrenceData);
    }
  }

  revalidatePath("/today");
  revalidatePath("/cards");
  return { success: true, entityCount: entityMap.size, obligationCount: obligations.length };
}

function birthdayObligation(
  name: string,
  month: number,
  day: number,
  leadTimeDays: number,
  tier?: "gift"
): ObligationSeed[] {
  const title =
    tier === "gift"
      ? `${name}'s birthday — card/gift`
      : `${name}'s birthday — check in`;

  return [
    {
      title,
      category: "Family",
      recurrenceType: "fixed_annual",
      recurrenceConfig: { month, day },
      leadTimeDays,
      entityNames: [name],
    },
  ];
}
