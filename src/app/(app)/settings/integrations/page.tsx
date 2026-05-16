import { redirect } from "next/navigation";
import { getCurrentSite } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function IntegrationsPage() {
  const { site, supabase } = await getCurrentSite();
  if (!site) redirect("/onboarding");

  const { data: integrations } = await supabase
    .from("site_integrations")
    .select("*")
    .eq("site_id", site.id);

  const map = new Map(integrations?.map((i: any) => [i.provider, i]) ?? []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integrações</CardTitle>
          <CardDescription>
            Conecte GSC e GA4 pra ver métricas reais no painel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <IntegrationRow
            name="Google Search Console"
            description="Posições, impressões e cliques no Google"
            integration={map.get("google_search_console")}
            connectHref="/api/oauth/google-search-console"
          />
          <IntegrationRow
            name="Google Analytics 4"
            description="Tráfego, sessões e conversões"
            integration={map.get("google_analytics_4")}
            connectHref="/api/oauth/google-analytics-4"
          />
          <IntegrationRow
            name="IndexNow (Bing + Yandex)"
            description="Indexação instantânea de novos posts"
            integration={map.get("indexnow")}
            autoConnected
          />
          <IntegrationRow
            name="Bing Webmaster Tools"
            description="Métricas adicionais do Bing"
            integration={map.get("bing_webmaster")}
            connectHref="/api/oauth/bing-webmaster"
            comingSoon
          />
        </CardContent>
      </Card>
    </div>
  );
}

function IntegrationRow({
  name,
  description,
  integration,
  connectHref,
  autoConnected,
  comingSoon,
}: {
  name: string;
  description: string;
  integration?: any;
  connectHref?: string;
  autoConnected?: boolean;
  comingSoon?: boolean;
}) {
  const connected = autoConnected || (integration && integration.status === "active");

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border">
      <div>
        <div className="font-medium flex items-center gap-2">
          {name}
          {connected && (
            <Badge variant="success" className="text-xs">
              Conectado
            </Badge>
          )}
          {comingSoon && (
            <Badge variant="secondary" className="text-xs">
              Em breve
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">{description}</div>
        {integration?.last_synced_at && (
          <div className="text-xs text-muted-foreground mt-1">
            Última sync: {new Date(integration.last_synced_at).toLocaleString("pt-BR")}
          </div>
        )}
      </div>
      {!autoConnected && !comingSoon && (
        <Button asChild variant={connected ? "outline" : "default"} size="sm">
          <a href={connectHref ?? "#"}>{connected ? "Reconectar" : "Conectar"}</a>
        </Button>
      )}
    </div>
  );
}
