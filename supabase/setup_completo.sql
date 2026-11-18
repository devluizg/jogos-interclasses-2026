-- =====================================================================
-- SETUP COMPLETO - Jogos Interclasses 2026
-- Cole TODO este arquivo no SQL Editor do Supabase e execute uma vez.
-- Ordem: 0001 a 0008. Depois crie o usuario admin em Authentication.
-- =====================================================================


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- supabase/migrations/0001_schema.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================================
-- Jogos Interclasses 2026 - Escola Estadual Celso Rodrigues
-- 0001 - Estrutura base (tabelas, constraints e índices)
-- Nenhuma regra de negócio fica fixa no código: limites, pontos,
-- desempates e pesos vivem nas tabelas abaixo e são editáveis no admin.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Administradores (espelha auth.users; login único, sem cadastro)
-- ---------------------------------------------------------------------

create table public.admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  created_at  timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Configurações gerais (chave/valor, tudo editável)
-- ---------------------------------------------------------------------

create table public.configuracoes (
  chave         text primary key,
  valor         jsonb not null,
  descricao     text,
  updated_at    timestamptz not null default now()
);

create trigger trg_configuracoes_updated_at
before update on public.configuracoes
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Pontuação e desempate (editáveis no admin)
-- ---------------------------------------------------------------------

