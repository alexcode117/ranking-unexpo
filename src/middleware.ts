import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refresca la sesión de Supabase y protege /admin.
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !llave) return NextResponse.next();

  let respuesta = NextResponse.next({ request });
  const supabase = createServerClient(url, llave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const enLogin = request.nextUrl.pathname === "/admin/login";
  if (!user && !enLogin) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (user && enLogin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  return respuesta;
}

export const config = { matcher: ["/admin/:path*"] };
