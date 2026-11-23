-- =====================================================================
-- 0016 - Exposição pública segura (somente leitura) dos chaveamentos
--        e programação salvos no /admin/chaveamentos + Realtime
-- =====================================================================

create or replace function public.fn_chaveamentos_publicos()
returns table (
  slug       text,
  titulo     text,
  subtitulo  text,
  tipo       text,
  ordem      smallint,
  abas       jsonb,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.slug,
    c.titulo,
    c.subtitulo,
    c.tipo,
    c.ordem,
    case
      when c.tipo = 'programacao' then
        coalesce(
          (
            select jsonb_agg(
              jsonb_set(
                aba,
                '{blocos}',
                coalesce(
                  (
                    select jsonb_agg(bloco - 'arbitragem' - 'obs' - 'conferido')
                    from jsonb_array_elements(coalesce(aba -> 'blocos', '[]'::jsonb)) as bloco
                  ),
                  '[]'::jsonb
                )
              )
            )
            from jsonb_array_elements(coalesce(c.dados -> 'abas', '[]'::jsonb)) as aba
          ),
          '[]'::jsonb
        )
      else
        coalesce(c.dados -> 'abas', '[]'::jsonb)
    end as abas,
    c.updated_at
  from public.chaveamentos c
  order by c.ordem asc;
$$;

create or replace view public.vw_chaveamentos_publicos as
select * from public.fn_chaveamentos_publicos();

grant execute on function public.fn_chaveamentos_publicos() to anon, authenticated;
grant select on public.vw_chaveamentos_publicos to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chaveamentos'
  ) then
    alter publication supabase_realtime add table public.chaveamentos;
  end if;
end $$;

notify pgrst, 'reload schema';
