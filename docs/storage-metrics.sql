-- Storage metrics helpers.
-- Aplicar UNA VEZ en Supabase Dashboard → SQL Editor.
--
-- Provee:
--   public.get_storage_usage()       — totales por bucket
--   public.get_storage_top_files(n)  — top N archivos más pesados por bucket
--
-- Ambas chequean rol = 'nato_owner' en profiles antes de devolver datos.
-- Lectura: NatoOwnerPanel → tab "Storage".

create or replace function public.get_storage_usage()
returns table (
  bucket_id   text,
  files       bigint,
  total_bytes bigint,
  largest_mb  numeric
)
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_role text;
begin
  select role into v_role from public.profiles
  where auth_id = auth.uid() limit 1;
  if v_role is null or v_role <> 'nato_owner' then
    raise exception 'forbidden: nato_owner only';
  end if;

  return query
  select
    o.bucket_id::text,
    count(*)::bigint as files,
    coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint as total_bytes,
    coalesce(max((o.metadata->>'size')::bigint), 0)::numeric / (1024.0 * 1024.0) as largest_mb
  from storage.objects o
  group by o.bucket_id;
end;
$$;

grant execute on function public.get_storage_usage() to authenticated;

create or replace function public.get_storage_top_files(p_bucket text, p_limit int default 20)
returns table (
  name      text,
  size_kb   numeric,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_role text;
begin
  select role into v_role from public.profiles
  where auth_id = auth.uid() limit 1;
  if v_role is null or v_role <> 'nato_owner' then
    raise exception 'forbidden: nato_owner only';
  end if;

  return query
  select
    o.name::text,
    ((o.metadata->>'size')::bigint / 1024.0)::numeric as size_kb,
    o.created_at
  from storage.objects o
  where o.bucket_id = p_bucket
  order by (o.metadata->>'size')::bigint desc nulls last
  limit p_limit;
end;
$$;

grant execute on function public.get_storage_top_files(text, int) to authenticated;

-- Snapshot diario opcional. Si querés histórico, descomentá y agendá un cron.
-- create table if not exists public.storage_snapshots (
--   id bigserial primary key,
--   captured_at timestamptz not null default now(),
--   bucket_id text not null,
--   files bigint not null,
--   total_bytes bigint not null
-- );
-- create index on public.storage_snapshots (captured_at desc);
