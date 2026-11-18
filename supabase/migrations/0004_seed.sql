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
