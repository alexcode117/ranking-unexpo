-- =====================================================================
-- Ranking UNEXPO · esquema de base de datos
-- Ejecutar completo en Supabase → SQL Editor → New query → Run.
-- Puede volver a ejecutarse sin perder datos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

-- Una fila por materia. "tema" elige el estilo visual y la escala de rangos
-- en el frontend (src/lib/temas.ts).
create table if not exists materias (
  id      uuid primary key default gen_random_uuid(),
  slug    text not null unique check (slug ~ '^[a-z0-9-]+$'),
  nombre  text not null,
  tema    text not null default 'dibujo',
  orden   int  not null default 0
);

create table if not exists lapsos (
  id      uuid primary key default gen_random_uuid(),
  codigo  text not null unique,            -- p. ej. 2026-II
  activo  boolean not null default false,
  creado  timestamptz not null default now()
);
-- Solo un lapso activo a la vez.
create unique index if not exists lapsos_un_activo on lapsos (activo) where activo;

create table if not exists secciones (
  id          uuid primary key default gen_random_uuid(),
  materia_id  uuid not null references materias(id) on delete restrict,
  lapso_id    uuid not null references lapsos(id)   on delete restrict,
  codigo      text not null check (codigo ~ '^[A-Za-z0-9-]+$'),  -- p. ej. 01
  unique (materia_id, lapso_id, codigo)
);
create index if not exists secciones_lapso on secciones (lapso_id);

-- La cédula se guarda normalizada: letra + dígitos, p. ej. V27123481.
create table if not exists estudiantes (
  id      uuid primary key default gen_random_uuid(),
  cedula  text not null unique check (cedula ~ '^[VE][0-9]{5,10}$'),
  nombre  text not null check (length(trim(nombre)) > 0)
);

create table if not exists inscripciones (
  seccion_id     uuid not null references secciones(id)   on delete cascade,
  estudiante_id  uuid not null references estudiantes(id) on delete restrict,
  primary key (seccion_id, estudiante_id)
);
create index if not exists inscripciones_estudiante on inscripciones (estudiante_id);

create table if not exists evaluaciones (
  id          uuid primary key default gen_random_uuid(),
  seccion_id  uuid not null references secciones(id) on delete cascade,
  nombre      text not null check (length(trim(nombre)) > 0),
  puntos      numeric(5,2) not null check (puntos > 0 and puntos <= 100),
  orden       int not null default 0
);
create index if not exists evaluaciones_seccion on evaluaciones (seccion_id);

create table if not exists notas (
  evaluacion_id  uuid not null references evaluaciones(id) on delete cascade,
  estudiante_id  uuid not null references estudiantes(id)  on delete cascade,
  puntos         numeric(5,2) not null check (puntos >= 0),
  actualizado    timestamptz not null default now(),
  primary key (evaluacion_id, estudiante_id)
);
create index if not exists notas_estudiante on notas (estudiante_id);

-- Usuarios con permiso de administración (tu usuario de Supabase Auth).
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- ---------------------------------------------------------------------
-- Reglas que la base de datos garantiza
-- ---------------------------------------------------------------------

-- Una nota no puede superar el valor de su evaluación.
create or replace function validar_nota() returns trigger
language plpgsql set search_path = public as $$
declare maximo numeric;
begin
  select puntos into maximo from evaluaciones where id = new.evaluacion_id;
  if new.puntos > maximo then
    raise exception 'La nota % supera el máximo de la evaluación (%)', new.puntos, maximo
      using errcode = 'check_violation';
  end if;
  new.actualizado := now();
  return new;
end $$;

drop trigger if exists notas_validar on notas;
create trigger notas_validar before insert or update on notas
  for each row execute function validar_nota();

-- La suma de evaluaciones de una sección no puede pasar de 100,
-- y bajar el valor de una evaluación no puede dejar notas por encima.
create or replace function validar_ponderacion() returns trigger
language plpgsql set search_path = public as $$
declare total numeric;
begin
  select coalesce(sum(puntos), 0) into total
    from evaluaciones where seccion_id = new.seccion_id and id <> new.id;
  if total + new.puntos > 100 then
    raise exception 'La ponderación de la sección quedaría en % (máximo 100)', total + new.puntos
      using errcode = 'check_violation';
  end if;
  if tg_op = 'UPDATE' and exists (
    select 1 from notas where evaluacion_id = new.id and puntos > new.puntos
  ) then
    raise exception 'Hay notas mayores a % en esta evaluación', new.puntos
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists evaluaciones_validar on evaluaciones;
create trigger evaluaciones_validar before insert or update on evaluaciones
  for each row execute function validar_ponderacion();

-- ---------------------------------------------------------------------
-- Funciones auxiliares
-- ---------------------------------------------------------------------

create or replace function es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- 'V-27.123.481', 'v 27123481', '27123481' → 'V27123481'
create or replace function normalizar_cedula(c text) returns text
language sql immutable as $$
  select case
    when ltrim(regexp_replace(coalesce(c, ''), '[^0-9]', '', 'g'), '0') = '' then null
    else coalesce(upper(substring(trim(c) from '^[VvEe]')), 'V')
         || ltrim(regexp_replace(c, '[^0-9]', '', 'g'), '0')
  end;
$$;

-- 'V27123481' → 'V-27.***.481'
create or replace function enmascarar_cedula(c text) returns text
language sql immutable as $$
  select left(c, 1) || '-' || substring(c from 2 for greatest(length(c) - 7, 1)) || '.***.' || right(c, 3);
$$;

-- ---------------------------------------------------------------------
-- Lectura pública (sin exponer la cédula completa)
-- ---------------------------------------------------------------------

