import { redirect } from "next/navigation";
import { getCurrentSite } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteSettingsForm } from "./site-form";

export default async function SiteSettingsPage() {
  const { site, supabase } = await getCurrentSite();
  if (!site) redirect("/onboarding");

  const { data: worker } = await supabase
    .from("cloudflare_workers")
    .select("*")
    .eq("site_id", site.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Site conectado</CardTitle>
          <CardDescription>
            {site.domain} · Status: <Badge variant={site.status === "active" ? "success" : "secondary"}>{site.status}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Stack detectada" value={site.stack_detected ?? "—"} />
          <Row label="Cloudflare" value={site.has_cloudflare ? "Ativo" : "Não detectado"} />
          <Row label="Método" value={site.proxy_method ?? "—"} />
          <Row label="Path do blog" value={site.proxy_path ?? "/blog"} />
          <Row label="Score auditoria" value={`${site.audit_score ?? 0}/100`} />
          <Row label="Tenant slug" value={<code className="text-xs">{site.tenant_slug}</code>} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reverse Proxy (Cloudflare Worker)</CardTitle>
          <CardDescription>
            Deploy do Worker que serve seu blog em {site.domain}{site.proxy_path ?? "/blog"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {worker ? (
            <>
              <Row label="Worker" value={<code className="text-xs">{worker.worker_name}</code>} />
              <Row label="Rota" value={<code className="text-xs">{worker.worker_route}</code>} />
              <Row label="Status" value={<Badge variant={worker.status === "deployed" ? "success" : "warning"}>{worker.status}</Badge>} />
              <Row label="Último check" value={worker.last_health_check_at ? new Date(worker.last_health_check_at).toLocaleString("pt-BR") : "—"} />
              <Row label="Latência" value={worker.last_response_ms ? `${worker.last_response_ms}ms` : "—"} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Worker ainda não foi deployado. Configure CLOUDFLARE_API_TOKEN nas envs.
            </p>
          )}
          <SiteSettingsForm siteId={site.id} hasWorker={!!worker} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
