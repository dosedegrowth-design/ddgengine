/**
 * Sidebar — navegação lateral do painel com identidade DDG
 *
 * Visual: dark ink + lime accents, BrandMark no topo,
 * active state com borda lime + bg lime/10, hover sutil.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Settings,
  BarChart3,
  Sparkles,
  LogOut,
  Inbox,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMarkInverted } from "@/components/brand/brand-mark";

const NAV_GROUPS: Array<{
  label: string;
  items: Array<{ href: string; label: string; icon: typeof LayoutDashboard }>;
}> = [
  {
    label: "Visão geral",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/inbox", label: "Inbox", icon: Inbox },
      { href: "/activity", label: "Atividade", icon: Activity },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { href: "/posts", label: "Posts", icon: FileText },
      { href: "/briefing", label: "Briefing", icon: ClipboardList },
    ],
  },
  {
    label: "Performance",
    items: [
      { href: "/visibility", label: "Aparições em IA", icon: Sparkles },
      { href: "/metrics", label: "Métricas", icon: BarChart3 },
    ],
  },
];

interface SidebarProps {
  orgName: string;
  plan: string;
  userEmail: string;
  /** Se true, renderiza o link "Admin · Staff DDG" no rodapé. */
  isAdmin?: boolean;
}

export function Sidebar({ orgName, plan, userEmail, isAdmin = false }: SidebarProps) {
  const pathname = usePathname();
  const initials = (userEmail || "")
    .split("@")[0]
    .split(/[._-]/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "U";

  return (
    <aside className="hidden md:flex flex-col w-64 bg-ddg-ink border-r-2 border-ddg-paper/10 h-screen sticky top-0 z-20">
      {/* Logo */}
      <div className="h-16 px-5 flex items-center border-b border-ddg-paper/10">
        <Link href="/dashboard" aria-label="Dashboard">
          <BrandMarkInverted size="md" />
        </Link>
      </div>

      {/* Org + plan */}
      <div className="px-5 py-4 border-b border-ddg-paper/10">
        <div className="text-[10px] font-mono uppercase tracking-widest text-ddg-paper/40 mb-1">
          Organização
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-bold text-ddg-paper truncate">
            {orgName}
          </div>
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ddg-lime/15 border border-ddg-lime/40 text-[9px] font-mono font-bold uppercase tracking-widest text-ddg-lime">
            {plan}
          </span>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-2 mb-2 text-[10px] font-mono uppercase tracking-widest text-ddg-paper/40">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href ||
                  (href !== "/dashboard" && pathname.startsWith(href));
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group/item",
                        active
                          ? "bg-ddg-lime/10 border border-ddg-lime/30 text-ddg-paper font-bold"
                          : "text-ddg-paper/60 border border-transparent hover:bg-ddg-paper/5 hover:text-ddg-paper hover:border-ddg-paper/10"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4 transition-colors",
                          active
                            ? "text-ddg-lime"
                            : "text-ddg-paper/40 group-hover/item:text-ddg-paper/80"
                        )}
                      />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-ddg-paper/10 p-3 space-y-2">
        {isAdmin && (
          <Link
            href="/admin/tickets"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group/item",
              pathname.startsWith("/admin")
                ? "bg-ddg-lime/10 border border-ddg-lime/30 text-ddg-paper font-bold"
                : "text-ddg-paper/60 border border-transparent hover:bg-ddg-paper/5 hover:text-ddg-paper hover:border-ddg-paper/10"
            )}
          >
            <ShieldCheck
              className={cn(
                "w-4 h-4",
                pathname.startsWith("/admin")
                  ? "text-ddg-lime"
                  : "text-ddg-paper/40 group-hover/item:text-ddg-paper/80"
              )}
            />
            <span className="flex-1">Admin</span>
            <span className="text-[9px] font-mono uppercase tracking-widest text-ddg-paper/40">
              Staff
            </span>
          </Link>
        )}
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group/item",
            pathname.startsWith("/settings")
              ? "bg-ddg-lime/10 border border-ddg-lime/30 text-ddg-paper font-bold"
              : "text-ddg-paper/60 border border-transparent hover:bg-ddg-paper/5 hover:text-ddg-paper hover:border-ddg-paper/10"
          )}
        >
          <Settings
            className={cn(
              "w-4 h-4",
              pathname.startsWith("/settings")
                ? "text-ddg-lime"
                : "text-ddg-paper/40 group-hover/item:text-ddg-paper/80"
            )}
          />
          Configurações
        </Link>

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ddg-paper/[0.03]">
          <div className="shrink-0 h-7 w-7 rounded-full bg-ddg-lime flex items-center justify-center text-ddg-ink text-xs font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-ddg-paper truncate">{userEmail}</div>
          </div>
          <form action="/logout" method="POST">
            <button
              type="submit"
              aria-label="Sair"
              className="shrink-0 p-1.5 rounded-md text-ddg-paper/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
