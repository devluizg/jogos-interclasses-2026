-- ---------------------------------------------------------------------
-- Ajustes para o painel administrativo
-- ---------------------------------------------------------------------

-- Um usuário autenticado pode confirmar o próprio vínculo de admin
-- (necessário para a tela de login saber se libera o painel).
create policy admins_leitura_propria on public.admins
  for select using (user_id = auth.uid());

create or replace function public.fn_sou_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke execute on function public.fn_sou_admin() from public;
grant execute on function public.fn_sou_admin() to authenticated;
