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
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP = {
  User,
  Globe,
  Bell,
  Plug,
  CreditCard,
  Gift,
  Users,
  KeyRound,
  Webhook,
  Tag,
} as const;

type IconName = keyof typeof ICON_MAP;

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export function SettingsNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {items.map((it) => {
        const Icon = ICON_MAP[it.icon];
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
  );
}
