## Database schema (Supabase SQL)

Run this SQL in your Supabase project's SQL editor to create the minimal schema that mirrors Airtable's Base → Tables → Fields hierarchy.

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Workspaces (parent container for many bases)
create table if not exists public.workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner uuid default auth.uid(),
  created_at timestamp with time zone default now()
);

-- Bases (workspaces/databases)
create table if not exists public.bases (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  owner uuid default auth.uid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  last_opened_at timestamp with time zone,
  is_starred boolean not null default false,
  created_at timestamp with time zone default now()
);

-- Tables within a base
create table if not exists public.tables (
  id uuid primary key default uuid_generate_v4(),
  base_id uuid not null references public.bases(id) on delete cascade,
  name text not null,
  order_index integer not null default 0,
  is_master_list boolean not null default false,
  created_at timestamp with time zone default now()
);

-- Fields within a table
create table if not exists public.fields (
  id uuid primary key default uuid_generate_v4(),
  table_id uuid not null references public.tables(id) on delete cascade,
  name text not null,
  type text not null check (type in ('text','number','date','email','checkbox','single_select','multi_select','link')), 
  order_index integer not null default 0,
  options jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- Example records table for data rows (simple flexible model)
create table if not exists public.records (
  id uuid primary key default uuid_generate_v4(),
  table_id uuid not null references public.tables(id) on delete cascade,
  -- store cell values per field in a JSON map: { fieldId: value }
  values jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- Automations (Airtable-like)
create table if not exists public.automations (
  id uuid primary key default uuid_generate_v4(),
  table_id uuid not null references public.tables(id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  trigger jsonb not null, -- { type: 'field_change'|'record_created'|'record_updated', table_id, field_id?, condition? }
  action jsonb not null,  -- { type: 'create_record'|'update_record', target_table_id, field_mappings: [{ source_field_id, target_field_id }] }
  created_at timestamp with time zone default now()
);

-- Row Level Security
alter table public.workspaces enable row level security;
alter table public.bases enable row level security;
alter table public.tables enable row level security;
alter table public.fields enable row level security;
alter table public.records enable row level security;
alter table public.automations enable row level security;

-- Workspace ownership based access
create policy "Owners can manage their workspaces" on public.workspaces
  for all using (owner = auth.uid()) with check (owner = auth.uid());

-- Ownership based access (owners can CRUD their bases and children)
create policy "Owners can manage their bases" on public.bases
  for all using (owner = auth.uid()) with check (owner = auth.uid());

create policy "Manage tables for own bases" on public.tables
  for all using (
    exists (
      select 1 from public.bases b
      where b.id = base_id and b.owner = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.bases b
      where b.id = base_id and b.owner = auth.uid()
    )
  );

create policy "Manage fields for own bases" on public.fields
  for all using (
    exists (
      select 1
      from public.tables t
      join public.bases b on b.id = t.base_id
      where t.id = table_id and b.owner = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.tables t
      join public.bases b on b.id = t.base_id
      where t.id = table_id and b.owner = auth.uid()
    )
  );

create policy "Manage automations for own bases" on public.automations
  for all using (
    exists (
      select 1
      from public.tables t
      join public.bases b on b.id = t.base_id
      where t.id = table_id and b.owner = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.tables t
      join public.bases b on b.id = t.base_id
      where t.id = table_id and b.owner = auth.uid()
    )
  );

create policy "Manage records for own bases" on public.records
  for all using (
    exists (
      select 1
      from public.tables t
      join public.bases b on b.id = t.base_id
      where t.id = table_id and b.owner = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.tables t
      join public.bases b on b.id = t.base_id
      where t.id = table_id and b.owner = auth.uid()
    )
  );
```

## Migration Scripts

If you already have an existing database, run these migration scripts in your Supabase SQL editor to update to the latest schema:

### Migration 1: Add starred functionality
```sql
-- Add is_starred column to existing bases table
alter table public.bases add column if not exists is_starred boolean not null default false;
```

### Migration 2: Update automations table structure
```sql
-- If you have existing automations table with base_id, migrate to table_id structure
-- First, add the new column
alter table public.automations add column if not exists table_id uuid;

-- If you have existing automations, you'll need to manually update them
-- This is a breaking change that requires manual intervention
-- Consider backing up your automations data before running this

-- Drop the old foreign key constraint if it exists
alter table public.automations drop constraint if exists automations_base_id_fkey;

-- Remove the old base_id column (after migrating data)
-- alter table public.automations drop column if exists base_id;

-- Add the new foreign key constraint
alter table public.automations add constraint automations_table_id_fkey 
  foreign key (table_id) references public.tables(id) on delete cascade;

-- Drop and recreate the RLS policy for automations
drop policy if exists "Manage automations for own bases" on public.automations;
create policy "Manage automations for own bases" on public.automations
  for all using (
    exists (
      select 1
      from public.tables t
      join public.bases b on b.id = t.base_id
      where t.id = table_id and b.owner = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.tables t
      join public.bases b on b.id = t.base_id
      where t.id = table_id and b.owner = auth.uid()
    )
  );
```

### Migration 3: Update field types constraint
```sql
-- Update field types to include 'email' type
alter table public.fields drop constraint if exists fields_type_check;
alter table public.fields add constraint fields_type_check 
  check (type in ('text','number','date','email','checkbox','single_select','multi_select','link'));
```

### Migration 4: Add master list functionality
```sql
-- Add is_master_list column to tables
alter table public.tables add column if not exists is_master_list boolean not null default false;

-- Create unique constraint to ensure only one master list per base
create unique index if not exists unique_master_list_per_base 
  on public.tables (base_id) where is_master_list = true;
```

### Migration 5: Ensure all constraints are in place
```sql
-- Ensure all foreign key constraints exist
alter table public.bases add constraint if not exists bases_workspace_id_fkey 
  foreign key (workspace_id) references public.workspaces(id) on delete cascade;

alter table public.tables add constraint if not exists tables_base_id_fkey 
  foreign key (base_id) references public.bases(id) on delete cascade;

alter table public.fields add constraint if not exists fields_table_id_fkey 
  foreign key (table_id) references public.tables(id) on delete cascade;

alter table public.records add constraint if not exists records_table_id_fkey 
  foreign key (table_id) references public.tables(id) on delete cascade;
```

After running the SQL above, the "Create a database" action in the Dashboard will create a Base with a default Table and two Fields, similar to Airtable's new base flow.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
