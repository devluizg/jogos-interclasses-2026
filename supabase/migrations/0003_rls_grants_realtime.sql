-- =====================================================================
-- 0003 - RLS, permissões e Realtime
-- Regra geral: leitura pública apenas do que é público; toda escrita
-- exige login de um usuário presente em public.admins.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Ativa RLS em todas as tabelas
-- ---------------------------------------------------------------------

alter table public.admins                  enable row level security;
alter table public.configuracoes           enable row level security;
alter table public.pontuacao_colocacao     enable row level security;
alter table public.criterios_desempate     enable row level security;
alter table public.turmas                  enable row level security;
alter table public.estudantes              enable row level security;
alter table public.locais                  enable row level security;
alter table public.dias_evento             enable row level security;
alter table public.modalidades             enable row level security;
alter table public.modalidade_categorias   enable row level security;
alter table public.inscricoes              enable row level security;
alter table public.inscricao_participantes enable row level security;
alter table public.partidas                enable row level security;
alter table public.partida_participantes   enable row level security;
alter table public.resultados              enable row level security;
alter table public.resultados_historico    enable row level security;
alter table public.conduta_ocorrencias     enable row level security;
alter table public.taca_criterios          enable row level security;
alter table public.taca_jurados            enable row level security;
alter table public.taca_notas              enable row level security;
alter table public.noticias                enable row level security;
alter table public.documentos              enable row level security;
alter table public.auditoria               enable row level security;

-- ---------------------------------------------------------------------
-- Administração (acesso total somente para admins)
-- ---------------------------------------------------------------------

create policy admins_admin on public.admins
  for all using (public.is_admin()) with check (public.is_admin());

create policy configuracoes_admin on public.configuracoes
  for all using (public.is_admin()) with check (public.is_admin());

create policy pontuacao_admin on public.pontuacao_colocacao
  for all using (public.is_admin()) with check (public.is_admin());

create policy desempate_admin on public.criterios_desempate
  for all using (public.is_admin()) with check (public.is_admin());

create policy turmas_admin on public.turmas
  for all using (public.is_admin()) with check (public.is_admin());

create policy estudantes_admin on public.estudantes
  for all using (public.is_admin()) with check (public.is_admin());

create policy locais_admin on public.locais
  for all using (public.is_admin()) with check (public.is_admin());

create policy dias_admin on public.dias_evento
  for all using (public.is_admin()) with check (public.is_admin());

create policy modalidades_admin on public.modalidades
  for all using (public.is_admin()) with check (public.is_admin());

create policy categorias_admin on public.modalidade_categorias
  for all using (public.is_admin()) with check (public.is_admin());

create policy inscricoes_admin on public.inscricoes
  for all using (public.is_admin()) with check (public.is_admin());

create policy participantes_admin on public.inscricao_participantes
  for all using (public.is_admin()) with check (public.is_admin());

create policy partidas_admin on public.partidas
  for all using (public.is_admin()) with check (public.is_admin());

create policy partida_participantes_admin on public.partida_participantes
  for all using (public.is_admin()) with check (public.is_admin());

create policy resultados_admin on public.resultados
  for all using (public.is_admin()) with check (public.is_admin());

create policy resultados_hist_admin on public.resultados_historico
  for all using (public.is_admin()) with check (public.is_admin());

create policy conduta_admin on public.conduta_ocorrencias
  for all using (public.is_admin()) with check (public.is_admin());

create policy taca_criterios_admin on public.taca_criterios
  for all using (public.is_admin()) with check (public.is_admin());

create policy taca_jurados_admin on public.taca_jurados
  for all using (public.is_admin()) with check (public.is_admin());

create policy taca_notas_admin on public.taca_notas
  for all using (public.is_admin()) with check (public.is_admin());

create policy noticias_admin on public.noticias
  for all using (public.is_admin()) with check (public.is_admin());

create policy documentos_admin on public.documentos
  for all using (public.is_admin()) with check (public.is_admin());

create policy auditoria_admin on public.auditoria
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Leitura pública
-- ---------------------------------------------------------------------

create policy configuracoes_leitura on public.configuracoes
  for select using (true);

create policy pontuacao_leitura on public.pontuacao_colocacao
  for select using (true);

create policy desempate_leitura on public.criterios_desempate
  for select using (true);

create policy locais_leitura on public.locais
  for select using (true);

create policy dias_leitura on public.dias_evento
  for select using (true);

create policy modalidades_leitura on public.modalidades
  for select using (true);

create policy categorias_leitura on public.modalidade_categorias
  for select using (true);

create policy partidas_leitura on public.partidas
  for select using (true);

create policy partida_participantes_leitura on public.partida_participantes
  for select using (true);

create policy taca_criterios_leitura on public.taca_criterios
  for select using (true);

create policy resultados_leitura on public.resultados
  for select using (status = 'oficial' or public.is_admin());

create policy noticias_leitura on public.noticias
  for select using (publicada or public.is_admin());

create policy documentos_leitura on public.documentos
  for select using (publico or public.is_admin());

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on
  public.configuracoes,
  public.pontuacao_colocacao,
  public.criterios_desempate,
  public.locais,
  public.dias_evento,
  public.modalidades,
  public.modalidade_categorias,
  public.partidas,
  public.partida_participantes,
  public.taca_criterios,
  public.resultados
to anon;

grant select on
  public.noticias,
  public.documentos
to anon;

revoke select on public.turmas from anon;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant select on
  public.vw_turmas_publicas,
  public.vw_classificacao_esportiva,
  public.vw_taca_publica,
  public.vw_medalheiro,
  public.vw_medalheiro_detalhe,
  public.vw_conduta_turma,
  public.vw_programacao,
  public.vw_resultados_publicos,
  public.vw_participantes_publico
to anon, authenticated;

grant execute on function public.fn_classificacao_esportiva() to anon, authenticated;
grant execute on function public.fn_classificacao_taca() to anon, authenticated;

-- Funções sensíveis: somente usuários autenticados (e, internamente,
-- as funções exigem public.is_admin()).
revoke execute on function public.fn_validar_inscricao(uuid, boolean) from public;
revoke execute on function public.fn_conflitos_horario() from public;
revoke execute on function public.fn_publicar_resultado(uuid) from public;
revoke execute on function public.fn_corrigir_resultado(uuid, smallint, text) from public;
revoke execute on function public.fn_anular_resultado(uuid, text) from public;
revoke execute on function public.fn_definir_desempate(text, text[]) from public;

grant execute on function public.fn_validar_inscricao(uuid, boolean) to authenticated;
grant execute on function public.fn_conflitos_horario() to authenticated;
grant execute on function public.fn_publicar_resultado(uuid) to authenticated;
grant execute on function public.fn_corrigir_resultado(uuid, smallint, text) to authenticated;
grant execute on function public.fn_anular_resultado(uuid, text) to authenticated;
grant execute on function public.fn_definir_desempate(text, text[]) to authenticated;

-- ---------------------------------------------------------------------
-- Realtime (apenas se a publication existir, como no Supabase)
-- ---------------------------------------------------------------------

do $$
declare
  v_tabela text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach v_tabela in array array[
      'resultados',
      'partidas',
      'partida_participantes',
      'modalidade_categorias',
      'modalidades',
      'turmas',
      'configuracoes',
      'dias_evento',
      'noticias',
      'documentos'
    ]
    loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = v_tabela
      ) then
        execute format('alter publication supabase_realtime add table public.%I', v_tabela);
      end if;
    end loop;
  end if;
end;
$$;
