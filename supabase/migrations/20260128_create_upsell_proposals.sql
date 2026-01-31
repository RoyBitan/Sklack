-- Enable moddatetime extension
create extension if not exists moddatetime schema extensions;

-- Create upsell_proposals table
create table if not exists public.upsell_proposals (
    id uuid not null default gen_random_uuid(),
    org_id uuid not null references public.organizations(id) on delete cascade,
    task_id uuid not null references public.tasks(id) on delete cascade,
    customer_id uuid references public.profiles(id) on delete set null,
    created_by uuid references public.profiles(id) on delete set null,
    
    description text not null,
    price numeric,
    status text not null check (status in ('PENDING_ADMIN', 'PENDING_MANAGER', 'PENDING_CUSTOMER', 'APPROVED', 'REJECTED')),
    photo_url text,
    audio_url text,
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    primary key (id)
);

-- Enable RLS
alter table public.upsell_proposals enable row level security;

-- Policies

-- View: Members of the org or the customer who owns the proposal
create policy "Users can view proposals from their organization"
    on public.upsell_proposals for select
    using (
        auth.uid() in (
            select id from public.profiles
            where org_id = upsell_proposals.org_id
        )
        or
        auth.uid() = customer_id
    );

-- Insert: Staff and Managers of the org
create policy "Staff can create proposals"
    on public.upsell_proposals for insert
    with check (
        auth.uid() in (
            select id from public.profiles
            where org_id = upsell_proposals.org_id
            and role in ('STAFF', 'SUPER_MANAGER')
        )
    );

-- Update: Staff/Managers (for editing) and Customers (for approving/rejecting)
create policy "Users can update proposals"
    on public.upsell_proposals for update
    using (
        (auth.uid() in (
            select id from public.profiles
            where org_id = upsell_proposals.org_id
            and role in ('STAFF', 'SUPER_MANAGER')
        ))
        or
        (auth.uid() = customer_id)
    );

-- Trigger for updated_at
create trigger handle_updated_at before update on public.upsell_proposals
  for each row execute procedure moddatetime (updated_at);
