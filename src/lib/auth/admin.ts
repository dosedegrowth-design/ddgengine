/**
 * Admin gate — só DDG staff acessa /admin/*
 *
 * Estratégia pragmática:
 *  - Allowlist em env `ADMIN_EMAILS` (csv) ou `@dosedegrowth.com` por default
 *  - Lê o email do user autenticado e compara
 *  - Sem DB change; fácil ajustar via Vercel quando o time crescer
 *
 * Quando o time passar de ~5 admins, migrar pra tabela `ddg_engine.staff_users`.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ADMIN_DOMAIN_DEFAULT = "dosedegrowth.com";

function parseAdminEmails(): { emails: Set<string>; domains: Set<string> } {
  const raw = (process.env.ADMIN_EMAILS ?? "").trim();
  const emails = new Set<string>();
  const domains = new Set<string>([ADMIN_DOMAIN_DEFAULT]);

  if (!raw) return { emails, domains };

  for (const part of raw.split(",")) {
    const v = part.trim().toLowerCase();
    if (!v) continue;
    if (v.startsWith("@")) domains.add(v.slice(1));
    else emails.add(v);
  }

  return { emails, domains };
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  const { emails, domains } = parseAdminEmails();
  if (emails.has(lower)) return true;
  const at = lower.lastIndexOf("@");
  if (at === -1) return false;
  const domain = lower.slice(at + 1);
  return domains.has(domain);
}

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin/tickets");
  if (!isAdminEmail(user.email)) {
    // Não revela existência do /admin — manda pro dashboard normal
    redirect("/dashboard");
  }

  return { user, supabase };
}
