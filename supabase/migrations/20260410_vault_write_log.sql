-- Audit log for writes made from Command Center into the Vault Graph
create table public.vault_write_log (
  id uuid primary key default gen_random_uuid(),
  cortex_user_id text not null,
  action text not null check (action in ('create', 'append')),
  target_path text not null,
  content_hash text not null,
  source_type text,
  source_url text,
  created_at timestamptz not null default now()
);

create index idx_vault_write_log_user
  on public.vault_write_log(cortex_user_id, created_at desc);

alter table public.vault_write_log enable row level security;

create policy "users_can_read_own_vault_write_log"
  on public.vault_write_log
  for select
  using (auth.jwt()->>'sub' = cortex_user_id);

create policy "service_role_can_insert"
  on public.vault_write_log
  for insert
  with check (true);
