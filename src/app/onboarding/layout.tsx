/**
 * Layout standalone do Onboarding — sem sidebar, sem nav.
 *
 * Durante o briefing, o user precisa focar 100% nas perguntas. Nenhum
 * elemento do painel deve aparecer até que `briefing.completion_status === 'completed'`.
 *
 * O OnboardingFlow já tem sua própria Shell (header BrandMark + aurora bg),
 * então aqui só passamos children direto.
 */
import { requireUser } from "@/lib/auth";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Só garante que tem user autenticado. Sem org → redirect handled inside page.
  await requireUser();
  return <>{children}</>;
}
