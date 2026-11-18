# Relatório de implementação — Jogos Interclasses 2026

**Última atualização:** 18/11/2026  
**Evento:** Jogos Interclasses 2026 — 24 a 27/11/2026  
**Escola:** Escola Estadual Celso Rodrigues — Santo Antônio do Tauá/PA

---

## 1. Links principais

| Item | URL |
|---|---|
| Site em produção | <https://jogos-interclasses-2026.dev-luizg.workers.dev> |
| Painel administrativo | <https://jogos-interclasses-2026.dev-luizg.workers.dev/admin> |
| Repositório GitHub | <https://github.com/devluizg/jogos-interclasses-2026> |
| Projeto Supabase | <https://supabase.com/dashboard/project/noklkxtmrltnhqopawtu> |

**Administrador cadastrado:** `dev.luiz@gmail.com`  
O cadastro público de novos usuários está **desativado**.

---

## 2. Visão geral

O projeto é o portal oficial dos Jogos Interclasses 2026, com:

- Portal público mobile-first.
- Painel administrativo protegido por login.
- Banco PostgreSQL no Supabase com RLS.
- Upload de PDFs no Supabase Storage.
- Atualização de resultados/documentos em tempo real.
- Deploy automático no Cloudflare Workers a partir do GitHub.

Todas as quatro etapas planejadas foram concluídas:

1. Banco de dados, regras, RLS, funções, views e testes.
2. Painel administrativo `/admin`.
3. Portal público `/`.
4. Publicação em produção e validação.

O conteúdo real da escola ainda não foi cadastrado. Nada de estudantes, inscrições, partidas, resultados ou notícias foi inventado.

---

## 3. Stack e estrutura

- **Frontend:** React + TypeScript + Vite.
- **Estilo:** Tailwind CSS.
- **Backend:** Supabase (PostgreSQL, Auth, Storage e Realtime).
- **Deploy:** Cloudflare Workers com assets estáticos.
- **Node:** 22 (`.nvmrc` com `22`; Cloudflare configurado com `NODE_VERSION=22`).

Estrutura principal:

```text
docs/                          PDFs oficiais usados como fonte
src/
  auth/                        sessão e verificação de admin
  components/                  componentes do painel
  layout/                      layout do /admin
  lib/                         Supabase, tipos, formatadores, constantes
  pages/                       telas administrativas
  public/                      portal público
  App.tsx                      rotas públicas, admin e guarda de acesso
supabase/
  migrations/                  migrations 0001 a 0008
  tests/                       testes automatizados de banco
  setup_completo.sql           instalação completa do zero
wrangler.jsonc                 configuração do Cloudflare Workers
.env.example                   exemplo das variáveis do frontend
```

---

## 4. Etapa 1 — Banco de dados

Foram criadas migrations SQL para Supabase/PostgreSQL:

| Migration | Conteúdo |
|---|---|
| `0001_schema.sql` | Tabelas, constraints, índices e auditoria |
| `0002_funcoes_validacoes_views.sql` | Funções, validações e views |
| `0003_rls_grants_realtime.sql` | RLS, grants e Realtime |
| `0004_seed.sql` | Dados iniciais e regras esportivas |
| `0005_ajustes_admin.sql` | `fn_sou_admin` e leitura do próprio vínculo |
| `0006_storage_documentos.sql` | Bucket público `documentos` e policies de upload |
| `0007_regras_portal_publico.sql` | Regras públicas pendentes, editáveis |
| `0008_correcao_texto_fifa.sql` | Correção do texto divergente do FIFA |

### O que o banco cobre

- Turmas, estudantes, modalidades, categorias e inscrições.
- Limites, mínimos e composição por gênero.
- Partidas, locais, horários e conflitos de agenda.
- Resultados oficiais, rascunhos, correções e anulação.
- Classificação geral, medalheiro e pontuação.
- Taça Turma Protagonista, critérios, jurados e notas.
- Conduta e descontos na Taça.
- Configurações editáveis do evento.
- Notícias e documentos.
- Histórico de alterações e auditoria.
- Views e funções para o portal público.

