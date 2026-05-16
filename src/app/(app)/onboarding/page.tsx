import { getCurrentOrg } from "@/lib/auth";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export default async function OnboardingPage() {
  const { org, supabase } = await getCurrentOrg();

  // Verifica se já tem site
  const { data: sites } = await supabase
    .from("sites")
    .select("*")
    .eq("organization_id", org.id)
    .limit(1);

  const existingSite = sites?.[0] ?? null;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <OnboardingWizard orgId={org.id} existingSite={existingSite} />
    </div>
  );
}
