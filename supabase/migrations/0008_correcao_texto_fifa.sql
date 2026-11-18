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
