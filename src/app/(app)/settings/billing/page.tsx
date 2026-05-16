import Link from "next/link";
import { getCurrentOrg } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLAN_VALUES_BRL } from "@/lib/asaas/api";

const PLAN_FEATURES: Record<string, string[]> = {
  trial: ["14 dias grátis", "Sem cartão", "2 posts gerados"],
  starter: ["4 artigos + 8 FAQs", "Auto-publish", "AI Visibility básico"],
  light: ["6 artigos + 12 FAQs", "Auto-publish", "AI Visibility médio"],
  pro: ["8 artigos + 16 FAQs", "Aprovação WhatsApp", "AI Visibility completo"],
  multi: ["16 artigos + 32 FAQs × 3 sites", "Brand RAG avançado", "Suporte prioritário"],
  agency: ["Ilimitado em 30 sites", "White-label", "API + dedicado"],
};

export default async function BillingPage() {
  const { org, supabase } = await getCurrentOrg();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("organization_id", org.id)
    .maybeSingle();

  const trialEnds = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
  const daysLeft = trialEnds
    ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Plano atual</CardTitle>
          <CardDescription>
            <Badge variant={org.status === "active" ? "success" : "warning"}>{org.status}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-3xl font-semibold capitalize">{org.plan}</div>
            {org.plan === "trial" ? (
              <div className="text-sm text-muted-foreground mt-1">
                Trial · {daysLeft} dias restantes
              </div>
            ) : (
              <div className="text-sm text-muted-foreground mt-1">
                R$ {PLAN_VALUES_BRL[org.plan] ?? 0}/mês
              </div>
            )}
          </div>

          <ul className="space-y-1 text-sm text-muted-foreground">
            {(PLAN_FEATURES[org.plan] ?? []).map((f) => (
              <li key={f}>· {f}</li>
            ))}
          </ul>

          {subscription && (
            <div className="text-xs text-muted-foreground border-t pt-3">
              Asaas ID: <code>{subscription.external_id ?? "—"}</code>
              {subscription.next_billing_at && (
                <> · Próxima cobrança: {new Date(subscription.next_billing_at).toLocaleDateString("pt-BR")}</>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mudar de plano</CardTitle>
          <CardDescription>Pague PIX ou cartão recorrente</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          {(["starter", "light", "pro", "multi"] as const).map((p) => (
            <Button
              key={p}
              variant={org.plan === p ? "default" : "outline"}
              asChild
              className="justify-start h-auto py-3"
            >
              <Link href={`/settings/billing/checkout?plan=${p}`}>
                <div className="text-left">
                  <div className="font-medium capitalize">{p}</div>
                  <div className="text-xs text-muted-foreground">
                    R$ {PLAN_VALUES_BRL[p]}/mês
                  </div>
                </div>
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
