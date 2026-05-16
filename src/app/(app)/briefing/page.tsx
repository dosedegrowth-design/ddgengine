import { redirect } from "next/navigation";
import { getCurrentSite } from "@/lib/auth";
import { BriefingWizard } from "@/components/onboarding/briefing-wizard";

export default async function BriefingPage() {
  const { site, supabase } = await getCurrentSite();

  if (!site) {
    redirect("/onboarding");
  }

  // Pega briefing existente (se houver)
  const { data: briefings } = await supabase
    .from("briefings")
    .select("*")
    .eq("site_id", site.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const existing = briefings?.[0] ?? null;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Briefing inteligente</h1>
        <p className="text-muted-foreground mt-2">
          15 perguntas em ~5 minutos. A IA aprende seu negócio e nunca mais erra.
        </p>
      </div>
      <BriefingWizard siteId={site.id} initialData={existing} />
    </div>
  );
}
