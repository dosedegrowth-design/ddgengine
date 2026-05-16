import { getCurrentOrg } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOrCreateReferralCode, getReferralStats } from "@/lib/billing/referrals";
import { ReferralLinkBox } from "./referral-link-box";

export default async function ReferralsPage() {
  const { org } = await getCurrentOrg();
  const code = await getOrCreateReferralCode(org.id);
  const stats = await getReferralStats(org.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${appUrl}/signup?ref=${code}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Indique e ganhe</CardTitle>
          <CardDescription>
            Compartilhe seu link. Quando alguém assinar, vocês dois ganham 1 mês free.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReferralLinkBox link={link} code={code} />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Stat label="Total enviados" value={stats.total} />
        <Stat label="Cadastraram" value={stats.signed_up} hint="indicaram + criaram conta" />
        <Stat label="Converteram" value={stats.converted} hint="pagaram primeira fatura" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Suas indicações</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não indicou ninguém. Compartilhe seu link!</p>
          ) : (
            <div className="space-y-2">
              {stats.referrals.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-md border">
                  <div>
                    <div className="text-sm font-mono">{r.referral_code}</div>
                    <div className="text-xs text-muted-foreground">
                      Criado em {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <Badge
                    variant={
                      r.status === "rewarded" || r.status === "converted"
                        ? "success"
                        : r.status === "signed_up"
                        ? "warning"
                        : "outline"
                    }
                  >
                    {r.status === "pending"
                      ? "Aguardando"
                      : r.status === "signed_up"
                      ? "Cadastrou"
                      : r.status === "converted"
                      ? "Converteu"
                      : "Recompensado"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription className="text-xs uppercase tracking-wide">{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}