create table public.pontuacao_colocacao (
  colocacao  smallint primary key check (colocacao > 0),
  pontos     numeric(8,2) not null check (pontos >= 0),
  ativo      boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger trg_pontuacao_colocacao_updated_at
before update on public.pontuacao_colocacao
for each row execute function public.set_updated_at();

create table public.criterios_desempate (
  id       uuid primary key default gen_random_uuid(),
  escopo   text not null check (escopo in ('classificacao_geral','taca')),
  ordem    smallint not null check (ordem > 0),
  criterio text not null check (criterio in ('pontos','ouros','pratas','bronzes','conduta')),
  ativo    boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (escopo, ordem)
);

create trigger trg_criterios_desempate_updated_at
before update on public.criterios_desempate
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Turmas
-- ---------------------------------------------------------------------

create table public.turmas (
  id             uuid primary key default gen_random_uuid(),
  numero         smallint not null unique check (numero between 100 and 999),
  ano            smallint generated always as ((numero / 100)::smallint) stored,
  nome_equipe    text,
  cor            text,
  escudo_url     text,
  representante1 text,
  representante2 text,
  ativo          boolean not null default true,
  ordem          smallint,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger trg_turmas_updated_at
before update on public.turmas
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Estudantes (nunca expostos diretamente ao público)
-- ---------------------------------------------------------------------

create table public.estudantes (
  id             uuid primary key default gen_random_uuid(),
  turma_id       uuid not null references public.turmas(id) on delete restrict,
  nome_completo  text not null check (length(trim(nome_completo)) > 0),
  genero         text not null default 'nao_informado'
                 check (genero in ('feminino','masculino','outro','nao_informado')),
  taxa_paga      boolean not null default false,
  ativo          boolean not null default true,
  observacoes    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_estudantes_turma on public.estudantes(turma_id);

create trigger trg_estudantes_updated_at
before update on public.estudantes
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Locais e dias do evento
-- ---------------------------------------------------------------------

create table public.locais (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null unique,
  descricao  text,
  ativo      boolean not null default true,
  ordem      smallint,
  created_at timestamptz not null default now()
);

create table public.dias_evento (
  id          uuid primary key default gen_random_uuid(),
  data        date not null unique,
  titulo      text not null,
  descricao   text,
  ordem       smallint not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_dias_evento_updated_at
before update on public.dias_evento
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Modalidades e categorias
-- ---------------------------------------------------------------------

create table public.modalidades (
  id                       uuid primary key default gen_random_uuid(),
  slug                     text not null unique,
  nome                     text not null,
  eixo                     text not null,
  tipo                     text not null default 'equipe'
                           check (tipo in ('coletiva','individual','equipe','apresentacao')),
  descricao                text,
  regras_especificas       text,
  conta_classificacao_geral boolean not null default true,
  conta_taca_desempenho    boolean not null default true,
  ativo                    boolean not null default true,
  ordem                    smallint,
  a_confirmar              boolean not null default false,
  nota_admin               text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create trigger trg_modalidades_updated_at
before update on public.modalidades
for each row execute function public.set_updated_at();

-- Cada linha é uma categoria/gênero de uma modalidade: é a unidade
-- de premiação e de pontuação (100/50/25).
create table public.modalidade_categorias (
  id                       uuid primary key default gen_random_uuid(),
  modalidade_id            uuid not null references public.modalidades(id) on delete cascade,
  nome                     text not null,
  genero                   text not null check (genero in ('masculino','feminino','mista','unica')),
  formato_resultado        text not null default 'posicao'
                           check (formato_resultado in ('placar','tempo','pontuacao','posicao')),
  max_equipes_por_turma    smallint check (max_equipes_por_turma > 0),
  tamanho_equipe_min       smallint check (tamanho_equipe_min > 0),
  tamanho_equipe_max       smallint check (tamanho_equipe_max > 0),
  max_participantes_por_turma smallint check (max_participantes_por_turma > 0),
  min_participantes_partida smallint check (min_participantes_partida > 0),
  min_feminino             smallint check (min_feminino >= 0),
  min_masculino            smallint check (min_masculino >= 0),
  min_percentual_feminino  numeric(5,2) check (min_percentual_feminino between 0 and 100),
  vagas_premiadas          smallint check (vagas_premiadas > 0),
  ativo                    boolean not null default true,
  a_confirmar              boolean not null default false,
  observacao               text,
  ordem                    smallint,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (modalidade_id, nome),
  constraint chk_tamanho_equipe check (
    tamanho_equipe_max is null or tamanho_equipe_min is null
    or tamanho_equipe_max >= tamanho_equipe_min
  )
);

create index idx_categorias_modalidade on public.modalidade_categorias(modalidade_id);

create trigger trg_categorias_updated_at
before update on public.modalidade_categorias
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Inscrições
-- ---------------------------------------------------------------------

create table public.inscricoes (
  id                      uuid primary key default gen_random_uuid(),
  modalidade_categoria_id uuid not null references public.modalidade_categorias(id) on delete restrict,
  turma_id                uuid not null references public.turmas(id) on delete restrict,
  tipo                    text not null default 'equipe' check (tipo in ('individual','equipe')),
  nome_equipe             text,
  status                  text not null default 'pendente'
                          check (status in ('pendente','aprovada','rejeitada','cancelada')),
  observacoes             text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index idx_inscricoes_categoria_turma
  on public.inscricoes(modalidade_categoria_id, turma_id);

create trigger trg_inscricoes_updated_at
before update on public.inscricoes
for each row execute function public.set_updated_at();

create table public.inscricao_participantes (
  id            uuid primary key default gen_random_uuid(),
  inscricao_id  uuid not null references public.inscricoes(id) on delete cascade,
  estudante_id  uuid not null references public.estudantes(id) on delete restrict,
  created_at    timestamptz not null default now(),
  unique (inscricao_id, estudante_id)
);

create index idx_participantes_estudante on public.inscricao_participantes(estudante_id);

-- ---------------------------------------------------------------------
-- Programação e partidas
-- ---------------------------------------------------------------------

create table public.partidas (
  id                      uuid primary key default gen_random_uuid(),
  modalidade_categoria_id uuid not null references public.modalidade_categorias(id) on delete restrict,
  fase                    text not null default 'classificatoria',
  rodada                  smallint,
  data_hora               timestamptz,
  local_id                uuid references public.locais(id) on delete set null,
  status                  text not null default 'programado'
                          check (status in ('programado','em_andamento','concluido','adiado','wo','cancelado')),
  observacoes             text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index idx_partidas_categoria on public.partidas(modalidade_categoria_id);
create index idx_partidas_data on public.partidas(data_hora);

create trigger trg_partidas_updated_at
before update on public.partidas
for each row execute function public.set_updated_at();

create table public.partida_participantes (
  id           uuid primary key default gen_random_uuid(),
  partida_id   uuid not null references public.partidas(id) on delete cascade,
  turma_id     uuid not null references public.turmas(id) on delete restrict,
  inscricao_id uuid references public.inscricoes(id) on delete set null,
  placar       smallint,
  tempo        numeric(10,2),
  pontuacao    numeric(10,2),
  posicao      smallint,
  vencedor     boolean,
  observacao   text,
  created_at   timestamptz not null default now(),
  unique (partida_id, turma_id)
);

create index idx_partida_participantes_turma on public.partida_participantes(turma_id);

-- ---------------------------------------------------------------------
-- Resultados oficiais (fonte da classificação e do medalheiro)
-- Guardamos apenas a colocação; os pontos vêm da tabela
-- pontuacao_colocacao, então mudar a pontuação recalcula tudo.
-- ---------------------------------------------------------------------

create table public.resultados (
  id                      uuid primary key default gen_random_uuid(),
  modalidade_categoria_id uuid not null references public.modalidade_categorias(id) on delete restrict,
  turma_id                uuid not null references public.turmas(id) on delete restrict,
  colocacao               smallint not null check (colocacao > 0),
  status                  text not null default 'rascunho'
                          check (status in ('rascunho','oficial','anulado')),
  observacao              text,
  criado_por              uuid,
  atualizado_por          uuid,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create unique index uq_resultado_turma_categoria
  on public.resultados(modalidade_categoria_id, turma_id)
  where status <> 'anulado';

create unique index uq_resultado_colocacao_categoria
  on public.resultados(modalidade_categoria_id, colocacao)
  where status <> 'anulado';

create index idx_resultados_turma on public.resultados(turma_id);

create trigger trg_resultados_updated_at
before update on public.resultados
for each row execute function public.set_updated_at();

create table public.resultados_historico (
  id               uuid primary key default gen_random_uuid(),
  resultado_id     uuid not null,
  acao             text not null,
  dados_anteriores jsonb,
  dados_novos      jsonb,
  usuario_id       uuid,
  created_at       timestamptz not null default now()
);

create index idx_resultados_hist_resultado on public.resultados_historico(resultado_id);

-- ---------------------------------------------------------------------
-- Conduta (descontos usados na Taça e exibidos à parte)
-- ---------------------------------------------------------------------

create table public.conduta_ocorrencias (
  id              uuid primary key default gen_random_uuid(),
  turma_id        uuid not null references public.turmas(id) on delete restrict,
  data            date not null default current_date,
  descricao       text not null,
  pontos_desconto numeric(8,2) not null default 0 check (pontos_desconto >= 0),
  responsavel     text,
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_conduta_turma on public.conduta_ocorrencias(turma_id);

create trigger trg_conduta_updated_at
before update on public.conduta_ocorrencias
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Taça Turma Protagonista
-- Critérios, pesos, escalas e notas de jurados - tudo editável.
-- ---------------------------------------------------------------------

create table public.taca_criterios (
  id         uuid primary key default gen_random_uuid(),
  chave      text not null unique,
  nome       text not null,
  tipo       text not null check (tipo in ('esportivo','qualitativo','desconto')),
  peso       numeric(6,2) check (peso is null or peso >= 0),
  escala_min numeric(6,2) not null default 0,
  escala_max numeric(6,2) not null default 10,
  a_definir boolean not null default false,
  ordem      smallint,
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_escala check (escala_max > escala_min)
);

create trigger trg_taca_criterios_updated_at
before update on public.taca_criterios
for each row execute function public.set_updated_at();

create table public.taca_jurados (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.taca_notas (
  id          uuid primary key default gen_random_uuid(),
  jurado_id   uuid not null references public.taca_jurados(id) on delete cascade,
  turma_id    uuid not null references public.turmas(id) on delete cascade,
  criterio_id uuid not null references public.taca_criterios(id) on delete cascade,
  nota        numeric(6,2) not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (jurado_id, turma_id, criterio_id)
);

create trigger trg_taca_notas_updated_at
before update on public.taca_notas
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Conteúdo público
-- ---------------------------------------------------------------------

create table public.noticias (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  slug        text not null unique,
  resumo      text,
  conteudo    text,
  publicada   boolean not null default false,
  publicado_em timestamptz,
  autor       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_noticias_updated_at
before update on public.noticias
for each row execute function public.set_updated_at();

create table public.documentos (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  tipo          text not null default 'outro'
                check (tipo in ('regulamento','anexo','projeto','outro')),
  modalidade_id uuid references public.modalidades(id) on delete set null,
  arquivo_url   text,
  ordem         smallint,
  publico       boolean not null default true,
  created_at    timestamptz not null default now()
);

create index idx_documentos_modalidade on public.documentos(modalidade_id);

-- ---------------------------------------------------------------------
-- Auditoria genérica
-- ---------------------------------------------------------------------

create table public.auditoria (
  id               bigserial primary key,
  tabela           text not null,
  registro_id      text,
  acao             text not null,
  dados_anteriores jsonb,
  dados_novos      jsonb,
  usuario_id       uuid,
  created_at       timestamptz not null default now()
);

create or replace function public.fn_auditar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
begin
  v_id := coalesce(
    (to_jsonb(coalesce(new, old)) ->> 'id'),
    (to_jsonb(coalesce(new, old)) ->> 'chave')
  );

  insert into public.auditoria (tabela, registro_id, acao, dados_anteriores, dados_novos, usuario_id)
  values (
    tg_table_name,
    v_id,
    case tg_op when 'INSERT' then 'criado' when 'UPDATE' then 'alterado' else 'removido' end,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
    auth.uid()
  );

  return coalesce(new, old);
end;
$$;

create trigger trg_auditoria_configuracoes
after insert or update or delete on public.configuracoes
for each row execute function public.fn_auditar();

create trigger trg_auditoria_turmas
after insert or update or delete on public.turmas
for each row execute function public.fn_auditar();

create trigger trg_auditoria_modalidades
after insert or update or delete on public.modalidades
for each row execute function public.fn_auditar();

create trigger trg_auditoria_categorias
after insert or update or delete on public.modalidade_categorias
for each row execute function public.fn_auditar();

create trigger trg_auditoria_inscricoes
after insert or update or delete on public.inscricoes
for each row execute function public.fn_auditar();

create trigger trg_auditoria_partidas
after insert or update or delete on public.partidas
for each row execute function public.fn_auditar();

create trigger trg_auditoria_conduta
after insert or update or delete on public.conduta_ocorrencias
for each row execute function public.fn_auditar();

create trigger trg_auditoria_taca_notas
after insert or update or delete on public.taca_notas
for each row execute function public.fn_auditar();


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- supabase/migrations/0002_funcoes_validacoes_views.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- supabase/migrations/0003_rls_grants_realtime.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- supabase/migrations/0004_seed.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================================
-- 0004 - Seed inicial (valores dos documentos oficiais)
-- Tudo aqui é editável no painel. Nenhum horário, resultado, estudante,
-- escudo ou campeão é inventado.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Configurações gerais
-- ---------------------------------------------------------------------

insert into public.configuracoes (chave, valor, descricao) values
  ('evento_nome', '"Jogos Interclasses 2026 – Escola Estadual Celso Rodrigues"'::jsonb, 'Nome oficial do evento'),
  ('evento_tema', '"Do jogo limpo à consciência ambiental: jogos interclasses 2026, a escola como espaço e vivência cidadã."'::jsonb, 'Tema oficial'),
  ('evento_local', '"Escola Estadual Celso Rodrigues – Santo Antônio do Tauá/PA"'::jsonb, 'Local'),
  ('evento_inicio', '"2026-11-24"'::jsonb, 'Data de início (AAAA-MM-DD)'),
  ('evento_fim', '"2026-11-27"'::jsonb, 'Data de encerramento (AAAA-MM-DD)'),
  ('fuso', '"America/Belem"'::jsonb, 'Fuso horário de exibição'),
  ('evento_sobre', '"Os Jogos Interclasses da Escola Estadual Celso Rodrigues promovem integração, prática esportiva, cultura, inclusão e protagonismo estudantil, reunindo estudantes do 1º, 2º e 3º anos do Ensino Médio."'::jsonb, 'Texto da página Sobre'),
  ('tolerancia_minutos', '10'::jsonb, 'Tolerância antes de W.O. (Regulamento Geral, art. 15)'),
  ('taca_nome', '"Taça Turma Protagonista"'::jsonb, 'Nome do prêmio paralelo (editável)'),
  ('taca_publicada', 'false'::jsonb, 'Publica o ranking da Taça no portal'),
  ('taca_normalizar', 'true'::jsonb, 'Normaliza o desempenho esportivo antes de aplicar o peso'),
  ('taca_fator_desconto_conduta', '1'::jsonb, 'Fator aplicado aos pontos de conduta descontados na Taça'),
  ('taca_observacao_pesos', '"O Regulamento Geral (art. 13) define 40% desempenho, 25% participação e 35% protagonismo cultural. O Anexo XIX lista ainda Identificação da turma, sem peso próprio. O regulamento não define escala nem fórmula: o cálculo provisório (editável) normaliza o desempenho pelo maior valor entre as turmas, aplica o peso, soma as médias qualitativas normalizadas pela escala e subtrai os descontos de conduta pelo fator configurado. Ajuste pesos e escalas no painel; a soma dos pesos deve fechar 100%."'::jsonb, 'Observação sobre os pesos da Taça'),
  ('taxa_inscricao_ativa', 'false'::jsonb, 'Cobra taxa de inscrição? (Regulamento diz gratuita; Projeto cita R$ 5,00)'),
  ('taxa_inscricao_valor', '5.00'::jsonb, 'Valor da taxa, se ativada'),
  ('taxa_inscricao_observacao', $json$"Divergência: o Regulamento Geral (art. 4º) define inscrição gratuita; o Projeto Executivo cita R$ 5,00. O campo \"taxa paga\" existe no cadastro de estudantes e a cobrança está desativada por padrão."$json$::jsonb, 'Conflito documentado'),
  ('permitir_varias_modalidades', 'true'::jsonb, 'Permite o mesmo estudante em modalidades diferentes (art. 7º)'),
  ('limite_modalidades_por_estudante', 'null'::jsonb, 'Limite de modalidades por estudante (null = sem limite)'),
  ('exibir_nome', '"primeiro_nome_inicial"'::jsonb, 'Formato de exibição pública dos nomes (LGPD)'),
  ('fase2_chaves_automaticas', 'false'::jsonb, 'Fase 2: geração automática de chaves'),
  ('fase2_pwa', 'false'::jsonb, 'Fase 2: PWA/offline'),
  ('fase2_galeria', 'false'::jsonb, 'Fase 2: galeria de fotos'),
  ('fase2_professores', 'false'::jsonb, 'Fase 2: perfis de professor por modalidade'),
  ('divergencias_documentos', $json$[
    {"tema":"Free Fire x Mortal Kombat","resolucao":"Usar Free Fire (Regulamento prevalece); modalidade pode ser trocada no painel."},
    {"tema":"Desempate da classificação geral","resolucao":"Art. 12: ouros, pratas, bronzes. Anexo XIX (Taça): conduta, ouros, pratas. Ordem editável por ranking."},
    {"tema":"FIFA 26","resolucao":"Texto diz \"até 5 (três)\". Assumido 3 participantes por turma (editável no painel)."},
    {"tema":"Nome do prêmio","resolucao":"Usar \"Turma Protagonista\" (Regulamento); nome editável."},
    {"tema":"Corrida","resolucao":"Distância por gênero: feminino 1.100 m; masculino 2.200 m."},
    {"tema":"Duração do evento","resolucao":"Quatro dias (24 a 27/11/2026)."},
    {"tema":"Taxa de inscrição","resolucao":"Regulamento diz gratuita; Projeto cita R$ 5,00. Cobrança desativada por padrão."}
  ]$json$::jsonb, 'Conflitos conhecidos entre os documentos')
on conflict (chave) do nothing;

-- ---------------------------------------------------------------------
-- Turmas (10)
-- ---------------------------------------------------------------------

insert into public.turmas (numero, ordem) values
  (101, 1), (102, 2), (103, 3), (104, 4),
  (201, 5), (202, 6), (203, 7), (204, 8),
  (301, 9), (302, 10)
on conflict (numero) do nothing;

-- ---------------------------------------------------------------------
-- Locais
-- ---------------------------------------------------------------------

insert into public.locais (nome, descricao, ordem) values
  ('Quadra Poliesportiva', 'Futsal, voleibol, basquete 3x3 e queimada', 1),
  ('Pátio Escolar', 'Abertura, desfile, torcida e atividades culturais', 2),
  ('Laboratório de Informática', 'Quiz interdisciplinar, FIFA 26 e Free Fire', 3),
  ('Salas de Aula', 'Xadrez, damas, dominó, UNO, baralho e tênis de mesa', 4),
  ('Refeitório', 'Apoio e atividades recreativas', 5),
  ('Espaço de Coordenação', 'Organização, atendimento e ocorrências', 6)
on conflict (nome) do nothing;

-- ---------------------------------------------------------------------
-- Dias do evento (apenas temas; horários e jogos ficam vazios)
-- ---------------------------------------------------------------------

insert into public.dias_evento (data, titulo, descricao, ordem) values
  ('2026-11-24', 'Abertura e início das competições',
   'Cerimônia oficial de abertura, desfile das delegações, manifestações culturais e início das fases classificatórias.', 1),
  ('2026-11-25', 'Competições e integração',
   'Continuidade das classificatórias, jogos intelectuais, atividades recreativas, adaptadas e e-sports.', 2),
  ('2026-11-26', 'Semifinais e disputas decisivas',
   'Semifinais de futsal e voleibol; finais das demais modalidades e atividades de integração.', 3),
  ('2026-11-27', 'Aniversário da escola, finais e premiação',
   'Programação do aniversário da escola, finais de futsal e voleibol, desfile ecológico, classificação geral, premiação e encerramento.', 4)
on conflict (data) do nothing;

-- ---------------------------------------------------------------------
-- Pontuação e desempate
-- ---------------------------------------------------------------------

insert into public.pontuacao_colocacao (colocacao, pontos) values
  (1, 100), (2, 50), (3, 25)
on conflict (colocacao) do nothing;

insert into public.criterios_desempate (escopo, ordem, criterio) values
  ('classificacao_geral', 1, 'ouros'),
  ('classificacao_geral', 2, 'pratas'),
  ('classificacao_geral', 3, 'bronzes'),
  ('taca', 1, 'conduta'),
  ('taca', 2, 'ouros'),
  ('taca', 3, 'pratas')
on conflict (escopo, ordem) do nothing;

-- ---------------------------------------------------------------------
-- Modalidades
-- ---------------------------------------------------------------------

insert into public.modalidades
  (slug, nome, eixo, tipo, descricao, regras_especificas,
   conta_classificacao_geral, conta_taca_desempenho, ordem, a_confirmar, nota_admin)
values
  ('futsal', 'Futsal', 'Esportivo coletivo', 'coletiva',
   'Disputa em duas categorias, masculino e feminino, com uma equipe por turma e até 8 atletas.',
   'Dois tempos de 10 minutos corridos, intervalo de 5 minutos; 5 atletas em quadra, incluindo goleiro; substituições ilimitadas; tolerância de 10 minutos; premiação de 1º a 3º.',
   true, true, 1, false, null),
  ('corrida', 'Corrida', 'Esportivo individual', 'individual',
   'Prova de velocidade em duas categorias, masculino e feminino.',
   'Feminino: 1.100 m; masculino: 2.200 m. Até 5 atletas por categoria. Vence o menor tempo; nova bateria pode ser realizada em caso de empate que altere a classificação.',
   true, true, 2, false, null),
  ('voleibol', 'Voleibol', 'Esportivo coletivo', 'coletiva',
   'Categoria única mista, uma equipe por turma, até 8 atletas.',
   'Melhor de 3 sets (25, 25 e 15 pontos, diferença mínima de 2); 6 em quadra, sendo 4 homens e 2 mulheres; mínimo de 6 atletas para jogar.',
   true, true, 3, false, null),
  ('queimada', 'Queimada', 'Recreativo e inclusivo', 'coletiva',
   'Categoria única mista, uma equipe de 8 participantes por turma.',
   'Mínimo de 50% de mulheres; premia apenas 1º e 2º lugares; tolerância de 10 minutos; objetivo de eliminar adversários com lançamentos válidos.',
   true, true, 4, false, null),
  ('xadrez', 'Xadrez', 'Intelectual', 'individual',
   'Duas categorias, masculino e feminino, até 5 estudantes por categoria.',
   'Sistema suíço ou todos contra todos; emparceiramento por sorteio; tempo de reflexão definido pela organização; proibido uso de dispositivos eletrônicos.',
   true, true, 5, false, null),
  ('damas', 'Damas', 'Intelectual', 'individual',
   'Duas categorias, masculino e feminino, até 5 estudantes por categoria.',
   'Sistema suíço, grupos ou todos contra todos; tabuleiro homologado; tempo e critérios de classificação definidos pela organização.',
   true, true, 6, false, null),
  ('cubo-magico', 'Cubo Mágico', 'Intelectual', 'individual',
   'Duas categorias, masculino e feminino, até 10 estudantes por categoria.',
   'Vence o menor tempo válido (ou média de tempos, se adotada e divulgada); cubo fornecido ou homologado; tentativa pode ser invalidada por descumprimento das orientações.',
   true, true, 7, false, null),
  ('basquete-3x3', 'Basquete 3x3', 'Esportivo coletivo', 'coletiva',
   'Duas categorias, masculino e feminino, uma equipe por turma com até 4 atletas.',
   'Partida de 10 minutos corridos ou até 21 pontos; 3 em quadra; cesta dentro do arco vale 1 e fora vale 2; empate vai para prorrogação até 2 pontos.',
   true, true, 8, false, null),
  ('tenis-de-mesa', 'Tênis de Mesa', 'Esportivo individual', 'individual',
   'Duas categorias, masculino e feminino, até 10 estudantes por categoria.',
   'Melhor de 3 sets até 11 pontos, com diferença mínima de 2; saque alternado a cada 2 pontos; materiais fornecidos pela organização.',
   true, true, 9, false, null),
  ('bandeirinha', 'Bandeirinha', 'Recreativo e inclusivo', 'coletiva',
   'Categoria única mista, uma equipe de até 8 participantes, com no mínimo 50% de mulheres.',
   'Objetivo de capturar a bandeira adversária e levá-la ao próprio campo; jogador tocado vai para a área de prisão e pode ser libertado por um colega; mínimo de participantes para partida ainda não definido pela organização.',
   true, true, 10, true, 'Mínimo de participantes a definir: o sistema bloqueia a criação de jogos oficiais até a configuração.'),
  ('tacobol', 'Tacobol', 'Recreativo e inclusivo', 'equipe',
   'Duas categorias, masculino e feminino, até 5 equipes de 2 participantes por turma.',
   'Partidas com ataque e defesa alternados; pontuação por corrida completa entre as bases definida pela organização; materiais fornecidos ou homologados.',
   true, true, 11, false, 'Pontuação por corrida definida pela organização.'),
  ('uno', 'UNO', 'Recreativo e inclusivo', 'individual',
   'Categoria individual, até 15 participantes por turma.',
   'Mesas de até 4 participantes; rodadas classificatórias e final; 7 cartas por jogador; é obrigatório anunciar UNO com uma carta na mão.',
   true, true, 12, false, null),
  ('circuito', 'Circuito', 'Recreativo e inclusivo', 'individual',
   'Duas categorias, masculino e feminino, até 5 participantes por categoria.',
   'Percurso com estações de desafios motores; vence o menor tempo, considerando as penalidades; adaptações de acessibilidade previstas.',
   true, true, 13, false, null),
  ('baralho', 'Baralho', 'Recreativo e inclusivo', 'individual',
   'Categoria individual, até 10 participantes por turma.',
   'Variante única Buraco/Canastra; proibidas apostas e premiação financeira; critérios de classificação divulgados previamente.',
   true, true, 14, false, null),
  ('domino', 'Dominó', 'Intelectual', 'individual',
   'Categoria individual, até 10 participantes por turma.',
   'Peças tradicionais (28), 7 por jogador; vence quem colocar todas as peças primeiro ou tiver a menor soma quando o jogo fechar.',
   true, true, 15, false, null),
  ('quiz-interdisciplinar', 'Quiz Interdisciplinar', 'Intelectual', 'equipe',
   'Equipes mistas, até 5 equipes de 3 participantes por turma.',
   'Etapa classificatória digital e final mediada; cada acerto vale 10 pontos; empate vai para rodada de desempate.',
   true, true, 16, false, null),
  ('fifa-26', 'FIFA 26', 'Tecnológico', 'individual',
   'Categoria única individual, até 5 participantes por turma.',
   'Dois tempos de 4 minutos; partidas individuais; grupos ou eliminatória; empate em eliminatória vai para prorrogação e pênaltis.',
   true, true, 17, true, 'O documento diz "até 5 (três) participantes". Usando 5 provisoriamente — a confirmar.'),
  ('free-fire', 'Free Fire', 'Tecnológico', 'equipe',
   'Categoria única por equipes, até 2 equipes de 4 participantes por turma.',
   'Pontuação acumulada por posição final e desempenho; critérios divulgados antes; proibidos programas externos e recursos não autorizados.',
   true, true, 18, true, 'Mínimo de participantes para partida a definir: o sistema bloqueia a criação de jogos oficiais até a configuração.'),
  ('desfile-sustentavel', 'Desfile Sustentável / Ecológico', 'Cultural', 'apresentacao',
   'Atividade cultural especial. As três primeiras colocadas desfilam no dia 27.',
   'Avaliação qualitativa da organização; sem regra rígida de equipe.',
   false, false, 19, true, 'Atividade especial: pontuação e critérios definidos pela organização.'),
  ('rei-e-rainha', 'Rei e Rainha dos Jogos', 'Cultural', 'apresentacao',
   'Competição de casais por turma, com premiação para os três primeiros.',
   'Pontuação na Taça Turma Protagonista: 1º casal 100, 2º 50, 3º 25. Não entra na classificação esportiva geral.',
   false, true, 20, true, 'Regras de avaliação dos casais a definir pela organização.'),
  ('desafios-culturais', 'Desafios Culturais', 'Cultural', 'apresentacao',
   'Atividades culturais especiais cadastráveis pela organização.',
   'Formato, equipes e pontuação a definir.',
   false, false, 21, true, 'Sem regra rígida: configure no painel antes de usar.')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- Categorias (unidade de premiação e de pontuação)
-- ---------------------------------------------------------------------

insert into public.modalidade_categorias (
  modalidade_id, nome, genero, formato_resultado,
  max_equipes_por_turma, tamanho_equipe_min, tamanho_equipe_max,
  max_participantes_por_turma, min_participantes_partida,
  min_feminino, min_masculino, min_percentual_feminino,
  vagas_premiadas, ordem, a_confirmar, observacao
)
select m.id, v.nome, v.genero, v.formato,
       v.max_eq, v.tam_min, v.tam_max, v.max_part, v.min_partida,
       v.min_fem, v.min_masc, v.min_pct, v.vagas, v.ordem, v.a_confirmar, v.observacao
from (values
  ('futsal','Masculino','masculino','placar',1,5,8,8,5,null::smallint,null::smallint,null::numeric,3,1,false,null::text),
  ('futsal','Feminino','feminino','placar',1,5,8,8,5,null,null,null,3,2,false,null),
  ('corrida','Masculino','masculino','tempo',5,1,1,5,1,null,null,null,3,1,false,'Masculino: 2.200 m.'),
  ('corrida','Feminino','feminino','tempo',5,1,1,5,1,null,null,null,3,2,false,'Feminino: 1.100 m.'),
  ('voleibol','Mista','mista','placar',1,6,8,8,6,2,4,null,3,1,false,'4 homens e 2 mulheres em quadra.'),
  ('queimada','Mista','mista','placar',1,8,8,8,8,null,null,50,2,1,false,'Mínimo 50% de mulheres; premia só 1º e 2º.'),
  ('xadrez','Masculino','masculino','posicao',5,1,1,5,2,null,null,null,3,1,false,null),
  ('xadrez','Feminino','feminino','posicao',5,1,1,5,2,null,null,null,3,2,false,null),
  ('damas','Masculino','masculino','posicao',5,1,1,5,2,null,null,null,3,1,false,null),
  ('damas','Feminino','feminino','posicao',5,1,1,5,2,null,null,null,3,2,false,null),
  ('cubo-magico','Masculino','masculino','tempo',10,1,1,10,1,null,null,null,3,1,false,null),
  ('cubo-magico','Feminino','feminino','tempo',10,1,1,10,1,null,null,null,3,2,false,null),
  ('basquete-3x3','Masculino','masculino','placar',1,3,4,4,3,null,null,null,3,1,false,null),
  ('basquete-3x3','Feminino','feminino','placar',1,3,4,4,3,null,null,null,3,2,false,null),
  ('tenis-de-mesa','Masculino','masculino','placar',10,1,1,10,2,null,null,null,3,1,false,null),
  ('tenis-de-mesa','Feminino','feminino','placar',10,1,1,10,2,null,null,null,3,2,false,null),
  ('bandeirinha','Mista','mista','placar',1,8,8,8,null,null,null,50,null,1,true,'Mínimo para iniciar partidas a definir.'),
  ('tacobol','Masculino','masculino','placar',5,2,2,10,2,null,null,null,null,1,false,'Até 5 equipes de 2.'),
  ('tacobol','Feminino','feminino','placar',5,2,2,10,2,null,null,null,null,2,false,'Até 5 equipes de 2.'),
  ('uno','Única','unica','posicao',15,1,1,15,2,null,null,null,null,1,false,'Mesas de até 4.'),
  ('circuito','Masculino','masculino','tempo',5,1,1,5,1,null,null,null,null,1,false,null),
  ('circuito','Feminino','feminino','tempo',5,1,1,5,1,null,null,null,null,2,false,null),
  ('baralho','Única','unica','posicao',10,1,1,10,2,null,null,null,null,1,false,'Variante Buraco/Canastra.'),
  ('domino','Única','unica','posicao',10,1,1,10,2,null,null,null,null,1,false,null),
  ('quiz-interdisciplinar','Mista','mista','pontuacao',5,3,3,15,3,null,null,null,null,1,false,'Até 5 equipes de 3.'),
  ('fifa-26','Única','unica','placar',5,1,1,5,2,null,null,null,null,1,true,'Limite provisório: 5.'),
  ('free-fire','Única','unica','pontuacao',2,4,4,8,null,null,null,null,null,1,true,'Mínimo para iniciar partidas a definir.'),
  ('desfile-sustentavel','Única','unica','posicao',1,null,null,null,null,null,null,null,3,1,true,null),
  ('rei-e-rainha','Única','unica','posicao',1,2,2,2,2,null,null,null,3,1,true,'Casal por turma.'),
  ('desafios-culturais','Única','unica','posicao',null,null,null,null,null,null,null,null,null,1,true,null)
) as v(slug, nome, genero, formato, max_eq, tam_min, tam_max, max_part, min_partida,
       min_fem, min_masc, min_pct, vagas, ordem, a_confirmar, observacao)
join public.modalidades m on m.slug = v.slug
on conflict (modalidade_id, nome) do nothing;

-- ---------------------------------------------------------------------
-- Critérios da Taça
-- ---------------------------------------------------------------------

insert into public.taca_criterios (chave, nome, tipo, peso, escala_min, escala_max, a_definir, ordem) values
  ('desempenho_esportivo', 'Desempenho esportivo', 'esportivo', 40, 0, 100, false, 1),
  ('mobilizacao_participacao', 'Mobilização e Participação', 'qualitativo', 25, 0, 10, true, 2),
  ('torcida_protagonismo', 'Torcida e Protagonismo', 'qualitativo', 35, 0, 10, true, 3),
  ('identificacao_turma', 'Identificação da turma', 'qualitativo', null, 0, 10, true, 4),
  ('conduta_convivencia', 'Conduta e Convivência (desconto)', 'desconto', null, 0, 100, true, 5)
on conflict (chave) do nothing;

-- ---------------------------------------------------------------------
-- Documentos (PDFs ainda não enviados; campos ficam nulos)
-- ---------------------------------------------------------------------

insert into public.documentos (titulo, tipo, ordem)
select v.titulo, v.tipo, v.ordem
from (values
  ('Regulamento Geral e Anexos – Jogos 2026', 'regulamento', 1),
  ('Projeto Executivo – Jogos Internos 2026', 'projeto', 2)
) as v(titulo, tipo, ordem)
where not exists (select 1 from public.documentos d where d.titulo = v.titulo);

insert into public.documentos (titulo, tipo, modalidade_id, ordem)
select 'Anexo ' || v.anexo || ' – ' || m.nome, 'anexo', m.id, v.ordem
from (values
  ('I','futsal',10), ('II','corrida',11), ('III','voleibol',12), ('IV','queimada',13),
  ('V','xadrez',14), ('VI','damas',15), ('VII','cubo-magico',16), ('VIII','basquete-3x3',17),
  ('IX','tenis-de-mesa',18), ('X','bandeirinha',19), ('XI','tacobol',20), ('XII','uno',21),
  ('XIII','circuito',22), ('XIV','baralho',23), ('XV','domino',24), ('XVI','quiz-interdisciplinar',25),
  ('XVII','fifa-26',26), ('XVIII','free-fire',27), ('XIX','rei-e-rainha',28)
) as v(anexo, slug, ordem)
join public.modalidades m on m.slug = v.slug
where not exists (
  select 1 from public.documentos d
  where d.tipo = 'anexo' and d.modalidade_id = m.id
);

-- O Anexo XIX trata da Taça Turma Protagonista; ajusta o título.
update public.documentos d
set titulo = 'Anexo XIX – Turma Protagonista'
where d.tipo = 'anexo' and d.titulo = 'Anexo XIX – Rei e Rainha dos Jogos';


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- supabase/migrations/0005_ajustes_admin.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- supabase/migrations/0006_storage_documentos.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ---------------------------------------------------------------------
-- Storage para os PDFs oficiais (Supabase).
-- Este arquivo é ignorado em um PostgreSQL sem o schema storage.
-- ---------------------------------------------------------------------

do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'Schema storage ausente: etapa de Storage ignorada.';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('documentos', 'documentos', true, 26214400, array['application/pdf'])
  on conflict (id) do update set public = true;

  execute 'drop policy if exists documentos_admin_select on storage.objects';
  execute 'drop policy if exists documentos_admin_insert on storage.objects';
  execute 'drop policy if exists documentos_admin_update on storage.objects';
  execute 'drop policy if exists documentos_admin_delete on storage.objects';

  execute $p$
    create policy documentos_admin_select on storage.objects
      for select to authenticated
      using (bucket_id = 'documentos' and public.is_admin())
  $p$;

  execute $p$
    create policy documentos_admin_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'documentos' and public.is_admin())
  $p$;

  execute $p$
    create policy documentos_admin_update on storage.objects
      for update to authenticated
      using (bucket_id = 'documentos' and public.is_admin())
      with check (bucket_id = 'documentos' and public.is_admin())
  $p$;

  execute $p$
    create policy documentos_admin_delete on storage.objects
      for delete to authenticated
      using (bucket_id = 'documentos' and public.is_admin())
  $p$;
end
$$;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- supabase/migrations/0007_regras_portal_publico.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================================
-- 0007 - Regras pendentes assumidas para o portal público
-- Todos os valores continuam editáveis no painel /admin.
-- =====================================================================

-- Free Fire: esquadrão de 4 por equipe
update public.modalidade_categorias mc
   set min_participantes_partida = 4,
       a_confirmar = false,
       observacao = 'Mínimo de 4 participantes para iniciar a partida (editável no painel).'
  from public.modalidades m
 where m.id = mc.modalidade_id
   and m.slug = 'free-fire';

-- Bandeirinha: 4 por equipe e mínimo de 50% de mulheres (mantido)
update public.modalidade_categorias mc
   set min_participantes_partida = 4,
       a_confirmar = false,
       observacao = 'Mínimo de 4 participantes para iniciar a partida; 50% de mulheres (editável no painel).'
  from public.modalidades m
 where m.id = mc.modalidade_id
   and m.slug = 'bandeirinha';

-- FIFA 26: interpretação do "até 5 (três)" como 3 participantes por turma
update public.modalidade_categorias mc
   set max_equipes_por_turma = 3,
       max_participantes_por_turma = 3,
       a_confirmar = false,
       observacao = 'Até 3 participantes por turma (editável no painel).'
  from public.modalidades m
 where m.id = mc.modalidade_id
   and m.slug = 'fifa-26';

-- Critérios da Taça: pesos e escalas definidos; identificação segue sem peso
update public.taca_criterios
   set a_definir = false
 where chave in (
   'desempenho_esportivo',
   'mobilizacao_participacao',
   'torcida_protagonismo',
   'identificacao_turma',
   'conduta_convivencia'
 );

-- Modalidades antes marcadas como "a confirmar" passam a ter regra assumida
update public.modalidades
   set a_confirmar = false
 where slug in (
   'fifa-26',
   'free-fire',
   'bandeirinha',
   'desfile-sustentavel',
   'rei-e-rainha',
   'desafios-culturais'
 );


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- supabase/migrations/0008_correcao_texto_fifa.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================================
-- 0008 - Corrige o texto da divergência sobre o FIFA 26
-- O valor real aplicado pela 0007 é 3 participantes por turma.
-- =====================================================================

update public.configuracoes
   set valor = (
     select jsonb_agg(
       case
         when elem->>'tema' = 'FIFA 26'
           then jsonb_set(
             elem,
             '{resolucao}',
             to_jsonb('Texto diz "até 5 (três)". Assumido 3 participantes por turma (editável no painel).'::text)
           )
         else elem
       end
       order by ord
     )
     from jsonb_array_elements(valor) with ordinality as t(elem, ord)
   )
 where chave = 'divergencias_documentos';

