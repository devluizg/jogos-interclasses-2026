-- =====================================================================
-- Testes de banco da Fase 1 (executar após 0000_stubs + migrations)
-- Roda tudo em uma transação e desfaz ao final.
-- Uso: psql -v ON_ERROR_STOP=1 -f 0001_testes_fase1.sql
-- =====================================================================

begin;

insert into auth.users (id, email)
values ('11111111-1111-1111-1111-111111111111', 'admin@teste.local');

insert into public.admins (user_id, nome)
values ('11111111-1111-1111-1111-111111111111', 'Admin Teste');

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

insert into public.estudantes (turma_id, nome_completo, genero)
select t.id,
       'Aluno ' || g || ' Teste',
       case when g % 2 = 0 then 'feminino' else 'masculino' end
from public.turmas t
cross join generate_series(1, 15) g
where t.numero in (101, 201, 301);

insert into public.estudantes (turma_id, nome_completo, genero)
select id, 'João Silva', 'masculino' from public.turmas where numero = 101;

-- ---------------------------------------------------------------------
-- Teste 1: Futsal - 9º inscrito na mesma categoria é bloqueado (limite 8)
-- ---------------------------------------------------------------------
do $$
declare
  v_turma uuid;
  v_cat   uuid;
  v_insc  uuid;
  v_est   uuid;
begin
  select id into v_turma from public.turmas where numero = 101;
  select mc.id into v_cat
  from public.modalidade_categorias mc
  join public.modalidades m on m.id = mc.modalidade_id
  where m.slug = 'futsal' and mc.nome = 'Masculino';

  insert into public.inscricoes (modalidade_categoria_id, turma_id, tipo)
  values (v_cat, v_turma, 'equipe') returning id into v_insc;

  for i in 1..8 loop
    select id into v_est from public.estudantes
    where turma_id = v_turma and nome_completo = 'Aluno ' || i || ' Teste';
    insert into public.inscricao_participantes (inscricao_id, estudante_id)
    values (v_insc, v_est);
  end loop;

  begin
    select id into v_est from public.estudantes
    where turma_id = v_turma and nome_completo = 'Aluno 9 Teste';
    insert into public.inscricao_participantes (inscricao_id, estudante_id)
    values (v_insc, v_est);
    raise exception 'FALHOU: o 9º participante do futsal foi aceito.';
  exception when others then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if position('Limite de 8' in sqlerrm) = 0 then
      raise exception 'FALHOU: mensagem inesperada no teste 1: %', sqlerrm;
    end if;
  end;
end
$$;

-- ---------------------------------------------------------------------
-- Teste 2: Voleibol com 5 alunos avisa mínimo 6 e não pode ser aprovado
-- ---------------------------------------------------------------------
do $$
declare
  v_turma uuid;
  v_cat   uuid;
  v_insc  uuid;
  v_est   uuid;
  v_res   jsonb;
begin
  select id into v_turma from public.turmas where numero = 201;
  select mc.id into v_cat
  from public.modalidade_categorias mc
  join public.modalidades m on m.id = mc.modalidade_id
  where m.slug = 'voleibol';

  insert into public.inscricoes (modalidade_categoria_id, turma_id, tipo)
  values (v_cat, v_turma, 'equipe') returning id into v_insc;

  for i in 1..5 loop
    select id into v_est from public.estudantes
    where turma_id = v_turma and nome_completo = 'Aluno ' || i || ' Teste';
    insert into public.inscricao_participantes (inscricao_id, estudante_id)
    values (v_insc, v_est);
  end loop;

  v_res := public.fn_validar_inscricao(v_insc, false);
  if (v_res ->> 'avisos') not like '%mínimo é 6%' then
    raise exception 'FALHOU: aviso de mínimo 6 ausente no vôlei: %', v_res;
  end if;

  begin
    update public.inscricoes set status = 'aprovada' where id = v_insc;
    raise exception 'FALHOU: inscrição de vôlei com 5 alunos foi aprovada.';
  exception when others then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if position('mínimo para aprovação é 6' in sqlerrm) = 0 then
      raise exception 'FALHOU: mensagem inesperada no teste 2: %', sqlerrm;
    end if;
  end;
