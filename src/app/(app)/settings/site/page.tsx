/**
 * /settings/site — Status da integração do site do cliente.
 *
 * IMPORTANTE: copy deliberadamente NEUTRA. Não mencionar Cloudflare,
 * Worker, reverse proxy, tenant_slug, env vars ou qualquer detalhe
 * de stack. Pro cliente isso é só "sua integração com a engine".
 */
import { redirect } from "next/navigation";
import { getCurrentSite } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteSettingsForm } from "./site-form";
import { ImportWordPressForm } from "./import-wp";
import { TemplatePicker } from "@/components/blog/template-picker";
import type { BlogTemplate } from "@/lib/blog/templates";

const STATUS_LABEL: Record<string, { label: string; variant: "success" | "warning" | "secondary" }> = {
  active: { label: "Conectado", variant: "success" },
  configuring: { label: "Configurando", variant: "warning" },
  pending: { label: "Aguardando", variant: "secondary" },
  auditing: { label: "Analisando seu site", variant: "warning" },
  paused: { label: "Pausada", variant: "secondary" },
  error: { label: "Atenção", variant: "warning" },
};

export default async function SiteSettingsPage() {
  const { site, supabase } = await getCurrentSite();
  if (!site) redirect("/onboarding");

  const statusInfo = STATUS_LABEL[site.status] ?? STATUS_LABEL.pending;
  const integrationActive =
    site.integration_state === "active" && Boolean(site.cname_verified);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Seu site</CardTitle>
          <CardDescription>
            {site.domain} ·{" "}
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Endereço" value={site.domain} />
          <Row
            label="Blog"
            value={site.blog_host ?? `blog.${(site.domain ?? "").replace(/^www\./, "")}`}
          />
          <Row
            label="Análise técnica"
            value={
              site.audit_score
                ? `${site.audit_score}/100`
                : "—"
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integração</CardTitle>
          <CardDescription>
            Conexão entre a engine e {site.domain}
            {site.proxy_path ?? "/blog"} — onde seus posts vão aparecer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {integrationActive ? (
            <>
              <Row
                label="Status"
                value={<Badge variant="success">Ativa</Badge>}
              />
              <Row
                label="Conectado em"
                value={
                  site.cname_verified_at
                    ? new Date(site.cname_verified_at as string).toLocaleString("pt-BR")
                    : "—"
                }
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Estamos preparando sua integração. Em breve seu blog estará no ar — você
              será avisado por e-mail quando estiver tudo pronto.
            </p>
          )}
          <SiteSettingsForm siteId={site.id} hasWorker={integrationActive} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aparência do blog</CardTitle>
          <CardDescription>
            Como seu blog público vai aparecer pros visitantes. Pode trocar a
            qualquer hora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplatePicker
            mode="inline"
            current={(site.blog_template as BlogTemplate) ?? "editorial"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Importar conteúdo antigo</CardTitle>
          <CardDescription>
            Tem um blog antigo no WordPress? Importe os posts pra a engine
            re-otimizar com IA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportWordPressForm siteId={site.id} />
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
