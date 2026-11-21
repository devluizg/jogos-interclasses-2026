-- =====================================================================
-- 0013 - Consolidação de partidas individuais, mesas (até 4) e programação
-- =====================================================================
-- Esta migration é idempotente e complementar à 0012_partidas_atletas.sql:
--   1) Garante a coluna e FK partida_participantes.estudante_id -> estudantes(id)
--      e os índices únicos parciais (impedindo duplicados e permitindo atletas
--      da mesma turma em confrontos individuais e mesas).
--   2) Reforça na trigger fn_partida_participantes_guard():
--      - preenchimento automático de turma_id a partir do estudante;
--      - bloqueio de mistura entre turmas e atletas na mesma partida;
--      - limite máximo de 4 atletas em mesas (baralho, UNO, dominó);
--      - limite máximo de 2 atletas em confrontos individuais diretos (1×1).
--   3) Enriquece vw_programacao com a coluna `participantes` (jsonb) contendo
--      nome público (LGPD), número da turma, placar, tempo, pontuação, posição
--      e vencedor — sem alterar a ordem das colunas existentes.
--   4) Amplia fn_conflitos_horario() para alertar também quando o mesmo atleta
--      estiver escalado em duas partidas no mesmo horário.
--   5) Solicita recarregamento do schema cache do PostgREST.

-- 1) Garantia idempotente da FK e índices de partida_participantes ------

alter table public.partida_participantes
  add column if not exists estudante_id uuid
    references public.estudantes(id) on delete restrict;

create index if not exists idx_partida_participantes_estudante
  on public.partida_participantes(estudante_id);

alter table public.partida_participantes
  drop constraint if exists partida_participantes_partida_id_turma_id_key;

create unique index if not exists uq_pp_partida_turma
  on public.partida_participantes(partida_id, turma_id)
  where estudante_id is null;

create unique index if not exists uq_pp_partida_estudante
  on public.partida_participantes(partida_id, estudante_id)
  where estudante_id is not null;

-- 2) Validações de consistência por formato da modalidade ---------------

create or replace function public.fn_partida_participantes_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_turma            uuid;
  v_slug             text;
  v_tipo             text;
  v_formato          text;
  v_mod_nome         text;
  v_outros_total     integer := 0;
  v_outros_atletas   integer := 0;
  v_outros_turmas    integer := 0;
  v_self_id          uuid := coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);
begin
  if new.estudante_id is not null then
    select e.turma_id into v_turma
    from public.estudantes e
    where e.id = new.estudante_id;

    if v_turma is null then
      raise exception 'Atleta não encontrado. Cadastre o atleta antes de incluí-lo na partida.';
    end if;

    new.turma_id := v_turma;
  end if;

  select m.slug, m.tipo, mc.formato_resultado, m.nome
    into v_slug, v_tipo, v_formato, v_mod_nome
  from public.partidas p
  join public.modalidade_categorias mc on mc.id = p.modalidade_categoria_id
  join public.modalidades m on m.id = mc.modalidade_id
  where p.id = new.partida_id;

  select count(*),
         count(*) filter (where pp.estudante_id is not null),
         count(*) filter (where pp.estudante_id is null)
    into v_outros_total, v_outros_atletas, v_outros_turmas
  from public.partida_participantes pp
  where pp.partida_id = new.partida_id
    and pp.id <> v_self_id;

  if new.estudante_id is not null and v_outros_turmas > 0 then
    raise exception 'Não é possível misturar turmas e atletas individuais na mesma partida.';
  end if;

  if new.estudante_id is null and v_outros_atletas > 0 then
    raise exception 'Não é possível misturar turmas e atletas individuais na mesma partida.';
  end if;

  -- Mesas (baralho, UNO e dominó): somente atletas, até 4 por mesa.
  if v_slug in ('baralho', 'uno', 'domino') then
    if new.estudante_id is null then
      raise exception 'Em %, selecione os atletas da mesa (até 4 participantes) em vez de turmas.', v_mod_nome;
    end if;
    if v_outros_total >= 4 then
      raise exception 'Mesas de % aceitam no máximo 4 atletas por partida.', v_mod_nome;
    end if;
  -- Confrontos individuais diretos (atleta vs. atleta, excluindo provas de tempo).
  elsif v_tipo = 'individual' and coalesce(v_formato, '') <> 'tempo' and new.estudante_id is not null then
    if v_outros_total >= 2 then
      raise exception 'Partidas individuais de % aceitam no máximo 2 atletas (confronto 1×1).', v_mod_nome;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_partida_participantes_guard on public.partida_participantes;
