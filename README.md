# Jogos Interclasses 2026 – Escola Estadual Celso Rodrigues

Portal oficial dos Jogos Interclasses 2026 (24 a 27/11/2026), Santo Antônio do Tauá/PA.

**Status atual: Etapas 1 (banco), 2 (painel `/admin`), 3 (portal público `/`) e 4 (produção) concluídas.**
Produção: <https://jogos-interclasses-2026.dev-luizg.workers.dev>

## O que existe

### Banco (Etapa 1)

- Migrations SQL para Supabase/PostgreSQL em `supabase/migrations/`.
- Seed com turmas, 21 modalidades, 30 categorias/gêneros, pontuação, desempates, critérios da Taça, dias e locais.
- RLS em todas as tabelas (leitura pública só do que é público; escrita só para admins).
- Views/funções de classificação, medalheiro, Taça, programação, resultados e participantes.
- Validações no banco: limites, mínimos, composição por gênero, prêmios, W.O., correção de resultado oficial e conflitos de horário.
- Histórico de alterações de resultados e auditoria das principais tabelas.
- Testes automatizados de banco em `supabase/tests/`.

### Painel `/admin` (Etapa 2)

- Login por e-mail/senha (Supabase Auth) e verificação de administrador no banco (`fn_sou_admin`).
- Dashboard com pendências: modalidades sem mínimo, partidas sem resultado, inscrições pendentes, conflitos de horário e contagem para o evento.
- CRUD de turmas (representantes, cores), estudantes (com busca e taxa), modalidades e categorias.
- Inscrições por equipe com montagem de participantes, validação do banco, aprovação/rejeição e alertas.
- Programação: criação de partidas, locais, horários, turmas e lançamento de resultados.
- Resultados oficiais: rascunho/publicação, correção com histórico e anulação.
- Conduta: ocorrências por turma e gênero (usadas no desconto da Taça).
- Taça Turma Protagonista: critérios/pesos, jurados, notas, ranking e publicação no portal.
- Configurações: evento, pontuação, desempates e demais chaves do banco.
- Conteúdo: notícias e documentos com upload de PDF no Storage.
- Histórico/auditoria das alterações.

### Portal público `/` (Etapa 3)

- Home com identidade oficial, contagem regressiva, próximos jogos, últimos resultados, classificação, notícias e Taça.
- Programação com filtros por dia e modalidade.
- Classificação geral, medalheiro e tabela de pontos.
- Resultados oficiais agrupados por modalidade/categoria.
- Lista de modalidades e página de detalhe com regras, categorias, participantes e documentos.
- Notícias (lista e leitura), regulamento/anexos e ranking da Taça (quando publicado).
- Atualização automática por Supabase Realtime; SEO básico por página; navegação mobile-first.
- Rotas: `/`, `/programacao`, `/classificacao`, `/resultados`, `/modalidades`, `/modalidades/:slug`, `/noticias`, `/noticias/:slug`, `/documentos`, `/taca` e 404.

## Estrutura

```
docs/                          PDFs oficiais (fonte do seed)
src/
  auth/AuthContext.tsx         sessão + verificação de admin
  components/ui.tsx            componentes do painel
  layout/AdminLayout.tsx       menu e cabeçalho do /admin
  lib/                         Supabase, tipos, formatadores, erros, constantes
  pages/                       uma tela por área do painel
  public/                      portal público: layout, hooks, UI e páginas
  App.tsx                      rotas pública, admin e guarda de acesso
supabase/migrations/
  0001_schema.sql              tabelas, constraints, índices, auditoria
  0002_funcoes_validacoes_views.sql
  0003_rls_grants_realtime.sql
  0004_seed.sql
  0005_ajustes_admin.sql       fn_sou_admin + leitura do próprio vínculo
  0006_storage_documentos.sql  bucket "documentos" (PDF) + policies
  0007_regras_portal_publico.sql  regras pendentes assumidas (editáveis)
  0008_correcao_texto_fifa.sql    corrige texto da divergência do FIFA
supabase/tests/
  0000_stubs.sql               stubs de auth para teste em Postgres puro
  0001_testes_fase1.sql        testes de banco
  run_local.sh                 sobe Docker, aplica migrations e roda testes
wrangler.jsonc                 deploy no Cloudflare Workers (assets + fallback SPA)
.env.example                   variáveis do frontend
```

## Como aplicar no Supabase (Cloud, gratuito)

1. Crie um projeto em <https://supabase.com> e guarde `Project URL` e `anon public key`.
2. Abra **SQL Editor** e execute, nesta ordem, o conteúdo de:
   `0001_schema.sql`, `0002_funcoes_validacoes_views.sql`, `0003_rls_grants_realtime.sql`, `0004_seed.sql`, `0005_ajustes_admin.sql`, `0006_storage_documentos.sql`, `0007_regras_portal_publico.sql`, `0008_correcao_texto_fifa.sql`.
   - Alternativa via CLI: `npm i -g supabase`, `supabase init`, `supabase link --project-ref SEU_REF` e `supabase db push`.
   - A `0006` cria o bucket público `documentos` (PDF, 25 MB) e as policies de upload para admins. Se o schema `storage` ainda não existir, a migration é ignorada sem erro.
3. Em **Authentication > Users**, crie o usuário administrador (e-mail + senha) e confirme o e-mail.
4. Em **Authentication > Providers/Sign In**, desative o cadastro público ("Allow new users to sign up").
5. Registre o admin no banco (SQL Editor):