end
$$;

-- ---------------------------------------------------------------------
-- Teste 3: Quiz aceita 5 equipes de 3 e bloqueia a 6ª
-- ---------------------------------------------------------------------
do $$
declare
  v_turma uuid;
  v_cat   uuid;
  v_insc  uuid;
  v_est   uuid;
begin
  select id into v_turma from public.turmas where numero = 301;
  select mc.id into v_cat
  from public.modalidade_categorias mc
  join public.modalidades m on m.id = mc.modalidade_id
  where m.slug = 'quiz-interdisciplinar';

  for e in 1..5 loop
    insert into public.inscricoes (modalidade_categoria_id, turma_id, tipo, nome_equipe)
    values (v_cat, v_turma, 'equipe', 'Equipe ' || e) returning id into v_insc;

    for i in 1..3 loop
      select id into v_est from public.estudantes
      where turma_id = v_turma and nome_completo = 'Aluno ' || ((e - 1) * 3 + i) || ' Teste';
      insert into public.inscricao_participantes (inscricao_id, estudante_id)
      values (v_insc, v_est);
    end loop;
  end loop;

  begin
    insert into public.inscricoes (modalidade_categoria_id, turma_id, tipo, nome_equipe)
    values (v_cat, v_turma, 'equipe', 'Equipe 6');
    raise exception 'FALHOU: a 6ª equipe do quiz foi aceita.';
  exception when others then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if position('Limite de 5' in sqlerrm) = 0 then
      raise exception 'FALHOU: mensagem inesperada no teste 3: %', sqlerrm;
    end if;
  end;
end
$$;

-- ---------------------------------------------------------------------
-- Teste 4/5/7: rascunho não pontua; oficial pontua 100/50/25 uma vez
-- ---------------------------------------------------------------------
do $$
declare
  v_fm uuid;
  v_ff uuid;
  v_t101 uuid;
  v_t201 uuid;
  v_t301 uuid;
  v_pontos numeric;
begin
  select id into v_t101 from public.turmas where numero = 101;
  select id into v_t201 from public.turmas where numero = 201;
  select id into v_t301 from public.turmas where numero = 301;

  select mc.id into v_fm from public.modalidade_categorias mc
  join public.modalidades m on m.id = mc.modalidade_id
  where m.slug = 'futsal' and mc.nome = 'Masculino';

  select mc.id into v_ff from public.modalidade_categorias mc
  join public.modalidades m on m.id = mc.modalidade_id
  where m.slug = 'futsal' and mc.nome = 'Feminino';

  insert into public.resultados (modalidade_categoria_id, turma_id, colocacao, status) values
    (v_fm, v_t101, 1, 'rascunho'),
    (v_fm, v_t201, 2, 'rascunho'),
    (v_fm, v_t301, 3, 'rascunho');

  select pontos into v_pontos from public.vw_classificacao_esportiva where turma_id = v_t101;
  if v_pontos <> 0 then
    raise exception 'FALHOU: resultado em rascunho alterou a classificação (%).', v_pontos;
  end if;

  update public.resultados set status = 'oficial' where modalidade_categoria_id = v_fm;

  select pontos into v_pontos from public.vw_classificacao_esportiva where turma_id = v_t101;
  if v_pontos <> 100 then
    raise exception 'FALHOU: 1º lugar deveria valer 100, obteve %.', v_pontos;
  end if;
  select pontos into v_pontos from public.vw_classificacao_esportiva where turma_id = v_t201;
  if v_pontos <> 50 then
    raise exception 'FALHOU: 2º lugar deveria valer 50, obteve %.', v_pontos;
  end if;
  select pontos into v_pontos from public.vw_classificacao_esportiva where turma_id = v_t301;
  if v_pontos <> 25 then
    raise exception 'FALHOU: 3º lugar deveria valer 25, obteve %.', v_pontos;
  end if;

  insert into public.resultados (modalidade_categoria_id, turma_id, colocacao, status) values
    (v_ff, v_t101, 1, 'oficial'),
    (v_ff, v_t201, 2, 'oficial'),
    (v_ff, v_t301, 3, 'oficial');

  select pontos into v_pontos from public.vw_classificacao_esportiva where turma_id = v_t101;
  if v_pontos <> 200 then
    raise exception 'FALHOU: categoria/gênero deveria pontuar de novo (esperado 200, obteve %).', v_pontos;
  end if;

  select ouros into v_pontos from public.vw_medalheiro where turma_id = v_t101;
  if v_pontos <> 2 then
    raise exception 'FALHOU: medalheiro deveria ter 2 ouros para 101, obteve %.', v_pontos;
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- Teste 8a: mudar a pontuação no admin reflete no site
-- ---------------------------------------------------------------------
do $$
declare
  v_t101 uuid;
  v_pontos numeric;
