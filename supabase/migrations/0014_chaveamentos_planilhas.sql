-- =====================================================================
-- 0014 - Réplica dos chaveamentos e programação das planilhas no /admin
-- =====================================================================

create table if not exists public.chaveamentos (
  slug        text primary key,
  titulo      text not null,
  subtitulo   text,
  tipo        text not null
              check (tipo in (
                'grupos_mata_mata',
                'mata_mata',
                'repescagem',
                'tempo',
                'free_fire',
                'quiz',
                'programacao'
              )),
  ordem       smallint not null default 0,
  dados       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

create or replace function public.fn_chaveamentos_touch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if auth.uid() is not null then
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_chaveamentos_touch on public.chaveamentos;
create trigger trg_chaveamentos_touch
before update on public.chaveamentos
for each row execute function public.fn_chaveamentos_touch();

alter table public.chaveamentos enable row level security;

drop policy if exists "admins_select_chaveamentos" on public.chaveamentos;
create policy "admins_select_chaveamentos"
  on public.chaveamentos
  for select
  to authenticated
  using (public.fn_sou_admin());

drop policy if exists "admins_insert_chaveamentos" on public.chaveamentos;
create policy "admins_insert_chaveamentos"
  on public.chaveamentos
  for insert
  to authenticated
  with check (public.fn_sou_admin());

drop policy if exists "admins_update_chaveamentos" on public.chaveamentos;
create policy "admins_update_chaveamentos"
  on public.chaveamentos
  for update
  to authenticated
  using (public.fn_sou_admin())
  with check (public.fn_sou_admin());

drop policy if exists "admins_delete_chaveamentos" on public.chaveamentos;
create policy "admins_delete_chaveamentos"
  on public.chaveamentos
  for delete
  to authenticated
  using (public.fn_sou_admin());

grant select, insert, update, delete on public.chaveamentos to authenticated;

notify pgrst, 'reload schema';