-- Puntajes de todos los estudiantes de una materia en un lapso.
-- El orden, el rango y la tendencia se calculan en el frontend.
--   puntos_previos:  puntos sin contar la evaluación más reciente con notas
--   evaluado:        suma del valor de las evaluaciones que ya tienen notas
create or replace function puntajes(p_materia uuid, p_lapso uuid)
returns table (
  seccion_id uuid, seccion text, estudiante_id uuid, nombre text, cedula text,
  puntos numeric, puntos_previos numeric, evaluado numeric, evaluado_previo numeric
)
language sql stable security definer set search_path = public as $$
  with sec as (
    select s.id, s.codigo from secciones s
    where s.materia_id = p_materia and s.lapso_id = p_lapso
  ),
  ev as (
    select e.id, e.seccion_id, e.puntos,
           row_number() over (partition by e.seccion_id order by e.orden desc, e.nombre desc) as reciente
    from evaluaciones e
    join sec on sec.id = e.seccion_id
    where exists (select 1 from notas n where n.evaluacion_id = e.id)
  ),
  totales_sec as (
    select ev.seccion_id,
           sum(ev.puntos) as evaluado,
           coalesce(sum(ev.puntos) filter (where ev.reciente > 1), 0) as evaluado_previo
    from ev group by ev.seccion_id
  )
  select sec.id, sec.codigo, est.id, est.nombre, enmascarar_cedula(est.cedula),
         coalesce(sum(n.puntos), 0),
         coalesce(sum(n.puntos) filter (where ev.reciente > 1), 0),
         coalesce(ts.evaluado, 0),
         coalesce(ts.evaluado_previo, 0)
  from sec
  join inscripciones i on i.seccion_id = sec.id
  join estudiantes est on est.id = i.estudiante_id
  left join ev on ev.seccion_id = sec.id
  left join notas n on n.evaluacion_id = ev.id and n.estudiante_id = est.id
  left join totales_sec ts on ts.seccion_id = sec.id
  group by sec.id, sec.codigo, est.id, est.nombre, est.cedula, ts.evaluado, ts.evaluado_previo;
$$;

-- Devuelve el id del estudiante si la cédula existe; nunca devuelve datos.
create or replace function buscar_cedula(p_cedula text) returns uuid
language sql stable security definer set search_path = public as $$
  select id from estudiantes where cedula = normalizar_cedula(p_cedula);
$$;

-- ---------------------------------------------------------------------
-- Importación desde CSV/Excel (solo admin), todo en una transacción.
-- p_filas: [{"cedula": "...", "nombre": "...", "puntos": 12.5 | null}, ...]
-- Si p_evaluacion es null solo se carga o actualiza la lista.
-- ---------------------------------------------------------------------
create or replace function importar_lista(p_seccion uuid, p_evaluacion uuid, p_filas jsonb)
returns int
language plpgsql security definer set search_path = public as $$
declare
  fila jsonb;
  ced text;
  nom text;
  est uuid;
  n int := 0;
begin
  if not es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_evaluacion is not null and not exists (
    select 1 from evaluaciones where id = p_evaluacion and seccion_id = p_seccion
  ) then
    raise exception 'La evaluación no pertenece a la sección';
  end if;

  for fila in select * from jsonb_array_elements(p_filas) loop
    ced := normalizar_cedula(fila->>'cedula');
    if ced is null then continue; end if;

    nom := nullif(trim(fila->>'nombre'), '');
    select id into est from estudiantes where cedula = ced;
    if est is null then
      if nom is null then
        raise exception 'Falta el nombre del estudiante con cédula %', ced;
      end if;
      insert into estudiantes (cedula, nombre) values (ced, nom) returning id into est;
    elsif nom is not null then
      update estudiantes set nombre = nom where id = est and nombre <> nom;
    end if;

    insert into inscripciones (seccion_id, estudiante_id)
    values (p_seccion, est) on conflict do nothing;

    if p_evaluacion is not null and fila->>'puntos' is not null then
      insert into notas (evaluacion_id, estudiante_id, puntos)
      values (p_evaluacion, est, (fila->>'puntos')::numeric)
      on conflict (evaluacion_id, estudiante_id) do update set puntos = excluded.puntos;
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- Seguridad (RLS)
-- Público: lee materias, lapsos, secciones y evaluaciones.
-- Estudiantes, inscripciones y notas solo se leen a través de las
-- funciones de arriba. El admin puede todo.
-- ---------------------------------------------------------------------
alter table materias      enable row level security;
alter table lapsos        enable row level security;
alter table secciones     enable row level security;
alter table evaluaciones  enable row level security;
alter table estudiantes   enable row level security;
alter table inscripciones enable row level security;
alter table notas         enable row level security;
alter table admins        enable row level security;

do $$
declare t text;
begin
  foreach t in array array['materias','lapsos','secciones','evaluaciones'] loop
    execute format('drop policy if exists lectura_publica on %I', t);
    execute format('create policy lectura_publica on %I for select using (true)', t);
  end loop;
  foreach t in array array['materias','lapsos','secciones','evaluaciones','estudiantes','inscripciones','notas'] loop
    execute format('drop policy if exists admin_todo on %I', t);
    execute format('create policy admin_todo on %I for all using (es_admin()) with check (es_admin())', t);
  end loop;
end $$;

drop policy if exists admin_se_ve on admins;
create policy admin_se_ve on admins for select using (user_id = auth.uid());

revoke execute on function importar_lista(uuid, uuid, jsonb) from public, anon;
grant  execute on function importar_lista(uuid, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Datos iniciales
-- ---------------------------------------------------------------------
insert into materias (slug, nombre, tema, orden) values
  ('dibujo-1', 'Dibujo Técnico I',  'dibujo',    1),
  ('dibujo-2', 'Dibujo Técnico II', 'dibujo-ii', 2)
on conflict (slug) do nothing;