```sql
insert into public.admins (user_id, nome)
select id, 'Administrador'
from auth.users
where email = 'SEU_EMAIL'
on conflict (user_id) do nothing;
```

6. Confira:

```sql
select * from public.vw_classificacao_esportiva;
select * from public.vw_medalheiro;
select * from public.configuracoes where chave = 'evento_nome';
```

> A chave `service_role` **nunca** vai para o frontend. O site usa apenas a `anon key`; toda escrita passa por login + RLS.

## Rodar o painel localmente

Requisitos: **Node.js 22+** (o `@supabase/supabase-js` 2.119 exige Node 22) e npm.

```bash
cp .env.example .env    # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev             # portal em http://localhost:5173/ e painel em /admin
```

Sem `.env`, o site mostra a tela de configuração inicial com o passo a passo.

```bash
npm run typecheck       # tsc --noEmit
npm run build           # typecheck + build de produção em dist/
```

Para publicar no Cloudflare Workers (Builds conectados ao GitHub): build `npm run build`, deploy `npx wrangler deploy` e as variáveis `VITE_*` cadastradas no projeto. O `wrangler.jsonc` publica `dist` e configura o fallback das rotas do SPA.

## Testar localmente (sem Supabase)

Requisitos: Docker e bash.

```bash
./supabase/tests/run_local.sh
```

O script cria um PostgreSQL 16 descartável, aplica stubs de `auth`, roda as migrations e executa os testes. Saída esperada: `TODOS OS TESTES DE BANCO DA FASE 1 PASSARAM`.

## Relatório dos testes obrigatórios

| # | Teste | Situação |
|---|---|---|
| 1 | Futsal: 9º inscrito bloqueado | ✅ banco |
| 2 | Vôlei com 5 avisa mínimo 6 e não aprova | ✅ banco |
| 3 | Quiz aceita 5 equipes de 3 e bloqueia a 6ª | ✅ banco |
| 4 | Resultado oficial atualiza o público sem recarregar | ✅ Realtime validado no Supabase real; falta validar com resultado oficial |
| 5 | 1º/2º/3º = 100/50/25 uma vez por modalidade/categoria/gênero | ✅ banco |
| 6 | Desempate na ordem configurada; empate persistente sinalizado | ✅ banco |
| 7 | Rascunho não altera a classificação pública | ✅ banco |
| 8 | Mudar pontos/desempate/limite no admin reflete no site | ✅ banco |
| 9 | Queimada premia só 1º/2º; Bandeirinha bloqueia jogos | ✅ banco |
| 10 | Lista pública somente "Nome S." | ✅ banco |
| 11 | Dados preservados ao fechar/reabrir o navegador | ✅ tudo vem do banco, sem localStorage |
| 12 | `/admin` sem login bloqueado | ✅ banco (RLS) |

Testes extras já cobertos: correção de resultado oficial exige confirmação e gera histórico; Taça só aparece quando publicada; nota fora da escala é rejeitada; representantes das turmas não são públicos; conflito de horário é detectado.

## Regras configuráveis (seed)

- **Turmas:** 101–104, 201–204, 301–302.
- **Pontuação:** 1º 100, 2º 50, 3º 25 (`pontuacao_colocacao`).
- **Desempate geral:** ouros, pratas, bronzes. **Taça:** conduta, ouros, pratas (`criterios_desempate`, reordenação segura via `fn_definir_desempate`).
- **Taça:** pesos 40/25/35 e escalas editáveis; Identificação da turma sem peso inicial (a definir).
- **Modalidades:** limites, mínimos, composição por gênero, vagas premiadas e formato de resultado por categoria (`modalidade_categorias`).
- **Tolerância:** 10 minutos; depois pode haver W.O.
- **Uma pessoa em várias modalidades:** permitido por padrão (art. 7º), com limite opcional.

### Itens sinalizados como "a confirmar" no painel

- **FIFA 26:** documento diz "até 5 (três)". A migration `0007` assume **3 participantes por turma** (editável).
- **Free Fire:** mínimo para iniciar partidas assumido em **4** (editável).
- **Bandeirinha:** mínimo para iniciar partidas assumido em **4**, mantendo 50% de mulheres (editável).
- **Taxa de inscrição:** Regulamento diz gratuita; Projeto cita R$ 5,00. A cobrança está **desativada**; o campo `taxa_paga` existe no cadastro de estudantes.
- **Taça:** o regulamento não define escala nem fórmula. O cálculo atual é provisório e configurável (normalização do desempenho + médias qualitativas + desconto de conduta).
- **Desfile Sustentável** e **Rei e Rainha**: fora da classificação geral esportiva; Rei e Rainha pontua só na Taça. Ambos editáveis.

## O que está deliberadamente vazio

Não foram inventados estudantes, inscrições, horários, partidas, resultados, notícias, escudos, nomes de equipe, cores ou campeões. O Regulamento e o Projeto Executivo já estão no Storage; os 21 documentos usam o PDF do Regulamento enquanto os anexos não forem separados.

## Próximas etapas

4. Preencher os dados reais de estudantes, inscrições, programação e resultados; validar a atualização de um resultado oficial pelo Realtime.

## Limites gratuitos (verifique os valores atuais)

- **Supabase Free:** ~500 MB de banco, ~1 GB de Storage, ~5 GB de egress e 50 mil usuários ativos/mês; pausa do projeto por inatividade.
- **Cloudflare Workers Free:** requisições e banda sem custo adicional relevante para este site estático.

Nenhum recurso pago é necessário para as etapas 1 e 2.
