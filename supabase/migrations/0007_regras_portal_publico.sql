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
