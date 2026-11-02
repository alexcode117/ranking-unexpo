# Ranking UNEXPO · Dibujo Técnico I y II

Sitio con dos partes:

- **Público** (`/`, `/dibujo-1`, `/dibujo-1/seccion-01`): solo lectura. Ranking por materia y por sección, cédula enmascarada, búsqueda por cédula, histórico por lapso.
- **Admin** (`/admin`): lapsos, secciones, evaluaciones con su valor en puntos, carga de CSV/Excel con vista previa y edición de notas a mano.

Sin Supabase configurado, el sitio público muestra **datos de demostración** (nombres ficticios).

---

## 1. Probar en tu computadora

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## 2. Crear la base de datos (Supabase)

1. Crea una cuenta en https://supabase.com y un proyecto nuevo (región: la más cercana, p. ej. *East US*).
2. Ve a **SQL Editor → New query**, pega todo el contenido de `supabase/schema.sql` y pulsa **Run**.
3. Ve a **Authentication → Users → Add user → Create new user**. Pon tu correo y una contraseña y marca *Auto Confirm User*.
4. Copia el **User UID** de tu usuario y ejecuta en el SQL Editor:

   ```sql
   insert into admins (user_id) values ('PEGA-AQUI-TU-USER-UID');
   ```

5. Ve a **Authentication → Sign In / Providers** y desactiva **Allow new users to sign up**, para que nadie más pueda crear cuentas.
6. Ve a **Project Settings → API** y copia la **Project URL** y la llave **anon public**.

## 3. Conectar el proyecto

Crea un archivo `.env.local` en la raíz (puedes copiar `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Reinicia `npm run dev`, entra a http://localhost:3000/admin e inicia sesión.

## 4. Publicar en internet (Vercel)

1. Sube esta carpeta a un repositorio de GitHub (puede ser privado).
2. En https://vercel.com → **Add New → Project**, importa el repositorio.
3. En **Environment Variables** agrega las mismas dos variables del paso 3.
4. Pulsa **Deploy**. Vercel te da un enlace `https://tu-proyecto.vercel.app` para compartir con los estudiantes.

Cada vez que subas cambios a GitHub, Vercel publica la nueva versión sola. Las notas viven en Supabase, así que cargarlas no requiere volver a publicar.

---

## Uso del panel admin

1. **Lapso**: crea el lapso (p. ej. `2026-II`). El primero queda "en curso"; los demás quedan como histórico.
2. **Secciones**: agrega las secciones de cada materia (`01`, `02`…).
3. **Evaluaciones**: dentro de cada sección, crea las evaluaciones con su valor. La suma no puede pasar de 100.
4. **Cargar archivo**: elige si el archivo trae solo la lista o las notas de una evaluación, y arrastra el `.csv` o `.xlsx`.
   - Se detectan solas las columnas *nombre / apellido*, *cédula / C.I.* y *nota / puntos*. Si no, se eligen a mano.
   - La vista previa muestra estudiantes nuevos, notas que cambian y filas con errores antes de guardar.
   - El estudiante se identifica por la cédula, así que volver a subir una lista no duplica a nadie.
5. **Grilla de notas**: edita cualquier nota y se guarda al salir de la celda. Vacía la celda para borrar la nota.

## Cómo se calcula el ranking

- **Por sección**: puntos acumulados (suma de notas).
- **Por materia**: rendimiento = puntos ÷ puntos ya evaluados en su sección, para que las secciones con distinto avance sean comparables.
- **Rango** según el puesto (percentil) dentro de la lista:

  | Rango | Nombre | Percentil |
  |---|---|---|
  | 9H | Arquitecto del plano | top 5 % |
  | 4H | Maestro del trazo | 5–15 % |
  | 2H | Proyectista | 15–30 % |
  | HB | Delineante | 30–50 % |
  | 2B | Croquis | 50–70 % |
  | 4B | Boceto | 70–85 % |
  | 6B | Garabato | 85–100 % |

- **Tendencia** (▲▼): puestos ganados o perdidos respecto a antes de la evaluación más reciente.
- Empates comparten puesto y rango. Sin notas cargadas se muestra la "Hoja en blanco".

## Agregar otra materia en el futuro

1. En Supabase: `insert into materias (slug, nombre, tema, orden) values ('fisica-1', 'Física I', 'fisica', 3);`
2. En `src/lib/temas.ts`: agrega el tema `fisica` con su propia escala de rangos.
3. En `src/app/globals.css`: agrega la clase `.tema-fisica` con sus colores.

## Privacidad

- La cédula completa nunca llega al sitio público: la base de datos la entrega ya enmascarada (`V-27.***.481`).
- La búsqueda por cédula solo devuelve qué fila resaltar.
- Las tablas de estudiantes y notas solo se pueden leer o modificar con tu usuario admin (Row Level Security).
