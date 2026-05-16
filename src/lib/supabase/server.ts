/**
 * Supabase client para uso no SERVIDOR (Server Components, Server Actions, Route Handlers).
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: "ddg_engine",
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component context não permite set; ignorar é OK
            // se houver middleware refreshing session
          }
        },
      },
    }
  );
}

/**
 * Service role client — uso restrito a operações privilegiadas
 * (jobs, edge functions, admin). NUNCA usar em request user-facing.
 */
export function createServiceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  }

  const { createClient: createSupaClient } = require("@supabase/supabase-js");

  return createSupaClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "ddg_engine" },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
