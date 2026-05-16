/**
 * MobileNav — bottom navigation bar pra mobile com identidade DDG
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Sparkles, Inbox, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/posts", label: "Posts", icon: FileText },
  { href: "/visibility", label: "IA", icon: Sparkles },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/settings", label: "Config", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-ddg-ink/95 backdrop-blur-lg border-t-2 border-ddg-paper/10">
      <div className="grid grid-cols-5 h-16">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors relative",
                active ? "text-ddg-lime" : "text-ddg-paper/50 hover:text-ddg-paper"
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-ddg-lime rounded-full" />
              )}
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
