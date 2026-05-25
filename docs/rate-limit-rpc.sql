-- Rate limit en backend (Postgres) — defense in depth.
--
-- El frontend ya tiene honeypots + cooldown timing, pero un atacante con
-- DevTools sortea eso. Esta RPC chequea contra una tabla de eventos por
-- (action, identifier) en una ventana de tiempo.
--
-- Aplicar UNA VEZ en Supabase Dashboard → SQL Editor.
--
-- Usar desde frontend:
--   const { data: allowed } = await supabase.rpc('check_rate_limit', {
--     p_action: 'forgot_password',
--     p_identifier: email,
--     p_max: 3,
--     p_window_seconds: 60 * 60,  // 3 / hora
--   })
--   if (!allowed) toast.error('Demasiados intentos. Probá en 1h.')

create table if not exists public.rate_limits (
  id          bigserial primary key,
  action      text not null,
  identifier  text not null,
  created_at  timestamptz not null default now()
);

create index if not exists rate_limits_lookup_idx
  on public.rate_limits (action, identifier, created_at desc);

-- Auto-cleanup: borrar entries de más de 24h (cron diario o vacuum manual)
create index if not exists rate_limits_old_idx on public.rate_limits (created_at)
  where created_at < now() - interval '24 hours';

create or replace function public.check_rate_limit(
  p_action          text,
  p_identifier      text,
  p_max             int default 5,
  p_window_seconds  int default 3600
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_norm_id text;
begin
  -- Normalizar identifier: lowercase y trim (emails sobre todo)
  v_norm_id := lower(trim(coalesce(p_identifier, '')));
  if length(v_norm_id) = 0 then
    return true; -- sin identifier no podemos limitar — dejamos pasar
  end if;

  -- Contar hits en la ventana
  select count(*) into v_count
  from public.rate_limits
  where action = p_action
    and identifier = v_norm_id
    and created_at > (now() - (p_window_seconds || ' seconds')::interval);

  if v_count >= p_max then
    return false; -- bloqueado
  end if;

  -- Registrar el hit
  insert into public.rate_limits (action, identifier)
  values (p_action, v_norm_id);

  return true; -- permitido
end;
$$;

grant execute on function public.check_rate_limit(text, text, int, int) to authenticated, anon;

-- Cleanup function — correr semanal via pg_cron o manualmente
create or replace function public.cleanup_old_rate_limits()
returns int
language plpgsql
security definer
as $$
declare
  v_deleted int;
begin
  delete from public.rate_limits where created_at < now() - interval '7 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

grant execute on function public.cleanup_old_rate_limits() to authenticated;
