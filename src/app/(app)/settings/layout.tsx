/**
 * Settings layout — sidebar interna com identidade DDG.
 *
 * Itens filtrados por plano do user:
 *   - Items "básicos": Perfil, Site, Notificações, Integrações, Cobrança, Indique
 *   - "Equipe": só pra Multi+ (multi/agency/native)
 *   - "API Keys" + "Webhooks": só pra Agência/Native (uso programático)
 *
 * O filtragem é server-side via plan vindo de getCurrentOrg. Aqui no
 * client a nav é renderizada com os items que o server permitiu via Provider.
 */
import { getCurrentOrg } from "@/lib/auth";
import { SettingsNav } from "./_nav";

const ADVANCED_PLANS = new Set(["multi", "agency", "native"]);
const POWER_PLANS = new Set(["agency", "native"]);

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { org } = await getCurrentOrg();
  const plan = org.plan ?? "trial";

  const items = [
    { href: "/settings/profile", label: "Perfil", icon: "User" as const },
    { href: "/settings/site", label: "Site & domínio", icon: "Globe" as const },
    { href: "/settings/notifications", label: "Notificações", icon: "Bell" as const },
    { href: "/settings/integrations", label: "Integrações", icon: "Plug" as const },
    { href: "/settings/billing", label: "Plano e cobrança", icon: "CreditCard" as const },
    { href: "/settings/referrals", label: "Indique e ganhe", icon: "Gift" as const },
    ...(ADVANCED_PLANS.has(plan)
      ? [{ href: "/settings/team", label: "Equipe", icon: "Users" as const }]
      : []),
    ...(POWER_PLANS.has(plan)
      ? [
          { href: "/settings/api-keys", label: "API Keys", icon: "KeyRound" as const },
          { href: "/settings/webhooks", label: "Webhooks", icon: "Webhook" as const },
        ]
      : []),
  ];

  return (
    <div>
      <header className="border-b-2 border-ddg-ink bg-ddg-paper">
        <div className="container mx-auto max-w-7xl px-6 py-6 md:py-8">
          <div className="ddg-bracket mb-2">CONFIGURAÇÕES</div>
          <h1 className="ddg-display text-3xl md:text-4xl">
            Configurações da conta
          </h1>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-6 py-8 grid md:grid-cols-[220px_1fr] gap-6 md:gap-8">
        <SettingsNav items={items} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
