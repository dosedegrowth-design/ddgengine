import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiKeysManager } from "./api-keys-manager";
import { formatRelativeTime } from "@/lib/utils";

const POWER_PLANS = new Set(["agency", "native"]);

export default async function ApiKeysPage() {
  const { org, supabase } = await getCurrentOrg();

  // Gate de plano: API Keys só pra Agência/Native
  if (!POWER_PLANS.has(org.plan ?? "trial")) {
    redirect("/settings/billing");
  }

  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, scopes, last_used_at, expires_at, revoked_at, created_at")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Tokens pra usar a API REST. Disponível no plano <Badge variant="outline">Agência</Badge>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ApiKeysManager orgId={org.id} canCreate={org.plan === "agency" || org.plan === "native"} />

          {keys && keys.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              {keys.map((k: any) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-md border"
                >
                  <div>
                    <div className="font-medium text-sm">{k.name}</div>
                    <div className="text-xs text-muted-foreground">
                      <code className="font-mono">{k.key_prefix}...</code>
                      {" · "}
                      {k.scopes?.join(", ")}
                      {" · "}
                      criado {formatRelativeTime(k.created_at)}
                      {k.last_used_at && ` · usado ${formatRelativeTime(k.last_used_at)}`}
                    </div>
                  </div>
                  <Badge variant={k.revoked_at ? "destructive" : "success"}>
                    {k.revoked_at ? "Revogado" : "Ativo"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documentação da API</CardTitle>
          <CardDescription>Endpoints disponíveis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <DocRow method="GET" path="/api/v1/sites" desc="Lista sites da sua org" />
          <DocRow method="GET" path="/api/v1/posts" desc="Lista posts (filtros: site_id, status, limit)" />
          <DocRow method="POST" path="/api/v1/posts" desc="Dispara geração (scope: write)" />
          <DocRow method="GET" path="/api/v1/metrics" desc="Métricas diárias (site_id, days)" />
          <p className="pt-3 text-xs text-muted-foreground">
            Use header <code className="font-mono bg-muted px-1 py-0.5 rounded">Authorization: Bearer ddge_live_...</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function DocRow({ method, path, desc }: { method: string; path: string; desc: string }) {
  const color =
    method === "GET" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400" :
    method === "POST" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
    "bg-muted";
  return (
    <div className="flex items-center gap-3 p-2 rounded-md border bg-card">
      <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${color}`}>{method}</span>
      <code className="font-mono text-xs flex-1">{path}</code>
      <span className="text-xs text-muted-foreground">{desc}</span>
    </div>
  );
}
