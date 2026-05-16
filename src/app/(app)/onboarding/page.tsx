import { getCurrentOrg } from "@/lib/auth";
import { OnboardingFlow } from "@/components/briefing/onboarding-flow";

export default async function OnboardingPage() {
  const { org, user, supabase } = await getCurrentOrg();

  // Já tem briefing completo?
  const { data: briefing } = await supabase
    .from("briefings")
    .select("id, raw_answers, refined_brief, mode, completion_status")
    .eq("organization_id", org.id)
    .maybeSingle();

  const { data: site } = await supabase
    .from("sites")
    .select("id, url")
    .eq("organization_id", org.id)
    .maybeSingle();

  return (
    <OnboardingFlow
      initialBriefing={briefing}
      initialSite={site}
      userName={user.email?.split("@")[0] ?? ""}
    />
  );
}
