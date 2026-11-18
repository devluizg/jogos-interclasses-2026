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
