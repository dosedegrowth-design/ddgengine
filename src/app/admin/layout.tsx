/**
 * Admin Layout — só DDG staff. Sem briefing gate, sidebar mínima.
 *
 * Acesso: ADMIN_EMAILS env ou domínio @dosedegrowth.com
 */
import Link from "next/link";
import { LifeBuoy, LogOut, ShieldCheck, Ticket } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata = {
  title: "Admin · Conteudai",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-ddg-paper text-ddg-ink">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r-2 border-ddg-ink bg-ddg-cream/40">
        <div className="p-5 border-b-2 border-ddg-ink">
          <div className="ddg-bracket mb-1">DDG · STAFF</div>
          <div className="font-black tracking-tight text-lg leading-tight">
            Admin
          </div>
          <div className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
            <ShieldCheck className="w-3 h-3" />
            {user.email}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <Link
            href="/admin/tickets"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-ddg-ink hover:bg-ddg-lime/30 transition-colors"
          >
            <Ticket className="w-4 h-4" />
            Tickets
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-ddg-muted hover:bg-ddg-stone/50 transition-colors"
          >
            <LifeBuoy className="w-4 h-4" />
            Voltar pro painel
          </Link>
        </nav>

        <div className="p-3 border-t-2 border-ddg-ink">
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-ddg-muted hover:bg-ddg-stone/50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top-bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-20 h-12 flex items-center justify-between px-4 border-b-2 border-ddg-ink bg-ddg-paper">
        <div className="ddg-bracket text-[10px]">DDG · STAFF · ADMIN</div>
        <Link
          href="/dashboard"
          className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted"
        >
          Painel →
        </Link>
      </header>

      <main className="flex-1 min-w-0 md:pb-0 pt-12 md:pt-0 bg-ddg-paper">
        {children}
      </main>
    </div>
  );
}
