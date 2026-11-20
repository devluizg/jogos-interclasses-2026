-- =====================================================================
-- 0012 - Partidas individuais: atleta vs atleta e mesas de 4 atletas
-- =====================================================================
-- Uma linha de partida_participantes pode representar:
--   * uma TURMA inteira (estudante_id nulo) -> modalidades coletivas/equipe;
--   * um ATLETA específico (estudante_id preenchido) -> modalidades
--     individuais, como xadrez, tênis de mesa, baralho, UNO e dominó.
-- A classificação esportiva continua sendo calculada pela tabela
-- `resultados` (por turma); esta mudança afeta apenas a "ficha" da partida,
-- ou seja, quem compete contra quem e os placares/posições de cada mesa.

-- 1) Coluna do atleta ---------------------------------------------------

alter table public.partida_participantes
  add column if not exists estudante_id uuid
    references public.estudantes(id) on delete restrict;

create index if not exists idx_partida_participantes_estudante
  on public.partida_participantes(estudante_id);

-- Antes havia no máximo uma linha por turma em cada partida. Em mesas e em
-- atleta vs atleta é normal que vários atletas da mesma turma compitam na
-- mesma partida, então trocamos a restrição por duas únicas parciais:
--   - uma linha por turma quando o participante é a turma;
--   - um atleta, no máximo uma vez por partida.
alter table public.partida_participantes
  drop constraint if exists partida_participantes_partida_id_turma_id_key;

create unique index if not exists uq_pp_partida_turma
  on public.partida_participantes(partida_id, turma_id)
  where estudante_id is null;

create unique index if not exists uq_pp_partida_estudante
  on public.partida_participantes(partida_id, estudante_id)
  where estudante_id is not null;

-- 2) Mantém a turma do participante atleta sempre consistente -----------

create or replace function public.fn_partida_participantes_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_turma uuid;
begin
  if new.estudante_id is not null then
    select turma_id into v_turma
    from public.estudantes
    where id = new.estudante_id;

    if v_turma is null then
      raise exception 'Atleta não encontrado. Cadastre o atleta antes de incluí-lo na partida.';
    end if;

    new.turma_id := v_turma;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_partida_participantes_guard on public.partida_participantes;
create trigger trg_partida_participantes_guard
before insert or update on public.partida_participantes
for each row execute function public.fn_partida_participantes_guard();

-- 3) Programação pública: expõe atletas e o tipo da modalidade ----------
-- As colunas novas são acrescentadas no final para respeitar o contrato do
-- CREATE OR REPLACE VIEW (a ordem das colunas existentes não pode mudar).

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
  ) as atletas
from public.partidas p
join public.modalidade_categorias mc on mc.id = p.modalidade_categoria_id
join public.modalidades m on m.id = mc.modalidade_id
left join public.locais l on l.id = p.local_id;

-- 4) Conflito de "mesma turma em duas partidas" só vale para linhas do
--    tipo turma. Atletas diferentes da mesma turma podem competir ao mesmo
--    tempo em mesas distintas.

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
  select 'local'::text, a.data_hora,
         l.nome,
         'Partidas ' || a.id || ' e ' || b.id || ' no mesmo local e horário'
  from ativas a
  join ativas b on b.data_hora = a.data_hora and b.id > a.id and b.local_id = a.local_id
  join public.locais l on l.id = a.local_id;
$$;