create trigger trg_partida_participantes_guard
before insert or update on public.partida_participantes
for each row execute function public.fn_partida_participantes_guard();

-- 3) Programação pública: mantém colunas existentes e adiciona detalhes -
-- A nova coluna `participantes` é adicionada ao final para manter o
-- contrato do CREATE OR REPLACE VIEW.

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
     where pp.partida_id = p.id and pp.estudante_id is null),
    '{}'::smallint[]
  ) as turmas,
  m.tipo as modalidade_tipo,
  coalesce(
    (select array_agg(public.nome_publico(e.nome_completo) order by e.nome_completo)
     from public.partida_participantes pp
     join public.estudantes e on e.id = pp.estudante_id
     where pp.partida_id = p.id),
    '{}'::text[]
  ) as atletas,
  coalesce(
    (select jsonb_agg(
       jsonb_build_object(
         'tipo', case when pp.estudante_id is not null then 'atleta' else 'turma' end,
         'nome', case
                   when pp.estudante_id is not null then public.nome_publico(e.nome_completo)
                   else coalesce(nullif(trim(t.nome_equipe), ''), 'Turma ' || t.numero)
                 end,
         'turma_numero', t.numero,
         'turma_equipe', t.nome_equipe,
         'placar', pp.placar,
         'tempo', pp.tempo,
         'pontuacao', pp.pontuacao,
         'posicao', pp.posicao,
         'vencedor', pp.vencedor
       )
       order by pp.posicao asc nulls last, pp.vencedor desc nulls last, pp.created_at asc, pp.id asc
     )
     from public.partida_participantes pp
     join public.turmas t on t.id = pp.turma_id
     left join public.estudantes e on e.id = pp.estudante_id
     where pp.partida_id = p.id),
    '[]'::jsonb
  ) as participantes
from public.partidas p
join public.modalidade_categorias mc on mc.id = p.modalidade_categoria_id
join public.modalidades m on m.id = mc.modalidade_id
left join public.locais l on l.id = p.local_id;

grant select on public.vw_programacao to anon, authenticated;

-- 4) Conflitos de horário: inclui também mesmo atleta no mesmo horário --

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
  join public.partida_participantes pa
    on pa.partida_id = a.id and pa.estudante_id is null
  join public.partida_participantes pb
    on pb.partida_id = b.id and pb.turma_id = pa.turma_id and pb.estudante_id is null
  join public.turmas t on t.id = pa.turma_id
  union
  select 'atleta'::text, a.data_hora,
         e.nome_completo || ' (T' || t.numero || ')',
         'Partidas ' || a.id || ' e ' || b.id || ' no mesmo horário'
  from ativas a
  join ativas b on b.data_hora = a.data_hora and b.id > a.id
  join public.partida_participantes pa
    on pa.partida_id = a.id and pa.estudante_id is not null
  join public.partida_participantes pb
    on pb.partida_id = b.id and pb.estudante_id = pa.estudante_id
  join public.estudantes e on e.id = pa.estudante_id
  join public.turmas t on t.id = e.turma_id
  union
  select 'local'::text, a.data_hora,
         l.nome,
         'Partidas ' || a.id || ' e ' || b.id || ' no mesmo local e horário'
  from ativas a
  join ativas b on b.data_hora = a.data_hora and b.id > a.id and b.local_id = a.local_id
  join public.locais l on l.id = a.local_id;
$$;

-- 5) Atualiza o schema cache do PostgREST (Supabase REST API) -----------

notify pgrst, 'reload schema';
