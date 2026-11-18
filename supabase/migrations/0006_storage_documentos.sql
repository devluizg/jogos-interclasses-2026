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
