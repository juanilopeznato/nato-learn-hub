-- Devuelve los campos del tenant sin exponer credenciales (resend_api_key,
-- mp_access_token). En lugar de los valores reales, devuelve booleans
-- has_* para que el frontend sepa si están seteados.
--
-- Reemplaza el `select * from tenants` que estaba leakeando creds al cliente.
-- Aplicar UNA VEZ en Supabase Dashboard → SQL Editor.

create or replace function public.get_tenant_settings(p_tenant_id uuid)
returns table (
  id              uuid,
  name            text,
  slug            text,
  logo_url        text,
  primary_color   text,
  tagline         text,
  support_email   text,
  social_instagram text,
  social_whatsapp text,
  meta_pixel_id   text,
  mp_collector_id text,
  plan_name       text,
  plan_expires_at timestamptz,
  has_resend_api_key boolean,
  has_mp_access_token boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_tenant uuid;
  v_role text;
begin
  -- Validar que el caller pertenece al tenant solicitado, o es nato_owner
  select tenant_id, role into v_caller_tenant, v_role
  from public.profiles
  where auth_id = auth.uid()
  order by last_used_at desc nulls last
  limit 1;

  if v_caller_tenant is null then
    raise exception 'forbidden: no profile';
  end if;

  if v_role <> 'nato_owner' and v_caller_tenant <> p_tenant_id then
    raise exception 'forbidden: tenant mismatch';
  end if;

  return query
  select
    t.id,
    t.name::text,
    t.slug::text,
    t.logo_url::text,
    t.primary_color::text,
    t.tagline::text,
    t.support_email::text,
    t.social_instagram::text,
    t.social_whatsapp::text,
    t.meta_pixel_id::text,
    t.mp_collector_id::text,
    t.plan_name::text,
    t.plan_expires_at,
    (t.resend_api_key is not null and length(t.resend_api_key) > 0) as has_resend_api_key,
    (t.mp_access_token is not null and length(t.mp_access_token) > 0) as has_mp_access_token
  from public.tenants t
  where t.id = p_tenant_id;
end;
$$;

grant execute on function public.get_tenant_settings(uuid) to authenticated;

-- RPC para actualizar SOLO la resend_api_key (mp_access_token ya va por la
-- edge function update-tenant-mp-config que existe).
create or replace function public.update_tenant_resend_key(
  p_tenant_id uuid,
  p_api_key   text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_tenant uuid;
  v_role text;
begin
  select tenant_id, role into v_caller_tenant, v_role
  from public.profiles
  where auth_id = auth.uid()
  order by last_used_at desc nulls last
  limit 1;

  if v_caller_tenant is null then
    raise exception 'forbidden: no profile';
  end if;
  if v_role not in ('admin', 'instructor', 'nato_owner') then
    raise exception 'forbidden: insufficient role';
  end if;
  if v_role <> 'nato_owner' and v_caller_tenant <> p_tenant_id then
    raise exception 'forbidden: tenant mismatch';
  end if;

  -- Si el caller pasa string vacío o null, borramos la key
  update public.tenants
  set resend_api_key = case when p_api_key is null or length(p_api_key) = 0 then null else p_api_key end
  where id = p_tenant_id;
end;
$$;

grant execute on function public.update_tenant_resend_key(uuid, text) to authenticated;