### Dados-base existentes

- 10 turmas: `101–104`, `201–204`, `301–302`.
- 21 modalidades.
- 30 categorias/gêneros.
- 24 configurações.
- 21 documentos cadastrados.
- 0 partidas.
- 0 resultados.
- 0 notícias.
- Taça ainda não publicada (`taca_publicada=false`).

### Instalação

O banco já está configurado no Supabase com as migrations `0001` a `0008`.

**Importante:** não executar `supabase/setup_completo.sql` novamente no banco atual, pois ele é destinado a uma instalação do zero.

---

## 5. Etapa 2 — Painel `/admin`

O painel possui login por e-mail/senha via Supabase Auth e verificação de administrador no banco com `fn_sou_admin`.

Funcionalidades implementadas:

- Dashboard com pendências do evento.
- CRUD de turmas, estudantes, modalidades e categorias.
- Inscrições por equipe com montagem de participantes.
- Aprovação e rejeição de inscrições.
- Validações automáticas do banco.
- Programação de partidas, locais e horários.
- Lançamento de resultados oficiais.
- Publicação, correção e anulação de resultados com histórico.
- Registro de ocorrências de conduta.
- Gestão da Taça Turma Protagonista.
- Configurações de pontuação, desempates e regras.
- Notícias e documentos com upload de PDF.
- Histórico e auditoria.

O login administrativo foi testado com sucesso no ambiente local. A página de login também carrega corretamente em produção.

---

## 6. Etapa 3 — Portal público

Rotas implementadas:

```text
/
/programacao
/classificacao
/resultados
/modalidades
/modalidades/:slug
/noticias
/noticias/:slug
/documentos
/taca
```

Funcionalidades:

- Home com identidade oficial, contagem regressiva e destaques.
- Próximos jogos e últimos resultados.
- Classificação geral e medalheiro.
- Programação com filtros por dia e modalidade.
- Resultados agrupados por modalidade/categoria.
- Página de cada modalidade com regras e participantes.
- Notícias e leitura individual.
- Regulamento/anexos.
- Ranking da Taça, quando publicado.
- Atualização automática com Supabase Realtime.
- SEO básico por página.
- Navegação mobile-first.
- Página 404 para rotas inexistentes.

O portal foi validado localmente e em produção, incluindo acesso direto às rotas profundas do SPA.

---

## 7. Etapa 4 — Publicação em produção

### Supabase

- Projeto: `noklkxtmrltnhqopawtu`.
- URL: `https://noklkxtmrltnhqopawtu.supabase.co`.
- Frontend usando apenas a chave `anon`.
- A chave `service_role` não é usada no navegador.
- Cadastro público desativado (`disable_signup=true`).
- Provedor de login por e-mail permanece ativo.
- Usuário administrador `dev.luiz@gmail.com` criado, confirmado e promovido na tabela `public.admins`.

### Cloudflare Workers

O deploy foi feito no **Cloudflare Workers**, não no Cloudflare Pages.

Configuração usada:

```text
Build command:   npm run build
Deploy command:  npx wrangler deploy
NODE_VERSION:    22
VITE_SUPABASE_URL:     configurada no Cloudflare
VITE_SUPABASE_ANON_KEY: configurada no Cloudflare
```

Arquivos de configuração:

- `wrangler.jsonc`: publica `dist` e configura fallback SPA.
- `.nvmrc`: fixa Node 22.

O `wrangler.jsonc` usa:

```json
"not_found_handling": "single-page-application"
```

para que rotas como `/admin` e `/modalidades/futsal` funcionem em acesso direto.

### Problema resolvido no deploy

O primeiro build falhou porque existia `public/_redirects` com:

```text
/* /index.html 200
```

O Cloudflare Workers rejeitou o arquivo com erro de loop infinito (`code 100324`).

Solução aplicada:

- `public/_redirects` foi removido.
- O fallback SPA passou a ser feito pelo `wrangler.jsonc`.

**Não readicionar `public/_redirects` enquanto o deploy for em Workers.**

### URL final

**<https://jogos-interclasses-2026.dev-luizg.workers.dev>**

---

## 8. Documentos e PDFs

Os dois PDFs oficiais foram enviados ao bucket público `documentos`:

- `Regulamento dos Jogos 2026 - Versão Resumida.pdf` — 455.737 bytes.
- `Projeto Executivo - Jogos Internos da Escola Estadual Celso Rodrigues - 2026.pdf` — 219.154 bytes.

Links públicos:

```text
https://noklkxtmrltnhqopawtu.supabase.co/storage/v1/object/public/documentos/regulamentos/1795028465355-Regulamento-dos-Jogos-2026---Vers-o-Resumida.pdf
https://noklkxtmrltnhqopawtu.supabase.co/storage/v1/object/public/documentos/regulamentos/1795028536482-Projeto-Executivo---Jogos-Internos-da-Escola-Estadual-Celso-Rodrigues---2026.pdf
```

Todos os **21 documentos** do banco estão com `arquivo_url` preenchido e acessíveis publicamente.

Enquanto os anexos individuais não forem separados, os **19 documentos do tipo Anexo** apontam para o PDF do Regulamento.

A página `/documentos` foi validada e mostra os 21 links com o botão “Abrir”.

---

## 9. Correções e decisões tomadas

### FIFA 26

O texto original do banco dizia “até 5 (três)”, o que era contraditório. A regra assumida e configurada é:

- **3 participantes por turma no FIFA 26.**

Foi criada a migration `0008_correcao_texto_fifa.sql`, o seed `0004` foi corrigido e o texto ao vivo no Supabase também foi atualizado.

### Título “ANEXO” na página de documentos

A página mostrava o cabeçalho “ANEXO” no singular. Foi ajustado:

- `TIPOS_DOCUMENTO` em `src/lib/constantes.ts` ganhou o campo `plural`.
- `src/public/Documentos.tsx` passou a usar `tipo.plural`.
- A página agora mostra “ANEXOS”.

### Divergência sobre taxa de inscrição

- O Regulamento diz que a inscrição é gratuita.
- O Projeto Executivo cita R$ 5,00.

Decisão: a cobrança está **desativada**. O campo `taxa_paga` existe no cadastro, mas não é exigido.

### Regras assumidas e editáveis

- FIFA 26: 3 por turma.
- Free Fire: mínimo de 4 para iniciar.
- Bandeirinha: mínimo de 4, mantendo 50% de mulheres.
- Taça: fórmula provisória, configurável no painel.
- Desfile Sustentável e Rei/Rainha: fora da classificação esportiva; Rei/Rainha pontua apenas na Taça.

---

## 10. Segurança e RLS

- RLS ativada nas tabelas.
- Leitura pública limitada ao que é público.
- Escrita permitida apenas para administradores autenticados.
- Nomes de estudantes exibidos publicamente no formato “Nome S.”.
- Representantes das turmas não são públicos.
- Upload no Storage restrito a admins.
- Cadastro público desativado.
- Nenhuma chave `service_role` no frontend.

Testes manuais de RLS:

- Tentativa de inserir em `documentos` com a chave anon: bloqueada com `401` e código `42501`.
- Tentativa de upload no Storage com a chave anon: bloqueada com `403 AccessDenied`.

---

## 11. Realtime

O Realtime foi testado no Supabase real:

- Script temporário assinou a tabela `documentos`.
- Um documento foi alterado de `ordem=1` para `ordem=2`.
- O evento `UPDATE` foi recebido em `2026-11-18T19:15:14.952Z`.
- A ordem foi revertida para `1` depois do teste.

Conclusão: a infraestrutura de Realtime está funcionando. Ainda falta validar a atualização visual do portal com um **resultado oficial real**.

---

