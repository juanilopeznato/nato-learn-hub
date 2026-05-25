-- Hardening pre-lanzamiento (12 jun 2026).
-- Aplicar UNA VEZ en Supabase Dashboard → SQL Editor.
--
-- Cierra:
--  1. Doble enrollment por reintento de webhook MP (idempotencia DB-side)
--  2. RPC confirm_payment idempotente para llamar desde edge function
--  3. Índice para acelerar lookups por mp_payment_id

-- ─── 1) UNIQUE en enrollments.mp_payment_id ──────────────────────────
-- Permite NULL múltiples (cursos gratis), pero un mp_payment_id no puede
-- aparecer dos veces. Si MP reintenta el webhook, el INSERT falla y la
-- edge function tiene que tratarlo como "ya procesado".
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'enrollments_mp_payment_id_unique'
  ) then
    -- Limpiar duplicados pre-existentes (si los hay) antes de agregar la constraint
    delete from public.enrollments e1
    using public.enrollments e2
    where e1.id < e2.id
      and e1.mp_payment_id is not null
      and e1.mp_payment_id = e2.mp_payment_id;

    alter table public.enrollments
      add constraint enrollments_mp_payment_id_unique
      unique (mp_payment_id);
  end if;
end $$;

create index if not exists enrollments_mp_payment_id_idx
  on public.enrollments (mp_payment_id)
  where mp_payment_id is not null;

-- ─── 2) RPC idempotente para que el webhook llame ────────────────────
-- Reemplaza el INSERT directo en la edge function. Hace UPSERT por
-- mp_payment_id: si ya existe, no duplica. Devuelve enrollment_id final.
create or replace function public.confirm_payment(
  p_mp_payment_id text,
  p_course_id     uuid,
  p_student_id    uuid,
  p_tenant_id     uuid,
  p_amount_ars    numeric,
  p_mp_status     text default 'approved'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enrollment_id uuid;
begin
  -- ¿Ya existe esta inscripción para este pago?
  select id into v_enrollment_id
  from public.enrollments
  where mp_payment_id = p_mp_payment_id
  limit 1;

  if v_enrollment_id is not null then
    -- Idempotente: ya estaba. Actualizamos status por si cambió.
    update public.enrollments
      set mp_status = p_mp_status,
          paid_amount = coalesce(paid_amount, p_amount_ars)
      where id = v_enrollment_id;
    return v_enrollment_id;
  end if;

  -- ¿El alumno ya está inscripto por otro medio (cortesía, otro pago)?
  select id into v_enrollment_id
  from public.enrollments
  where course_id = p_course_id
    and student_id = p_student_id
  limit 1;

  if v_enrollment_id is not null then
    -- Asocio este pago a la inscripción existente
    update public.enrollments
      set mp_payment_id = p_mp_payment_id,
          mp_status = p_mp_status,
          paid_amount = coalesce(paid_amount, p_amount_ars)
      where id = v_enrollment_id;
    return v_enrollment_id;
  end if;

  -- Nueva inscripción
  insert into public.enrollments (
    tenant_id, course_id, student_id,
    mp_payment_id, mp_status, paid_amount, enrolled_at
  ) values (
    p_tenant_id, p_course_id, p_student_id,
    p_mp_payment_id, p_mp_status, p_amount_ars, now()
  )
  returning id into v_enrollment_id;

  return v_enrollment_id;
end;
$$;

revoke all on function public.confirm_payment(text, uuid, uuid, uuid, numeric, text) from public;
grant execute on function public.confirm_payment(text, uuid, uuid, uuid, numeric, text) to service_role;

-- ─── 3) UNIQUE en certificates.verification_code ─────────────────────
-- Para que no haya colisiones de códigos de verificación.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'certificates_verification_code_unique'
  ) then
    alter table public.certificates
      add constraint certificates_verification_code_unique
      unique (verification_code);
  end if;
end $$;

-- ─── 4) Índices útiles pre-launch ────────────────────────────────────
-- Acelera el query de "mis cursos" en Dashboard (filtro por student_id + status)
create index if not exists enrollments_student_status_idx
  on public.enrollments (student_id, mp_status);

-- Acelera lookup de cursos por slug en CourseDetail
create index if not exists courses_slug_published_idx
  on public.courses (slug, is_published)
  where is_published = true;

-- ─── 5) Constraint: enrolled_at no nulo ──────────────────────────────
-- Para que las consultas con .order('enrolled_at') no devuelvan rows con NULL
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'enrollments'
      and column_name = 'enrolled_at'
      and is_nullable = 'YES'
  ) then
    -- Backfill primero
    update public.enrollments set enrolled_at = created_at where enrolled_at is null;
    -- Luego NOT NULL
    alter table public.enrollments alter column enrolled_at set not null;
    alter table public.enrollments alter column enrolled_at set default now();
  end if;
end $$;
