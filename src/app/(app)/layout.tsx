/**
 * Layout do Painel — só renderiza Sidebar/MobileNav DEPOIS que o briefing
 * está completed. Senão, redireciona pro /onboarding.
 *
 * Regra dura: nada do painel (dashboard, posts, settings) deve ser visível
 * antes do quiz finalizado. O user fica em /onboarding step-by-step até
 * "Confirmar e ir pro painel".
 */
import { redirect } from "next/navigation";

import { getCurrentOrg } from "@/lib/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { org, user, supabase } = await getCurrentOrg();

  // Guard: briefing precisa estar 'completed' pra liberar o painel.
  const { data: briefing } = await supabase
    .from("briefings")
    .select("completion_status")
    .eq("organization_id", org.id)
    .maybeSingle();

  if (!briefing || briefing.completion_status !== "completed") {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen bg-ddg-paper text-ddg-ink">
      <Sidebar
        orgName={org.name}
        plan={org.plan ?? "trial"}
        userEmail={user.email ?? ""}
        isAdmin={isAdminEmail(user.email)}
      />
      <main className="flex-1 min-w-0 pb-16 md:pb-0 bg-ddg-cream/30">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