begin
  select id into v_t101 from public.turmas where numero = 101;
  update public.pontuacao_colocacao set pontos = 200 where colocacao = 1;

  select pontos into v_pontos from public.vw_classificacao_esportiva where turma_id = v_t101;
  if v_pontos <> 400 then
    raise exception 'FALHOU: alteração de pontuação não refletiu (esperado 400, obteve %).', v_pontos;
  end if;

  update public.pontuacao_colocacao set pontos = 100 where colocacao = 1;
end
$$;

-- ---------------------------------------------------------------------
-- Teste 8b: mudar o limite da modalidade no admin passa a valer
-- ---------------------------------------------------------------------
do $$
declare
  v_turma uuid;
  v_cat   uuid;
  v_insc  uuid;
  v_est   uuid;
begin
  select id into v_turma from public.turmas where numero = 101;
  select mc.id into v_cat
  from public.modalidade_categorias mc
  join public.modalidades m on m.id = mc.modalidade_id
  where m.slug = 'futsal' and mc.nome = 'Masculino';

  select id into v_insc from public.inscricoes
  where modalidade_categoria_id = v_cat and turma_id = v_turma
  order by created_at limit 1;

  update public.modalidade_categorias
     set tamanho_equipe_max = 9, max_participantes_por_turma = 9
   where id = v_cat;

  select id into v_est from public.estudantes
  where turma_id = v_turma and nome_completo = 'Aluno 9 Teste';

  insert into public.inscricao_participantes (inscricao_id, estudante_id)
  values (v_insc, v_est);

  if (select count(*) from public.inscricao_participantes where inscricao_id = v_insc) <> 9 then
    raise exception 'FALHOU: novo limite de 9 não foi aplicado.';
  end if;

  update public.modalidade_categorias
     set tamanho_equipe_max = 8, max_participantes_por_turma = 8
   where id = v_cat;
end
$$;

-- ---------------------------------------------------------------------
-- Teste 6: desempate configurável e empate persistente
-- ---------------------------------------------------------------------
do $$
declare
  v_fm uuid;
  v_ff uuid;
  v_t101 uuid;
  v_t201 uuid;
  v_pos101 bigint;
  v_pos201 bigint;
  v_empate boolean;
