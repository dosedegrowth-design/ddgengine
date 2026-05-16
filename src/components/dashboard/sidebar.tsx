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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/posts", label: "Conteúdo", icon: FileText },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/metrics", label: "Métricas", icon: BarChart3 },
  { href: "/visibility", label: "AI Visibility", icon: Sparkles },
  { href: "/briefing", label: "Briefing", icon: ClipboardList },
  { href: "/settings", label: "Configurações", icon: Settings },
];

interface SidebarProps {
  orgName: string;
  plan: string;
  userEmail: string;
}

export function Sidebar({ orgName, plan, userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-60 border-r bg-card/30 h-screen sticky top-0">
      <div className="h-16 px-5 flex items-center border-b">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          DDG Engine
        </Link>
      </div>

      <div className="px-3 py-4 border-b">
        <div className="px-2">
          <div className="text-sm font-medium truncate">{orgName}</div>
          <div className="text-xs text-muted-foreground capitalize">{plan}</div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3 space-y-2">
        <div className="px-2 text-xs text-muted-foreground truncate">{userEmail}</div>
        <form action="/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
