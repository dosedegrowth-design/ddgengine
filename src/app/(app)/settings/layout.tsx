/**
 * Settings layout — sidebar interna com identidade DDG
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Globe,
  Bell,
  Plug,
  CreditCard,
  Gift,
  Users,
  KeyRound,
  Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/settings/profile", label: "Perfil", icon: User },
  { href: "/settings/site", label: "Site & Domínio", icon: Globe },
  { href: "/settings/notifications", label: "Notificações", icon: Bell },
  { href: "/settings/integrations", label: "Integrações", icon: Plug },
  { href: "/settings/billing", label: "Plano e cobrança", icon: CreditCard },
  { href: "/settings/referrals", label: "Indique e ganhe", icon: Gift },
  { href: "/settings/team", label: "Equipe", icon: Users },
  { href: "/settings/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/settings/webhooks", label: "Webhooks", icon: Webhook },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div>
      <header className="border-b-2 border-ddg-ink bg-ddg-paper">
        <div className="container mx-auto max-w-7xl px-6 py-6 md:py-8">
          <div className="ddg-bracket mb-2">CONFIGURAÇÕES</div>
          <h1 className="ddg-display text-3xl md:text-4xl">Settings</h1>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-6 py-8 grid md:grid-cols-[220px_1fr] gap-6 md:gap-8">
        <nav className="space-y-1">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            const active = pathname.startsWith(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group",
                  active
                    ? "bg-ddg-ink text-ddg-paper font-bold"
                    : "text-ddg-muted hover:text-ddg-ink hover:bg-ddg-cream"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    active ? "text-ddg-lime" : "text-ddg-muted"
                  )}
                />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