begin
  select id into v_t101 from public.turmas where numero = 101;
  select id into v_t201 from public.turmas where numero = 201;

  select mc.id into v_fm from public.modalidade_categorias mc
  join public.modalidades m on m.id = mc.modalidade_id
  where m.slug = 'futsal' and mc.nome = 'Masculino';
  select mc.id into v_ff from public.modalidade_categorias mc
  join public.modalidades m on m.id = mc.modalidade_id
  where m.slug = 'futsal' and mc.nome = 'Feminino';

  delete from public.resultados;

  insert into public.resultados (modalidade_categoria_id, turma_id, colocacao, status) values
    (v_fm, v_t101, 1, 'oficial'),
    (v_fm, v_t201, 2, 'oficial'),
    (v_ff, v_t201, 2, 'oficial');

  select posicao into v_pos101 from public.vw_classificacao_esportiva where turma_id = v_t101;
  select posicao into v_pos201 from public.vw_classificacao_esportiva where turma_id = v_t201;
  if v_pos101 <> 1 or v_pos201 <> 2 then
    raise exception 'FALHOU: desempate por ouros não aplicado (101=%, 201=%).', v_pos101, v_pos201;
  end if;

  delete from public.resultados;

  insert into public.resultados (modalidade_categoria_id, turma_id, colocacao, status) values
    (v_fm, v_t101, 1, 'oficial'),
    (v_fm, v_t201, 2, 'oficial'),
    (v_ff, v_t201, 1, 'oficial'),
    (v_ff, v_t101, 2, 'oficial');

  select posicao, empate_persistente into v_pos101, v_empate
  from public.vw_classificacao_esportiva where turma_id = v_t101;
  select posicao into v_pos201 from public.vw_classificacao_esportiva where turma_id = v_t201;

  if v_pos101 <> v_pos201 or not v_empate then
    raise exception 'FALHOU: empate persistente não sinalizado (101=%, 201=%, empate=%).', v_pos101, v_pos201, v_empate;
  end if;

  perform public.fn_definir_desempate(
    'classificacao_geral',
    array['conduta', 'ouros', 'pratas', 'bronzes']
  );
  insert into public.conduta_ocorrencias (turma_id, descricao, pontos_desconto) values (v_t201, 'Teste de conduta', 5);

  select posicao into v_pos101 from public.vw_classificacao_esportiva where turma_id = v_t101;
  select posicao into v_pos201 from public.vw_classificacao_esportiva where turma_id = v_t201;
  if v_pos101 <> 1 or v_pos201 <> 2 then
    raise exception 'FALHOU: ordem de desempate alterada não foi aplicada (101=%, 201=%).', v_pos101, v_pos201;
  end if;

  perform public.fn_definir_desempate(
    'classificacao_geral',
    array['ouros', 'pratas', 'bronzes']
  );
  delete from public.conduta_ocorrencias where descricao = 'Teste de conduta';
end
$$;

-- ---------------------------------------------------------------------
-- Teste 9: Queimada premia só 1º e 2º; Bandeirinha bloqueia jogos
-- ---------------------------------------------------------------------
do $$
declare
  v_cat  uuid;
  v_t101 uuid;
  v_t201 uuid;
  v_min  smallint;
begin
  select id into v_t101 from public.turmas where numero = 101;
  select id into v_t201 from public.turmas where numero = 201;

  select mc.id into v_cat from public.modalidade_categorias mc
  join public.modalidades m on m.id = mc.modalidade_id
  where m.slug = 'queimada';

  begin
    insert into public.resultados (modalidade_categoria_id, turma_id, colocacao, status)
    values (v_cat, v_t101, 3, 'rascunho');
    raise exception 'FALHOU: queimada aceitou 3º lugar.';
  exception when others then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if position('premia apenas 2' in sqlerrm) = 0 then
      raise exception 'FALHOU: mensagem inesperada no teste 9 (queimada): %', sqlerrm;
    end if;
  end;

  select mc.id into v_cat from public.modalidade_categorias mc
  join public.modalidades m on m.id = mc.modalidade_id
  where m.slug = 'bandeirinha';

  update public.modalidade_categorias set min_participantes_partida = null where id = v_cat;

  begin
    insert into public.partidas (modalidade_categoria_id, fase) values (v_cat, 'classificatoria');
    raise exception 'FALHOU: bandeirinha aceitou jogo sem mínimo definido.';
  exception when others then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if position('Mínimo de participantes não definido' in sqlerrm) = 0 then
      raise exception 'FALHOU: mensagem inesperada no teste 9 (bandeirinha): %', sqlerrm;
    end if;
  end;

  update public.modalidade_categorias set min_participantes_partida = 4 where id = v_cat;
  insert into public.partidas (modalidade_categoria_id, fase) values (v_cat, 'classificatoria');
end
$$;