## 12. Testes e validações realizadas

### Banco

- `./supabase/tests/run_local.sh` executado com sucesso.
- Todos os testes de banco da fase 1 passaram.
- Regras de mínimo, máximo, gênero, pontuação, desempate, W.O., rascunho e correção de resultado cobertas.

### Build

- `npm run typecheck` passou.
- `npm run build` passou.
- O `dist` foi gerado sem `_redirects`.

### Portal local

- Todas as rotas públicas abriram corretamente.
- Rota inexistente exibiu a página 404.
- Filtros, documentos e layout mobile foram verificados.

### Produção

- Home, programação, classificação, resultados, modalidades, notícias, documentos, Taça e admin responderam `200`.
- Acesso direto a `/admin` e `/modalidades/futsal` funcionou.
- Assets JavaScript e imagens responderam `200`.
- `/documentos` exibiu os 21 documentos.
- Login do admin carregou corretamente.
- Layout mobile da home foi conferido por screenshot.

### Ainda pendente de validação

- Login administrativo diretamente na URL de produção com a senha real.
- Atualização de um **resultado oficial real** no portal via Realtime.
- Publicação da Taça com jurados e notas reais.

---

## 13. Git e histórico de commits

Repositório público:

**<https://github.com/devluizg/jogos-interclasses-2026>**

Commits principais:

| Commit | Descrição |
|---|---|
| `82c6358` | Initial commit |
| `6fa89c2` | Configura deploy no Cloudflare Workers |
| `4e73a79` | Remove `_redirects` incompatível com Workers |
| `8183103` | Atualiza status e URL de produção |

Branch: `main`  
Remote: `origin/main`  
Produção verificada em 18/11/2026 retornando `200`.

O `.env`, `dist` e `node_modules` estão no `.gitignore`.

---

## 14. Situação atual do conteúdo

### Já configurado

- Turmas, modalidades, categorias e configurações.
- Regulamento e Projeto Executivo.
- 21 registros de documentos.
- Admin e login.
- Regras esportivas e critérios da Taça.

### Deliberadamente vazio

Não foram inventados:

- Estudantes.
- Inscrições.
- Equipes.
- Horários.
- Partidas.
- Resultados.
- Notícias.
- Escudos.
- Cores de equipe.
- Campeões.
- Notas ou jurados da Taça.

Esses dados dependem da escola.

---

## 15. Próximas etapas

1. Testar o login do admin em produção.
2. Cadastrar estudantes e responsáveis/turmas.
3. Montar as equipes e inscrições por modalidade.
4. Criar a programação de partidas, locais e horários.
5. Lançar resultados oficiais durante o evento.
6. Validar a atualização de um resultado real no portal via Realtime.
7. Cadastrar jurados e notas da Taça e publicar o ranking.
8. Opcional: separar os PDFs individuais dos 19 anexos.
9. Opcional: remover imagens não usadas de `public/brand` e redeployar.
10. Opcional: configurar domínio próprio e/ou tornar o repositório privado.

---

## 16. Comandos úteis

### Rodar localmente

```bash
cd ~/jogos-interclasses-2026
npm install
cp .env.example .env
npm run dev
```

Portal local: `http://localhost:5173/`  
Painel local: `http://localhost:5173/admin`

### Validar o projeto

```bash
npm run typecheck
npm run build
./supabase/tests/run_local.sh
```

### Publicar alterações

O Cloudflare Workers está conectado ao GitHub e redeploya a cada push na `main`:

```bash
git add .
git commit -m "Descrição da alteração"
git push
```

### Deploy manual

```bash
npx wrangler deploy
```

---

## 17. Observações finais

- O site está publicado e funcional.
- O deploy usa Cloudflare Workers, não Pages.
- Não readicionar `public/_redirects`.
- Não executar `setup_completo.sql` novamente no banco atual.
- O repositório está público; pode ser tornado privado nas configurações do GitHub.
- O conteúdo real é a única grande pendência para o evento.
