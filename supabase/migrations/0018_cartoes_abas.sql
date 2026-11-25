-- =====================================================================
-- 0018 - Abas de cartões por modalidade dentro de public.chaveamentos
--        (mesmo padrão da artilharia; idempotente)
-- =====================================================================

do $$
declare
  item record;
begin
  for item in
    select * from (values
      ('futsal', 'Futsal'),
      ('voleibol', 'Voleibol'),
      ('queimada', 'Queimada'),
      ('bandeirinha', 'Bandeirinha'),
      ('tenis-de-mesa', 'Tênis de Mesa'),
      ('damas', 'Damas'),
      ('tacobol', 'Tacobol'),
      ('xadrez', 'Xadrez'),
      ('fifa-26', 'FIFA 26'),
      ('circuito', 'Circuito'),
      ('cubo-magico', 'Cubo Mágico'),
      ('quiz', 'Quiz')
    ) as v(slug, titulo)
  loop
    update public.chaveamentos c
       set dados = jsonb_set(
             c.dados,
             '{abas}',
             coalesce(c.dados -> 'abas', '[]'::jsonb) || jsonb_build_array(
               jsonb_build_object(
                 'tipo', 'cartoes',
                 'id', 'cartoes-' || item.slug,
                 'titulo', 'Cartões — ' || item.titulo,
                 'subtitulo', 'Lançamento de cartões por atleta',
                 'modalidade', item.titulo,
                 'cartoes', '[]'::jsonb
               )
             )
           )
     where c.slug = item.slug
       and not exists (
         select 1
           from jsonb_array_elements(coalesce(c.dados -> 'abas', '[]'::jsonb)) aba
          where aba ->> 'tipo' = 'cartoes'
       );
  end loop;
end $$;

notify pgrst, 'reload schema';