-- ---------------------------------------------------------------------
-- Teste 10: lista pública apenas com "Nome S."
-- ---------------------------------------------------------------------
do $$
declare
  v_turma uuid;
  v_est   uuid;
  v_cat   uuid;
  v_insc  uuid;
  v_nome  text;
begin
  select id into v_turma from public.turmas where numero = 101;
  select id into v_est from public.estudantes
  where turma_id = v_turma and nome_completo = 'João Silva';

  select mc.id into v_cat from public.modalidade_categorias mc
  join public.modalidades m on m.id = mc.modalidade_id
  where m.slug = 'xadrez' and mc.nome = 'Masculino';

  insert into public.inscricoes (modalidade_categoria_id, turma_id, tipo, status)
  values (v_cat, v_turma, 'individual', 'pendente') returning id into v_insc;

  insert into public.inscricao_participantes (inscricao_id, estudante_id)
  values (v_insc, v_est);

  update public.inscricoes set status = 'aprovada' where id = v_insc;

  select participantes[1] into v_nome
  from public.vw_participantes_publico where inscricao_id = v_insc;

  if v_nome <> 'João S.' then
    raise exception 'FALHOU: nome público incorreto: %', v_nome;
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- Correção de resultado oficial exige confirmação e gera histórico
-- ---------------------------------------------------------------------
do $$
declare
  v_cat uuid;
  v_t101 uuid;
  v_res uuid;
  v_hist integer;
begin
  select id into v_t101 from public.turmas where numero = 101;
  select mc.id into v_cat from public.modalidade_categorias mc
  join public.modalidades m on m.id = mc.modalidade_id
  where m.slug = 'domino';

  insert into public.resultados (modalidade_categoria_id, turma_id, colocacao, status)
  values (v_cat, v_t101, 1, 'oficial') returning id into v_res;

  begin
    update public.resultados set colocacao = 2 where id = v_res;
    raise exception 'FALHOU: correção oficial direta foi aceita.';
  exception when others then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if position('confirmação explícita' in sqlerrm) = 0 then
      raise exception 'FALHOU: mensagem inesperada na correção: %', sqlerrm;
    end if;
  end;

  perform public.fn_corrigir_resultado(v_res, 2::smallint, 'Correção de teste');

  select count(*) into v_hist from public.resultados_historico where resultado_id = v_res;
  if v_hist < 2 then
    raise exception 'FALHOU: histórico incompleto (%).', v_hist;
  end if;

  if (select colocacao from public.resultados where id = v_res) <> 2 then
    raise exception 'FALHOU: correção confirmada não foi aplicada.';
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- Taça: notas por jurado, escala, fórmula e publicação controlada
-- ---------------------------------------------------------------------
do $$
declare
  v_jurado uuid;
  v_c101 uuid;
  v_c201 uuid;
  v_c301 uuid;
  v_crit uuid;
begin
  select id into v_crit from public.taca_criterios where chave = 'mobilizacao_participacao';
  insert into public.taca_jurados (nome) values ('Jurado Teste') returning id into v_jurado;
  select id into v_c101 from public.turmas where numero = 101;
  select id into v_c201 from public.turmas where numero = 201;
  select id into v_c301 from public.turmas where numero = 301;

  insert into public.taca_notas (jurado_id, turma_id, criterio_id, nota) values
    (v_jurado, v_c101, v_crit, 10),
    (v_jurado, v_c201, v_crit, 5);

  if not exists (select 1 from public.fn_classificacao_taca()) then
    raise exception 'FALHOU: Taça não retornou ranking para o admin.';
  end if;

  if not (select formula_completa from public.fn_classificacao_taca() limit 1) then
    raise exception 'FALHOU: soma dos pesos da Taça deveria fechar 100.';
  end if;

  begin
    insert into public.taca_notas (jurado_id, turma_id, criterio_id, nota)
    values (v_jurado, v_c301, v_crit, 11);
    raise exception 'FALHOU: nota fora da escala foi aceita.';
  exception when others then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if position('fora da escala' in sqlerrm) = 0 then
      raise exception 'FALHOU: mensagem inesperada na escala da Taça: %', sqlerrm;
    end if;
  end;
