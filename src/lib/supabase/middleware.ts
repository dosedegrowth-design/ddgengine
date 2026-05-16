/**
 * Middleware Supabase — gerencia refresh de session em cada request.
 * Chamado a partir de /middleware.ts na raiz.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "ddg_engine" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: chamar getUser() a cada request pra refresh do token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isAppPage = pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding") || pathname.startsWith("/posts") || pathname.startsWith("/briefing") || pathname.startsWith("/settings");
  const isPublic = pathname === "/" || pathname.startsWith("/blog") || pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname === "/manifest.json" || pathname === "/robots.txt" || pathname === "/sitemap.xml" || pathname === "/llms.txt";

  // Redirecionar se não autenticado tentando acessar app
  if (!user && isAppPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect_to", pathname);
    return NextResponse.redirect(url);
  }

  // Redirecionar pro dashboard se autenticado tentando acessar auth
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
