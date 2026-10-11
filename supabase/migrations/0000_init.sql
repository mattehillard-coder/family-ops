-- Family Ops — initial schema (milestone 0)
-- Apply via the Supabase dashboard SQL editor.

-- ============================================================
-- ENTITIES
-- ============================================================

create table public.entity (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users default auth.uid(),
  type        text not null check (type in ('person','vehicle','property','pet','household')),
  name        text not null,
  attributes  jsonb not null default '{}',
  circle      text check (circle in ('household','family','friend')),
  relationship text,
  parent_id   uuid references public.entity(id),
  last_contacted date,
  deceased    boolean not null default false,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.entity enable row level security;
create policy "Users can manage their own entities"
  on public.entity for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- ORGS
-- ============================================================

create table public.org (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users default auth.uid(),
  name        text not null,
  type        text,
  website     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.org enable row level security;
create policy "Users can manage their own orgs"
  on public.org for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- CONTACTS
-- ============================================================

create table public.contact (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users default auth.uid(),
  name        text not null,
  role        text,
  org_id      uuid references public.org(id),
  email       text,
  phone       text,
  source      text not null default 'manual' check (source in ('manual','gmail')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.contact enable row level security;
create policy "Users can manage their own contacts"
  on public.contact for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- JOIN TABLES: contact ↔ entity, org ↔ entity
-- ============================================================

create table public.contact_entity (
  contact_id uuid not null references public.contact(id) on delete cascade,
  entity_id  uuid not null references public.entity(id) on delete cascade,
  primary key (contact_id, entity_id)
);

alter table public.contact_entity enable row level security;
create policy "Users can manage their own contact_entity links"
  on public.contact_entity for all
  using (
    exists (select 1 from public.contact where id = contact_id and user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.contact where id = contact_id and user_id = auth.uid())
  );

create table public.org_entity (
  org_id    uuid not null references public.org(id) on delete cascade,
  entity_id uuid not null references public.entity(id) on delete cascade,
  primary key (org_id, entity_id)
);

alter table public.org_entity enable row level security;
create policy "Users can manage their own org_entity links"
  on public.org_entity for all
  using (
    exists (select 1 from public.org where id = org_id and user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.org where id = org_id and user_id = auth.uid())
  );

-- ============================================================
-- OBLIGATIONS
-- ============================================================

create table public.obligation (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users default auth.uid(),
  title             text not null,
  category          text,
  owner             text not null default 'Matt' check (owner in ('Matt','Brittany','Either')),
  recurrence_type   text not null check (recurrence_type in ('fixed_annual','fixed_rule','interval','seasonal_window','one_off')),
  recurrence_config jsonb not null default '{}',
  lead_time_days    integer not null default 7,
  priority          text not null default 'normal' check (priority in ('normal','milestone')),
  notes             text,
  status            text not null default 'active' check (status in ('active','paused','archived')),
  source            text not null default 'manual' check (source in ('manual','library','gmail')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.obligation enable row level security;
create policy "Users can manage their own obligations"
  on public.obligation for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- obligation ↔ entity (many-to-many)
create table public.obligation_entity (
  obligation_id uuid not null references public.obligation(id) on delete cascade,
  entity_id     uuid not null references public.entity(id) on delete cascade,
  primary key (obligation_id, entity_id)
);

alter table public.obligation_entity enable row level security;
create policy "Users can manage their own obligation_entity links"
  on public.obligation_entity for all
  using (
    exists (select 1 from public.obligation where id = obligation_id and user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.obligation where id = obligation_id and user_id = auth.uid())
  );

-- ============================================================
-- OCCURRENCES
-- ============================================================

create table public.occurrence (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users default auth.uid(),
  obligation_id  uuid not null references public.obligation(id) on delete cascade,
  due_date       date,
  window_start   date,
  window_end     date,
  state          text not null default 'upcoming' check (state in ('upcoming','due','overdue','done','skipped','snoozed')),
  snoozed_until  date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.occurrence enable row level security;
create policy "Users can manage their own occurrences"
  on public.occurrence for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- COMPLETIONS
-- ============================================================

create table public.completion (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users default auth.uid(),
  occurrence_id  uuid not null references public.occurrence(id) on delete cascade,
  completed_at   timestamptz not null default now(),
  notes          text,
  cost           numeric(10,2),
  odometer       integer,
  attachment_url text,
  created_at     timestamptz not null default now()
);

alter table public.completion enable row level security;
create policy "Users can manage their own completions"
  on public.completion for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- SUGGESTIONS (AI inbox)
-- ============================================================

create table public.suggestion (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users default auth.uid(),
  proposed_obligation jsonb not null,
  reason              text,
  source              text not null default 'library' check (source in ('library','gmail','profile')),
  source_link         text,
  state               text not null default 'pending' check (state in ('pending','approved','edited','dismissed')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.suggestion enable row level security;
create policy "Users can manage their own suggestions"
  on public.suggestion for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_entity_updated_at before update on public.entity
  for each row execute function public.set_updated_at();
create trigger set_org_updated_at before update on public.org
  for each row execute function public.set_updated_at();
create trigger set_contact_updated_at before update on public.contact
  for each row execute function public.set_updated_at();
create trigger set_obligation_updated_at before update on public.obligation
  for each row execute function public.set_updated_at();
create trigger set_occurrence_updated_at before update on public.occurrence
  for each row execute function public.set_updated_at();
create trigger set_suggestion_updated_at before update on public.suggestion
  for each row execute function public.set_updated_at();