end
$$;

select set_config('request.jwt.claim.sub', '', true);
set local role anon;

do $$
begin
  if (select count(*) from public.vw_taca_publica) <> 0 then
    raise exception 'FALHOU: Taça não publicada apareceu no portal.';
  end if;
end
$$;

reset role;

update public.configuracoes set valor = 'true'::jsonb where chave = 'taca_publicada';
select set_config('request.jwt.claim.sub', '', true);
set local role anon;

do $$
begin
  if (select count(*) from public.vw_taca_publica) = 0 then
    raise exception 'FALHOU: Taça publicada não apareceu no portal.';
  end if;
end
$$;

reset role;
update public.configuracoes set valor = 'false'::jsonb where chave = 'taca_publicada';
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

-- ---------------------------------------------------------------------
-- Teste 12: /admin sem login é bloqueado (RLS)
-- ---------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '99999999-9999-9999-9999-999999999999', true);
set local role authenticated;

do $$
begin
  begin
    insert into public.resultados (modalidade_categoria_id, turma_id, colocacao)
    select mc.id, t.id, 1
    from public.modalidade_categorias mc
    join public.modalidades m on m.id = mc.modalidade_id
    cross join (select id from public.vw_turmas_publicas where numero = 302) t
    where m.slug = 'damas' and mc.nome = 'Masculino';
    raise exception 'FALHOU: usuário sem admin conseguiu inserir resultado.';
  exception when insufficient_privilege then
    null;
  end;
end
$$;

reset role;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

set local role anon;

do $$
begin
  begin
    perform 1 from public.estudantes;
    raise exception 'FALHOU: anon conseguiu ler estudantes.';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform 1 from public.turmas;
    raise exception 'FALHOU: anon conseguiu ler representantes das turmas.';
  exception when insufficient_privilege then
    null;
  end;

  perform 1 from public.vw_turmas_publicas;
end
$$;

reset role;

-- ---------------------------------------------------------------------
-- Conflito de horário detectado (alerta)
-- ---------------------------------------------------------------------
do $$
declare
  v_cat  uuid;
  v_t101 uuid;
  v_p1   uuid;
  v_p2   uuid;
  v_qtd  integer;
begin
  select id into v_t101 from public.turmas where numero = 101;
  select mc.id into v_cat from public.modalidade_categorias mc
  join public.modalidades m on m.id = mc.modalidade_id
  where m.slug = 'futsal' and mc.nome = 'Masculino';

  insert into public.partidas (modalidade_categoria_id, fase, data_hora, status)
  values (v_cat, 'classificatoria', '2026-11-24 08:00-03', 'programado') returning id into v_p1;
  insert into public.partidas (modalidade_categoria_id, fase, data_hora, status)
  values (v_cat, 'classificatoria', '2026-11-24 08:00-03', 'programado') returning id into v_p2;

  insert into public.partida_participantes (partida_id, turma_id) values (v_p1, v_t101);
  insert into public.partida_participantes (partida_id, turma_id) values (v_p2, v_t101);

  select count(*) into v_qtd from public.fn_conflitos_horario();
  if v_qtd < 1 then
    raise exception 'FALHOU: conflito de horário não detectado.';
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- Verificação de administrador (painel)
-- ---------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '99999999-9999-9999-9999-999999999999', true);
set local role authenticated;

do $$
begin
  if public.fn_sou_admin() then
    raise exception 'FALHOU: fn_sou_admin liberou usuário sem vínculo.';
  end if;
end
$$;

reset role;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
set local role authenticated;

do $$
begin
  if not public.fn_sou_admin() then
    raise exception 'FALHOU: fn_sou_admin não reconheceu o administrador.';
  end if;

  if (select count(*) from public.admins where user_id = auth.uid()) <> 1 then
    raise exception 'FALHOU: admin não consegue ler o próprio vínculo.';
  end if;
end
$$;

reset role;

rollback;

\echo 'TODOS OS TESTES DE BANCO DA FASE 1 PASSARAM'
