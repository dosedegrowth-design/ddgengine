import Link from "next/link";

const ITEMS = [
  { href: "/settings/profile", label: "Perfil" },
  { href: "/settings/site", label: "Site & Domínio" },
  { href: "/settings/integrations", label: "Integrações" },
  { href: "/settings/billing", label: "Plano e cobrança" },
  { href: "/settings/referrals", label: "Indique e ganhe" },
  { href: "/settings/team", label: "Equipe" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-8">Configurações</h1>
      <div className="grid md:grid-cols-[200px_1fr] gap-8">
        <nav className="space-y-1">
          {ITEMS.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="block px-3 py-2 rounded-md text-sm hover:bg-accent/50"
            >
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
