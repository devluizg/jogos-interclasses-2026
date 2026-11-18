-- =====================================================================
-- 0002 - Validações de negócio, funções de cálculo e views públicas
-- =====================================================================

-- ---------------------------------------------------------------------
-- Privacidade: nome público = primeiro nome + inicial do sobrenome
-- ---------------------------------------------------------------------

create or replace function public.nome_publico(p_nome text)
returns text
language plpgsql
immutable
as $$
declare
  n text := regexp_replace(trim(p_nome), '\s+', ' ', 'g');
begin
  if n is null or n = '' then
    return null;
  end if;
  if position(' ' in n) = 0 then
    return n;
  end if;
  return split_part(n, ' ', 1) || ' ' || upper(left(regexp_replace(n, '^.* ', ''), 1)) || '.';
end;
$$;

-- ---------------------------------------------------------------------
-- Validação de uma inscrição (retorna erros e avisos)
-- p_para_aprovar = true transforma violações de mínimo/composição em erro
-- ---------------------------------------------------------------------

create or replace function public.fn_validar_inscricao(
  p_inscricao_id uuid,
  p_para_aprovar boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_insc       record;
  v_cat        record;
  v_mod        record;
  v_total      integer := 0;
  v_fem        integer := 0;
  v_masc       integer := 0;
  v_equipes    integer := 0;
  v_erros      text[] := '{}';
  v_avisos     text[] := '{}';
  v_percentual numeric;
begin
  select i.id, i.turma_id, i.status, i.modalidade_categoria_id, i.tipo
    into v_insc
  from public.inscricoes i
  where i.id = p_inscricao_id;

  if not found then
    return jsonb_build_object('ok', false, 'erros', jsonb_build_array('Inscrição não encontrada.'), 'avisos', '[]'::jsonb);
  end if;

  select * into v_cat from public.modalidade_categorias where id = v_insc.modalidade_categoria_id;
  select * into v_mod from public.modalidades where id = v_cat.modalidade_id;

  select count(*),
         count(*) filter (where e.genero = 'feminino'),
         count(*) filter (where e.genero = 'masculino')
    into v_total, v_fem, v_masc
  from public.inscricao_participantes ip
  join public.estudantes e on e.id = ip.estudante_id
  where ip.inscricao_id = p_inscricao_id;

  select count(*) into v_equipes
  from public.inscricoes i
  where i.modalidade_categoria_id = v_insc.modalidade_categoria_id
    and i.turma_id = v_insc.turma_id
    and i.status in ('pendente', 'aprovada')
    and i.id <> p_inscricao_id;

  if not v_mod.ativo or not v_cat.ativo then
    v_erros := array_append(v_erros, 'Modalidade ou categoria inativa.');
  end if;

  if v_total = 0 then
    v_erros := array_append(v_erros, 'Inscrição sem participantes.');
  end if;

  if v_insc.tipo = 'individual' and v_total <> 1 then
    v_erros := array_append(v_erros, 'Inscrição individual deve ter exatamente 1 participante.');
  end if;

  if v_cat.max_participantes_por_turma is not null and v_total > v_cat.max_participantes_por_turma then
    v_erros := array_append(v_erros,
      format('A turma tem %s participantes; o limite é %s.', v_total, v_cat.max_participantes_por_turma));
  end if;

  if v_cat.max_equipes_por_turma is not null and v_equipes + 1 > v_cat.max_equipes_por_turma then
    v_erros := array_append(v_erros,
      format('Limite de %s inscrição(ões) por turma nesta categoria.', v_cat.max_equipes_por_turma));
  end if;

  if v_cat.tamanho_equipe_max is not null and v_total > v_cat.tamanho_equipe_max then
    v_erros := array_append(v_erros,
      format('Equipe com %s participantes; o máximo é %s.', v_total, v_cat.tamanho_equipe_max));
  end if;

  if v_cat.tamanho_equipe_min is not null and v_total < v_cat.tamanho_equipe_min then
    if p_para_aprovar then
      v_erros := array_append(v_erros,
        format('Equipe com %s participantes; o mínimo para aprovação é %s.', v_total, v_cat.tamanho_equipe_min));
    else
      v_avisos := array_append(v_avisos,
        format('Equipe com %s participantes; o mínimo é %s.', v_total, v_cat.tamanho_equipe_min));
    end if;
  end if;

  if v_cat.min_participantes_partida is not null and v_total < v_cat.min_participantes_partida then
    v_avisos := array_append(v_avisos,
      format('Abaixo do mínimo para iniciar partidas (%s).', v_cat.min_participantes_partida));
  end if;

  if v_cat.min_participantes_partida is null then
    v_avisos := array_append(v_avisos,
      'Mínimo para partida ainda não definido: jogos oficiais ficam bloqueados até a configuração.');
  end if;

  if v_cat.min_feminino is not null and v_fem < v_cat.min_feminino then
    if p_para_aprovar then
      v_erros := array_append(v_erros,
        format('São necessárias ao menos %s participantes do gênero feminino (atual: %s).', v_cat.min_feminino, v_fem));
    else
      v_avisos := array_append(v_avisos,
        format('Faltam participantes do gênero feminino: mínimo %s, atual %s.', v_cat.min_feminino, v_fem));
    end if;
  end if;

  if v_cat.min_masculino is not null and v_masc < v_cat.min_masculino then
    if p_para_aprovar then
      v_erros := array_append(v_erros,
        format('São necessários ao menos %s participantes do gênero masculino (atual: %s).', v_cat.min_masculino, v_masc));
    else
      v_avisos := array_append(v_avisos,
        format('Faltam participantes do gênero masculino: mínimo %s, atual %s.', v_cat.min_masculino, v_masc));
    end if;
  end if;

  if v_cat.min_percentual_feminino is not null and v_total > 0 then
    v_percentual := (v_fem::numeric / v_total::numeric) * 100;
    if v_percentual < v_cat.min_percentual_feminino then
      if p_para_aprovar then
        v_erros := array_append(v_erros,
          format('Participação feminina de %s%%; o mínimo é %s%%.', round(v_percentual, 1), v_cat.min_percentual_feminino));
      else
        v_avisos := array_append(v_avisos,
          format('Participação feminina de %s%%; o mínimo é %s%%.', round(v_percentual, 1), v_cat.min_percentual_feminino));
      end if;
    end if;
  end if;

  if v_cat.a_confirmar or v_mod.a_confirmar then
    v_avisos := array_append(v_avisos, 'Regra marcada como "a confirmar" pela organização.');
  end if;

  return jsonb_build_object(
    'ok', coalesce(array_length(v_erros, 1), 0) = 0,
    'erros', to_jsonb(v_erros),
    'avisos', to_jsonb(v_avisos)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Triggers de inscrições
-- ---------------------------------------------------------------------

create or replace function public.fn_inscricoes_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat  record;
  v_mod  record;
  v_qtd  integer := 0;
begin
  select * into v_cat from public.modalidade_categorias where id = new.modalidade_categoria_id;
  select * into v_mod from public.modalidades where id = v_cat.modalidade_id;

  if not v_mod.ativo or not v_cat.ativo then
    raise exception 'Modalidade ou categoria inativa.';
  end if;

  if new.status in ('pendente', 'aprovada') and v_cat.max_equipes_por_turma is not null then
    select count(*) into v_qtd
    from public.inscricoes i
    where i.modalidade_categoria_id = new.modalidade_categoria_id
      and i.turma_id = new.turma_id
      and i.status in ('pendente', 'aprovada')
      and i.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

    if v_qtd + 1 > v_cat.max_equipes_por_turma then
      raise exception 'Limite de % inscrição(ões) por turma em % / %.',
        v_cat.max_equipes_por_turma, v_mod.nome, v_cat.nome;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_inscricoes_guard
before insert or update on public.inscricoes
for each row execute function public.fn_inscricoes_guard();

create or replace function public.fn_inscricao_aprovar_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resultado jsonb;
begin
  if new.status = 'aprovada' and (tg_op = 'INSERT' or old.status is distinct from 'aprovada') then
    v_resultado := public.fn_validar_inscricao(new.id, true);
    if not (v_resultado ->> 'ok')::boolean then
      raise exception 'Não é possível aprovar a inscrição: %',
        array_to_string(array(select jsonb_array_elements_text(v_resultado -> 'erros')), ' | ');
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_inscricao_aprovar_guard
before insert or update of status on public.inscricoes
for each row execute function public.fn_inscricao_aprovar_guard();

create or replace function public.fn_participantes_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_insc    record;
  v_cat     record;
  v_mod     record;
  v_count   integer := 0;
  v_total   integer := 0;
  v_outras  integer := 0;
  v_permite boolean;
  v_limite  integer;
begin
  select i.id, i.turma_id, i.status, i.modalidade_categoria_id
    into v_insc
  from public.inscricoes i
  where i.id = new.inscricao_id;

  if not found then
    raise exception 'Inscrição inexistente.';
  end if;

  select * into v_cat from public.modalidade_categorias where id = v_insc.modalidade_categoria_id;
  select * into v_mod from public.modalidades where id = v_cat.modalidade_id;

  if not v_mod.ativo or not v_cat.ativo then
    raise exception 'Modalidade ou categoria inativa.';
  end if;

  if not exists (select 1 from public.estudantes e where e.id = new.estudante_id and e.ativo) then
    raise exception 'Estudante inexistente ou inativo.';
  end if;

  select count(*) into v_count
  from public.inscricao_participantes ip
  where ip.inscricao_id = new.inscricao_id
    and ip.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if v_cat.tamanho_equipe_max is not null and v_count + 1 > v_cat.tamanho_equipe_max then
    raise exception 'Limite de % participantes por equipe em % / %.',
      v_cat.tamanho_equipe_max, v_mod.nome, v_cat.nome;
  end if;

  select count(*) into v_total
  from public.inscricao_participantes ip
  join public.inscricoes i on i.id = ip.inscricao_id
  where i.modalidade_categoria_id = v_cat.id
    and i.turma_id = v_insc.turma_id
    and i.status in ('pendente', 'aprovada')
    and ip.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if v_cat.max_participantes_por_turma is not null
     and v_total + 1 > v_cat.max_participantes_por_turma then
    raise exception 'Limite de % participantes por turma em % / %.',
      v_cat.max_participantes_por_turma, v_mod.nome, v_cat.nome;
  end if;

  if exists (
    select 1
    from public.inscricao_participantes ip
    join public.inscricoes i on i.id = ip.inscricao_id
    where ip.estudante_id = new.estudante_id
      and i.modalidade_categoria_id = v_cat.id
      and i.id <> new.inscricao_id
      and i.status in ('pendente', 'aprovada')
  ) then
    raise exception 'Estudante já inscrito nesta modalidade/categoria.';
  end if;

  select coalesce((valor)::boolean, true) into v_permite
  from public.configuracoes where chave = 'permitir_varias_modalidades';

  select nullif(valor #>> '{}', '')::integer into v_limite
  from public.configuracoes where chave = 'limite_modalidades_por_estudante';

  select count(distinct mc2.modalidade_id) into v_outras
  from public.inscricao_participantes ip2
  join public.inscricoes i2 on i2.id = ip2.inscricao_id
  join public.modalidade_categorias mc2 on mc2.id = i2.modalidade_categoria_id
  where ip2.estudante_id = new.estudante_id
    and i2.id <> new.inscricao_id
    and i2.status in ('pendente', 'aprovada')
    and mc2.modalidade_id <> v_cat.modalidade_id;

  if not coalesce(v_permite, true) and v_outras > 0 then
    raise exception 'A configuração atual não permite o mesmo estudante em mais de uma modalidade.';
  end if;

  if v_limite is not null and v_outras + 1 > v_limite then
    raise exception 'Limite de % modalidade(s) por estudante atingido.', v_limite;
  end if;

  return new;
end;
$$;

create trigger trg_participantes_guard
before insert or update on public.inscricao_participantes
for each row execute function public.fn_participantes_guard();

create or replace function public.fn_revalidar_inscricao_aprovada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_resultado jsonb;
begin
  select i.status into v_status
  from public.inscricoes i
  where i.id = coalesce(new.inscricao_id, old.inscricao_id);

  if v_status = 'aprovada' then
    v_resultado := public.fn_validar_inscricao(coalesce(new.inscricao_id, old.inscricao_id), true);
    if not (v_resultado ->> 'ok')::boolean then
      raise exception 'A alteração viola as regras da inscrição: %',
        array_to_string(array(select jsonb_array_elements_text(v_resultado -> 'erros')), ' | ');
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_revalidar_inscricao_aprovada
after insert or update or delete on public.inscricao_participantes
for each row execute function public.fn_revalidar_inscricao_aprovada();

-- ---------------------------------------------------------------------
-- Partidas: bloqueia jogo quando o mínimo da modalidade não existe
-- ---------------------------------------------------------------------

create or replace function public.fn_partidas_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat record;
  v_mod record;
begin
  select * into v_cat from public.modalidade_categorias where id = new.modalidade_categoria_id;
  select * into v_mod from public.modalidades where id = v_cat.modalidade_id;

  if tg_op = 'INSERT' or new.status in ('em_andamento', 'concluido', 'wo') then
    if v_cat.min_participantes_partida is null then
      raise exception 'Mínimo de participantes não definido para % / %. Configure a modalidade no painel antes de gerar jogos oficiais.',
        v_mod.nome, v_cat.nome;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_partidas_guard
before insert or update on public.partidas
for each row execute function public.fn_partidas_guard();

-- ---------------------------------------------------------------------
-- Resultados: prêmios, confirmação de correção e histórico
-- ---------------------------------------------------------------------

create or replace function public.fn_resultados_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat record;
  v_mod record;
begin
  select * into v_cat from public.modalidade_categorias where id = new.modalidade_categoria_id;
  select * into v_mod from public.modalidades where id = v_cat.modalidade_id;

  if v_cat.vagas_premiadas is not null and new.colocacao > v_cat.vagas_premiadas then
    raise exception '% / % premia apenas % colocação(ões); a colocação % não é válida.',
      v_mod.nome, v_cat.nome, v_cat.vagas_premiadas, new.colocacao;
  end if;

  if tg_op = 'UPDATE' and old.status = 'oficial'
     and (
       new.colocacao is distinct from old.colocacao
       or new.turma_id is distinct from old.turma_id
       or new.status is distinct from old.status
       or new.observacao is distinct from old.observacao
     )
     and coalesce(current_setting('app.confirmar_correcao', true), 'false') <> 'true' then
    raise exception 'Resultado oficial: use a função de correção com confirmação explícita.';
  end if;

  return new;
end;
$$;

create trigger trg_resultados_guard
before insert or update on public.resultados
for each row execute function public.fn_resultados_guard();

create or replace function public.fn_resultados_historico()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.resultados_historico (resultado_id, acao, dados_anteriores, dados_novos, usuario_id)
  values (
    new.id,
    case tg_op when 'INSERT' then 'criado' else 'alterado' end,
    case when tg_op = 'UPDATE' then to_jsonb(old) end,
    to_jsonb(new),
    auth.uid()
  );
  return new;
end;
$$;

create trigger trg_resultados_historico
after insert or update on public.resultados
for each row execute function public.fn_resultados_historico();

create or replace function public.fn_publicar_resultado(p_resultado_id uuid)
returns public.resultados
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.resultados;
begin
  if not public.is_admin() then
    raise exception 'Apenas o administrador pode publicar resultados.';
  end if;

  update public.resultados
     set status = 'oficial', atualizado_por = auth.uid()
   where id = p_resultado_id
     and status = 'rascunho'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Resultado não encontrado ou já oficial.';
  end if;
  return v_row;
end;
$$;

create or replace function public.fn_corrigir_resultado(
  p_resultado_id uuid,
  p_colocacao smallint,
  p_observacao text default null
)
returns public.resultados
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.resultados;
begin
  if not public.is_admin() then
    raise exception 'Apenas o administrador pode corrigir resultados.';
  end if;

  perform set_config('app.confirmar_correcao', 'true', true);

  update public.resultados
     set colocacao = p_colocacao,
         observacao = coalesce(p_observacao, observacao),
         atualizado_por = auth.uid()
   where id = p_resultado_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Resultado não encontrado.';
  end if;
  return v_row;
end;
$$;

create or replace function public.fn_anular_resultado(
  p_resultado_id uuid,
  p_observacao text default null
)
returns public.resultados
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.resultados;
begin
  if not public.is_admin() then
    raise exception 'Apenas o administrador pode anular resultados.';
  end if;

  perform set_config('app.confirmar_correcao', 'true', true);

  update public.resultados
     set status = 'anulado',
         observacao = coalesce(p_observacao, observacao),
         atualizado_por = auth.uid()
   where id = p_resultado_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Resultado não encontrado.';
  end if;
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- Notas da Taça: valida escala do critério
-- ---------------------------------------------------------------------

create or replace function public.fn_taca_notas_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_crit record;
begin
  select * into v_crit from public.taca_criterios where id = new.criterio_id;
  if new.nota < v_crit.escala_min or new.nota > v_crit.escala_max then
    raise exception 'Nota % fora da escala de % (%.1f a %.1f).',
      new.nota, v_crit.nome, v_crit.escala_min, v_crit.escala_max;
  end if;
  return new;
end;
$$;

create trigger trg_taca_notas_guard
before insert or update on public.taca_notas
for each row execute function public.fn_taca_notas_guard();

-- ---------------------------------------------------------------------
-- Conflitos de horário (alerta no admin, não bloqueia)
-- ---------------------------------------------------------------------

create or replace function public.fn_conflitos_horario()
returns table (
  tipo       text,
  data_hora  timestamptz,
  referencia text,
  detalhe    text
)
language sql
stable
security definer
set search_path = public
as $$
  with ativas as (
    select p.id, p.data_hora, p.local_id
    from public.partidas p
    where p.data_hora is not null
      and p.status not in ('cancelado', 'adiado')
  )
  select 'turma'::text, a.data_hora,
         'Turma ' || t.numero,
         'Partidas ' || a.id || ' e ' || b.id || ' no mesmo horário'
  from ativas a
  join ativas b on b.data_hora = a.data_hora and b.id > a.id
  join public.partida_participantes pa on pa.partida_id = a.id
  join public.partida_participantes pb on pb.partida_id = b.id and pb.turma_id = pa.turma_id
  join public.turmas t on t.id = pa.turma_id
  union
  select 'local'::text, a.data_hora,
         l.nome,
         'Partidas ' || a.id || ' e ' || b.id || ' no mesmo local e horário'
  from ativas a
  join ativas b on b.data_hora = a.data_hora and b.id > a.id and b.local_id = a.local_id
  join public.locais l on l.id = a.local_id;
$$;

-- ---------------------------------------------------------------------
-- Reordenação segura dos critérios de desempate (admin)
-- ---------------------------------------------------------------------

create or replace function public.fn_definir_desempate(
  p_escopo text,
  p_criterios text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i integer;
begin
  if not public.is_admin() then
    raise exception 'Apenas o administrador pode alterar os critérios de desempate.';
  end if;

  if p_escopo not in ('classificacao_geral', 'taca') then
    raise exception 'Escopo inválido: %', p_escopo;
  end if;

  if p_criterios is null or array_length(p_criterios, 1) is null then
    raise exception 'Informe ao menos um critério.';
  end if;

  delete from public.criterios_desempate where escopo = p_escopo;

  for i in 1..array_length(p_criterios, 1) loop
    insert into public.criterios_desempate (escopo, ordem, criterio)
    values (p_escopo, i, p_criterios[i]);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Classificação esportiva geral (desempate configurável)
-- ---------------------------------------------------------------------

create or replace function public.fn_classificacao_esportiva()
returns table (
  posicao            bigint,
  turma_id           uuid,
  numero             smallint,
  nome_equipe        text,
  cor                text,
  escudo_url         text,
  pontos             numeric,
  ouros              bigint,
  pratas             bigint,
  bronzes            bigint,
  pontos_conduta     numeric,
  empate_persistente boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ordem text;
begin
  select string_agg(
           case criterio
             when 'pontos'  then 'pontos desc'
             when 'ouros'   then 'ouros desc'
             when 'pratas'  then 'pratas desc'
             when 'bronzes' then 'bronzes desc'
             when 'conduta' then 'pontos_conduta asc'
           end,
           ', ' order by ordem)
    into v_ordem
  from public.criterios_desempate
  where escopo = 'classificacao_geral' and ativo;

  v_ordem := coalesce(v_ordem, 'ouros desc, pratas desc, bronzes desc');

  return query execute format($f$
    with validos as (
      select r.turma_id, r.colocacao, pc.pontos
      from public.resultados r
      join public.modalidade_categorias mc on mc.id = r.modalidade_categoria_id
      join public.modalidades m on m.id = mc.modalidade_id
      left join public.pontuacao_colocacao pc on pc.colocacao = r.colocacao and pc.ativo
      where r.status = 'oficial'
        and mc.ativo and m.ativo and m.conta_classificacao_geral
    ),
    base as (
      select t.id as turma_id, t.numero, t.nome_equipe, t.cor, t.escudo_url,
        coalesce((select sum(v.pontos) from validos v where v.turma_id = t.id), 0)::numeric as pontos,
        (select count(*) from validos v where v.turma_id = t.id and v.colocacao = 1) as ouros,
        (select count(*) from validos v where v.turma_id = t.id and v.colocacao = 2) as pratas,
        (select count(*) from validos v where v.turma_id = t.id and v.colocacao = 3) as bronzes,
        coalesce((select sum(c.pontos_desconto) from public.conduta_ocorrencias c
                  where c.turma_id = t.id and c.ativo), 0)::numeric as pontos_conduta
      from public.turmas t
      where t.ativo
    ),
    ranqueado as (
      select b.*, rank() over (order by pontos desc, %s) as posicao
      from base b
    )
    select r.posicao, r.turma_id, r.numero, r.nome_equipe, r.cor, r.escudo_url,
           r.pontos, r.ouros, r.pratas, r.bronzes, r.pontos_conduta,
           (count(*) over (partition by r.posicao) > 1) as empate_persistente
    from ranqueado r
    order by r.posicao, r.numero
  $f$, v_ordem);
end;
$$;

-- ---------------------------------------------------------------------
-- Taça Turma Protagonista (pesos e escala editáveis; publicação opcional)
-- ---------------------------------------------------------------------

create or replace function public.fn_classificacao_taca()
returns table (
  posicao            bigint,
  turma_id           uuid,
  numero             smallint,
  nome_equipe        text,
  cor                text,
  escudo_url         text,
  desempenho_pontos  numeric,
  qualitativos       jsonb,
  conduta_pontos     numeric,
  pontuacao_final    numeric,
  ouros              bigint,
  pratas             bigint,
  empate_persistente boolean,
  formula_completa   boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ordem     text;
  v_publicada boolean;
begin
  select coalesce((valor)::boolean, false) into v_publicada
  from public.configuracoes where chave = 'taca_publicada';

  if not coalesce(v_publicada, false) and not public.is_admin() then
    return;
  end if;

  select string_agg(
           case criterio
             when 'pontos'  then 'pontuacao_final desc'
             when 'ouros'   then 'ouros desc'
             when 'pratas'  then 'pratas desc'
             when 'bronzes' then 'bronzes desc'
             when 'conduta' then 'conduta_pontos asc'
           end,
           ', ' order by ordem)
    into v_ordem
  from public.criterios_desempate
  where escopo = 'taca' and ativo;

  v_ordem := coalesce(v_ordem, 'conduta_pontos asc, ouros desc, pratas desc');

  return query execute format($f$
    with validos as (
      select r.turma_id, r.colocacao, pc.pontos
      from public.resultados r
      join public.modalidade_categorias mc on mc.id = r.modalidade_categoria_id
      join public.modalidades m on m.id = mc.modalidade_id
      left join public.pontuacao_colocacao pc on pc.colocacao = r.colocacao and pc.ativo
      where r.status = 'oficial'
        and mc.ativo and m.ativo and m.conta_taca_desempenho
    ),
    esp as (
      select t.id as turma_id,
        coalesce(sum(v.pontos), 0)::numeric as pontos,
        count(*) filter (where v.colocacao = 1) as ouros,
        count(*) filter (where v.colocacao = 2) as pratas,
        count(*) filter (where v.colocacao = 3) as bronzes
      from public.turmas t
      left join validos v on v.turma_id = t.id
      group by t.id
    ),
    qual as (
      select t.id as turma_id, c.chave, c.peso, c.escala_min, c.escala_max,
        (select avg(n.nota) from public.taca_notas n
          where n.turma_id = t.id and n.criterio_id = c.id) as media
      from public.turmas t
      cross join public.taca_criterios c
      where c.tipo = 'qualitativo' and c.ativo and c.peso is not null
    ),
    qual_agg as (
      select q.turma_id,
        jsonb_object_agg(
          q.chave,
          round(
            coalesce(
              ((q.media - q.escala_min) / nullif(q.escala_max - q.escala_min, 0)) * q.peso,
              0
            ), 2)
        ) as partes,
        coalesce(sum(
          coalesce(((q.media - q.escala_min) / nullif(q.escala_max - q.escala_min, 0)) * q.peso, 0)
        ), 0)::numeric as total
      from qual q
      group by q.turma_id
    ),
    base as (
      select t.id as turma_id, t.numero, t.nome_equipe, t.cor, t.escudo_url,
        e.pontos as desempenho_pontos,
        e.ouros, e.pratas, e.bronzes,
        coalesce((select sum(c.pontos_desconto) from public.conduta_ocorrencias c
                  where c.turma_id = t.id and c.ativo), 0)::numeric as conduta_pontos,
        coalesce(qa.partes, '{}'::jsonb) as qualitativos,
        coalesce(qa.total, 0)::numeric as qual_total,
        coalesce((select peso from public.taca_criterios
                  where chave = 'desempenho_esportivo' and ativo), 0)::numeric as peso_esp,
        coalesce((select sum(peso) from public.taca_criterios
                  where tipo = 'qualitativo' and ativo and peso is not null), 0)::numeric as peso_qual,
        coalesce((select (valor)::numeric from public.configuracoes
                  where chave = 'taca_fator_desconto_conduta'), 1) as fator,
        coalesce((select (valor)::boolean from public.configuracoes
                  where chave = 'taca_normalizar'), true) as normalizar
      from public.turmas t
      left join esp e on e.turma_id = t.id
      left join qual_agg qa on qa.turma_id = t.id
      where t.ativo
    ),
    calc as (
      select b.*, greatest(coalesce(max(b.desempenho_pontos) over (), 0), 0) as max_esp
      from base b
    ),
    final as (
      select c.*,
        case
          when c.normalizar and c.max_esp > 0
            then (coalesce(c.desempenho_pontos, 0) / c.max_esp) * c.peso_esp
          else coalesce(c.desempenho_pontos, 0) * (c.peso_esp / 100.0)
        end
        + coalesce(c.qual_total, 0)
        - coalesce(c.conduta_pontos, 0) * c.fator as pontuacao_final
      from calc c
    ),
    ranqueado as (
      select f.*, rank() over (order by pontuacao_final desc, %s) as posicao
      from final f
    )
    select r.posicao, r.turma_id, r.numero, r.nome_equipe, r.cor, r.escudo_url,
           r.desempenho_pontos, r.qualitativos, r.conduta_pontos,
           round(r.pontuacao_final, 2),
           r.ouros, r.pratas,
           (count(*) over (partition by r.posicao) > 1),
           (r.peso_esp + r.peso_qual) = 100
    from ranqueado r
    order by r.posicao, r.numero
  $f$, v_ordem);
end;
$$;

-- ---------------------------------------------------------------------
-- Views públicas
-- ---------------------------------------------------------------------

-- Turmas sem dados dos representantes (esses ficam só no admin)
create or replace view public.vw_turmas_publicas as
select id, numero, ano, nome_equipe, cor, escudo_url, ativo, ordem
from public.turmas
where ativo;

create or replace view public.vw_classificacao_esportiva as
select * from public.fn_classificacao_esportiva();

create or replace view public.vw_taca_publica as
select * from public.fn_classificacao_taca();

create or replace view public.vw_medalheiro_detalhe as
select
  t.id as turma_id, t.numero, t.nome_equipe, t.cor, t.escudo_url,
  m.nome as modalidade, m.slug, mc.nome as categoria, mc.genero,
  r.colocacao, pc.pontos, r.observacao, r.updated_at
from public.resultados r
join public.modalidade_categorias mc on mc.id = r.modalidade_categoria_id
join public.modalidades m on m.id = mc.modalidade_id
join public.turmas t on t.id = r.turma_id
left join public.pontuacao_colocacao pc on pc.colocacao = r.colocacao and pc.ativo
where r.status = 'oficial' and mc.ativo and m.ativo and r.colocacao <= 3;

create or replace view public.vw_medalheiro as
select
  t.id as turma_id, t.numero, t.nome_equipe, t.cor, t.escudo_url,
  count(*) filter (where d.colocacao = 1) as ouros,
  count(*) filter (where d.colocacao = 2) as pratas,
  count(*) filter (where d.colocacao = 3) as bronzes,
  count(*) filter (where d.colocacao <= 3) as total
from public.turmas t
left join public.vw_medalheiro_detalhe d on d.turma_id = t.id
where t.ativo
group by t.id, t.numero, t.nome_equipe, t.cor, t.escudo_url;

create or replace view public.vw_conduta_turma as
select
  t.id as turma_id, t.numero, t.nome_equipe,
  coalesce(sum(c.pontos_desconto) filter (where c.ativo), 0) as pontos_conduta
from public.turmas t
left join public.conduta_ocorrencias c on c.turma_id = t.id
where t.ativo
group by t.id, t.numero, t.nome_equipe;

create or replace view public.vw_programacao as
select
  p.id, p.data_hora, p.fase, p.rodada, p.status, p.observacoes,
  m.nome as modalidade, m.slug, mc.nome as categoria, mc.genero,
  mc.formato_resultado,
  l.nome as local,
  coalesce(
    (select array_agg(t.numero order by t.numero)
     from public.partida_participantes pp
     join public.turmas t on t.id = pp.turma_id
     where pp.partida_id = p.id),
    '{}'::smallint[]
  ) as turmas
from public.partidas p
join public.modalidade_categorias mc on mc.id = p.modalidade_categoria_id
join public.modalidades m on m.id = mc.modalidade_id
left join public.locais l on l.id = p.local_id;

create or replace view public.vw_resultados_publicos as
select
  r.id, m.nome as modalidade, m.slug, mc.nome as categoria, mc.genero,
  t.numero, t.nome_equipe, t.cor, t.escudo_url,
  r.colocacao, pc.pontos, r.observacao, r.updated_at
from public.resultados r
join public.modalidade_categorias mc on mc.id = r.modalidade_categoria_id
join public.modalidades m on m.id = mc.modalidade_id
join public.turmas t on t.id = r.turma_id
left join public.pontuacao_colocacao pc on pc.colocacao = r.colocacao and pc.ativo
where r.status = 'oficial' and mc.ativo and m.ativo;

create or replace view public.vw_participantes_publico as
select
  i.id as inscricao_id,
  t.numero, t.nome_equipe as turma_equipe, t.cor,
  i.nome_equipe,
  m.nome as modalidade, m.slug,
  mc.nome as categoria, mc.genero,
  i.tipo,
  coalesce(
    (select array_agg(public.nome_publico(e.nome_completo) order by e.nome_completo)
     from public.inscricao_participantes ip
     join public.estudantes e on e.id = ip.estudante_id
     where ip.inscricao_id = i.id),
    '{}'::text[]
  ) as participantes
from public.inscricoes i
join public.turmas t on t.id = i.turma_id
join public.modalidade_categorias mc on mc.id = i.modalidade_categoria_id
join public.modalidades m on m.id = mc.modalidade_id
where i.status = 'aprovada' and mc.ativo and m.ativo;
