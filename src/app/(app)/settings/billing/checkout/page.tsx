import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentOrg } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_VALUES_BRL } from "@/lib/asaas/api";
import { CheckoutForm } from "./checkout-form";

const VALID_PLANS = ["starter", "light", "pro", "multi", "agency", "native"];

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; cycle?: string }>;
}) {
  const params = await searchParams;
  const plan = params.plan ?? "pro";
  const cycle = (params.cycle ?? "monthly") as "monthly" | "annual";

  if (!VALID_PLANS.includes(plan)) redirect("/settings/billing");

  const { user, org } = await getCurrentOrg();

  const monthly = PLAN_VALUES_BRL[plan] ?? 0;
  const value = cycle === "annual" ? monthly * 12 * 0.8 : monthly;

  return (
    <div className="space-y-6">
      <Link
        href="/settings/billing"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="capitalize">Checkout — Plano {plan}</CardTitle>
          <CardDescription>
            {cycle === "annual" ? "Anual com 20% off" : "Mensal"} ·{" "}
            <span className="font-medium">
              R$ {value.toFixed(2).replace(".", ",")}
              {cycle === "annual" ? "/ano" : "/mês"}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CheckoutForm
            orgId={org.id}
            orgName={org.name}
            userEmail={user.email ?? ""}
            userName={(user.user_metadata?.name as string) ?? org.name}
            plan={plan}
            cycle={cycle}
            value={value}
          />
        </CardContent>
      </Card>
    </div>
  );
}
