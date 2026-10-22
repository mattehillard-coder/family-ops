import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { SeedButtonClient } from "./seed-button";

export const instant = false;

interface Entity {
  id: string;
  type: string;
  name: string;
  attributes: Record<string, unknown>;
  circle: string | null;
  relationship: string | null;
  deceased: boolean;
  notes: string | null;
}

const TYPE_ORDER = ["person", "vehicle", "property", "pet", "household"];
const TYPE_LABELS: Record<string, string> = {
  person: "People",
  vehicle: "Cars",
  property: "Properties",
  pet: "Pets",
  household: "Household",
};

const CIRCLE_ORDER = ["household", "family", "friend"];
const CIRCLE_LABELS: Record<string, string> = {
  household: "Household",
  family: "Family",
  friend: "Friends",
};

export default async function CardsPage() {
  await connection();
  const supabase = await createClient();

  const { data: entities } = await supabase
    .from("entity")
    .select("id, type, name, attributes, circle, relationship, deceased, notes")
    .order("name", { ascending: true });

  const items: Entity[] = (entities ?? []) as Entity[];

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 pt-6">
        <h1 className="text-xl font-bold">Cards</h1>
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-400">No entities yet.</p>
          <p className="mt-2 text-sm text-gray-400">
            Run the household seed to get started.
          </p>
          <SeedButton />
        </div>
      </div>
    );
  }

  const people = items.filter((e) => e.type === "person");
  const nonPeople = items.filter((e) => e.type !== "person");

  const peopleByCircle = CIRCLE_ORDER.map((circle) => ({
    label: CIRCLE_LABELS[circle],
    items: people.filter((p) => p.circle === circle),
  })).filter((g) => g.items.length > 0);

  const othersByType = TYPE_ORDER.filter((t) => t !== "person")
    .map((type) => ({
      label: TYPE_LABELS[type],
      items: nonPeople.filter((e) => e.type === type),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto w-full max-w-lg px-4 pt-6">
      <h1 className="text-xl font-bold">Cards</h1>

      {peopleByCircle.map((group) => (
        <Section key={group.label} title={group.label}>
          {group.items.map((entity) => (
            <EntityRow key={entity.id} entity={entity} />
          ))}
        </Section>
      ))}

      {othersByType.map((group) => (
        <Section key={group.label} title={group.label}>
          {group.items.map((entity) => (
            <EntityRow key={entity.id} entity={entity} />
          ))}
        </Section>
      ))}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h2>
      <div className="mt-2 divide-y divide-gray-100">{children}</div>
    </section>
  );
}

function EntityRow({ entity }: { entity: Entity }) {
  const birthday = entity.attributes?.birthday as string | undefined;
  const birthdayDisplay = birthday && !birthday.startsWith("xxxx")
    ? formatBirthday(birthday)
    : birthday?.startsWith("xxxx")
      ? formatBirthday(birthday)
      : null;

  const subtitle = [
    entity.relationship,
    birthdayDisplay,
    entity.deceased ? "deceased" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/cards/${entity.id}`}
      className="flex items-center justify-between py-3 active:bg-gray-50"
    >
      <div className="min-w-0">
        <p className={`text-sm font-medium ${entity.deceased ? "text-gray-400" : "text-gray-900"}`}>
          {entity.name}
        </p>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-gray-400">{subtitle}</p>
        )}
      </div>
      <svg
        className="h-4 w-4 shrink-0 text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
      </svg>
    </Link>
  );
}

function formatBirthday(dateStr: string): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const parts = dateStr.split("-");
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  return `${months[month]} ${day}`;
}

function SeedButton() {
  return <SeedButtonClient />;
}
