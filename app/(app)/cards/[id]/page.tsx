import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export const instant = false;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CardDetailPage({ params }: Props) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();

  const { data: entity } = await supabase
    .from("entity")
    .select("*")
    .eq("id", id)
    .single();

  if (!entity) notFound();

  // Get linked obligations via the join table
  const { data: links } = await supabase
    .from("obligation_entity")
    .select("obligation_id")
    .eq("entity_id", id);

  const obligationIds = (links ?? []).map(
    (l: { obligation_id: string }) => l.obligation_id
  );

  let obligations: Array<{
    id: string;
    title: string;
    category: string | null;
    recurrence_type: string;
    status: string;
  }> = [];

  if (obligationIds.length > 0) {
    const { data } = await supabase
      .from("obligation")
      .select("id, title, category, recurrence_type, status")
      .in("id", obligationIds)
      .eq("status", "active")
      .order("title");
    obligations = data ?? [];
  }

  // Get upcoming occurrences for these obligations
  let upcomingOccurrences: Array<{
    id: string;
    obligation_id: string;
    due_date: string;
    state: string;
  }> = [];

  if (obligationIds.length > 0) {
    const { data } = await supabase
      .from("occurrence")
      .select("id, obligation_id, due_date, state")
      .in("obligation_id", obligationIds)
      .in("state", ["upcoming", "due", "overdue", "snoozed"])
      .order("due_date", { ascending: true })
      .limit(10);
    upcomingOccurrences = data ?? [];
  }

  // Get recent completions
  let completions: Array<{
    id: string;
    completed_at: string;
    notes: string | null;
    cost: number | null;
    odometer: number | null;
    obligation_id: string | null;
  }> = [];

  if (obligationIds.length > 0) {
    const { data } = await supabase
      .from("completion")
      .select("id, completed_at, notes, cost, odometer, occurrence!inner(obligation_id)")
      .in("occurrence.obligation_id", obligationIds)
      .order("completed_at", { ascending: false })
      .limit(20);
    completions = (data ?? []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      completed_at: c.completed_at as string,
      notes: c.notes as string | null,
      cost: c.cost as number | null,
      odometer: c.odometer as number | null,
      obligation_id: Array.isArray(c.occurrence)
        ? (c.occurrence[0]?.obligation_id as string) ?? null
        : (c.occurrence as { obligation_id: string } | null)?.obligation_id ?? null,
    }));
  }

  // Get children entities
  const { data: childrenRaw } = await supabase
    .from("entity")
    .select("id, name, type, attributes, relationship")
    .eq("parent_id", id)
    .order("name");

  const childEntities = (childrenRaw ?? []) as Array<{
    id: string;
    name: string;
    type: string;
    attributes: Record<string, unknown>;
    relationship: string | null;
  }>;

  const attrs = (entity.attributes ?? {}) as Record<string, unknown>;

  return (
    <div className="mx-auto w-full max-w-lg px-4 pt-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/cards"
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 active:bg-gray-100"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold">{entity.name}</h1>
          <p className="text-xs text-gray-400">
            {[entity.relationship, entity.circle, entity.type]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {entity.deceased && (
        <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
          Deceased — remembrance dates only
        </div>
      )}

      {/* Key facts */}
      <KeyFacts attrs={attrs} entity={entity} />

      {entity.notes && (
        <p className="mt-3 text-xs text-gray-400 italic">{entity.notes}</p>
      )}

      {/* Children (friend's kids, etc.) */}
      {childEntities.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Linked people
          </h2>
          <div className="mt-2 divide-y divide-gray-100">
            {childEntities.map((child) => (
              <Link
                key={child.id}
                href={`/cards/${child.id}`}
                className="flex items-center justify-between py-2 active:bg-gray-50"
              >
                <div>
                  <p className="text-sm text-gray-900">{child.name}</p>
                  {typeof child.attributes?.birthday === "string" && (
                    <p className="text-xs text-gray-400">
                      {formatDate(child.attributes.birthday)}
                    </p>
                  )}
                </div>
                <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {upcomingOccurrences.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Upcoming
          </h2>
          <div className="mt-2 divide-y divide-gray-100">
            {upcomingOccurrences.map((occ) => {
              const obl = obligations.find((o) => o.id === occ.obligation_id);
              return (
                <div key={occ.id} className="flex items-center justify-between py-2">
                  <p className="text-sm text-gray-900">
                    {obl?.title ?? "Unknown"}
                  </p>
                  <p className={`text-xs ${occ.state === "overdue" ? "text-red-600 font-medium" : "text-gray-400"}`}>
                    {formatDate(occ.due_date)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Obligations */}
      {obligations.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Obligations ({obligations.length})
          </h2>
          <div className="mt-2 divide-y divide-gray-100">
            {obligations.map((obl) => (
              <div key={obl.id} className="flex items-center justify-between py-2">
                <p className="text-sm text-gray-900">{obl.title}</p>
                <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                  {formatRecurrenceType(obl.recurrence_type)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Completion history */}
      {completions.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            History
          </h2>
          <div className="mt-2 divide-y divide-gray-100">
            {completions.map((c) => {
              const obl = obligations.find(
                (o) => o.id === c.obligation_id
              );
              return (
                <div key={c.id} className="py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700">{obl?.title ?? "Done"}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(c.completed_at).toLocaleDateString()}
                    </p>
                  </div>
                  {(c.notes || c.cost != null || c.odometer != null) && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      {[
                        c.notes,
                        c.cost != null ? `$${c.cost}` : null,
                        c.odometer != null ? `${c.odometer.toLocaleString()} mi` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function KeyFacts({
  attrs,
  entity,
}: {
  attrs: Record<string, unknown>;
  entity: Record<string, unknown>;
}) {
  const facts: Array<{ label: string; value: string }> = [];

  if (attrs.birthday) facts.push({ label: "Birthday", value: formatDate(attrs.birthday as string) });
  if (attrs.anniversary) facts.push({ label: "Anniversary", value: formatDate(attrs.anniversary as string) });
  if (attrs.grade) facts.push({ label: "School", value: attrs.grade as string });
  if (attrs.activities) facts.push({ label: "Activities", value: (attrs.activities as string[]).join(", ") });
  if (attrs.scoutPack) facts.push({ label: "Scouts", value: `${attrs.scoutPack}${attrs.scoutDen ? ` — ${attrs.scoutDen}` : ""}` });
  if (attrs.dateOfPassing) facts.push({ label: "Passed away", value: formatDate(attrs.dateOfPassing as string) });
  if (attrs.address) facts.push({ label: "Address", value: attrs.address as string });
  if (attrs.sqft) facts.push({ label: "Size", value: `~${attrs.sqft} sq ft` });
  if (attrs.features) facts.push({ label: "Features", value: (attrs.features as string[]).join(", ") });
  if (attrs.leaseEnd) facts.push({ label: "Lease ends", value: formatDate(attrs.leaseEnd as string) });
  if (attrs.extensionEnd) facts.push({ label: "Extension ends", value: formatDate(attrs.extensionEnd as string) });
  if (attrs.make) facts.push({ label: "Vehicle", value: `${attrs.year} ${attrs.make} ${attrs.model}` });
  if (attrs.count) facts.push({ label: "Count", value: String(attrs.count) });
  if (entity.last_contacted) facts.push({ label: "Last contacted", value: formatDate(entity.last_contacted as string) });

  if (facts.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2">
      {facts.map((fact) => (
        <div key={fact.label} className="flex justify-between py-1">
          <span className="text-xs text-gray-500">{fact.label}</span>
          <span className="text-xs font-medium text-gray-700">{fact.value}</span>
        </div>
      ))}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const parts = dateStr.split("-");
  if (parts[0] === "xxxx") {
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    return `${months[month]} ${day}`;
  }
  const date = new Date(dateStr + "T00:00:00");
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatRecurrenceType(type: string): string {
  const map: Record<string, string> = {
    fixed_annual: "Annual",
    fixed_rule: "Recurring",
    interval: "Interval",
    seasonal_window: "Seasonal",
    one_off: "One-off",
  };
  return map[type] || type;
}
