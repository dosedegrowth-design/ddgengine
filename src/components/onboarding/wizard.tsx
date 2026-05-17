"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Check, Globe, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auditAndCreateSite } from "@/app/onboarding/actions";
import type { AuditResult } from "@/lib/audit";

interface WizardProps {
  orgId: string;
  existingSite: { id: string; domain: string; status: string; audit_score: number | null; audit_data: unknown } | null;
}

type Step = "url" | "auditing" | "result" | "briefing_prompt";

export function OnboardingWizard({ orgId, existingSite }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(existingSite ? "result" : "url");
  const [url, setUrl] = useState(existingSite?.domain ?? "");
  const [audit, setAudit] = useState<AuditResult | null>(
    (existingSite?.audit_data as AuditResult | null) ?? null
  );
  const [isPending, startTransition] = useTransition();

  async function handleAudit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!url.trim()) return;

    setStep("auditing");

    startTransition(async () => {
      const result = await auditAndCreateSite(orgId, url.trim());
      if ("error" in result) {
        toast.error(result.error);
        setStep("url");
        return;
      }
      setAudit(result.audit);
      setStep("result");
    });
  }

  return (
    <div className="space-y-6">
      <Steps current={step} />

      {step === "url" && (
        <Card>
          <CardHeader>
            <CardTitle>Qual o site que vamos turbinar?</CardTitle>
            <CardDescription>
              Cole a URL completa. Nossa IA vai auditar tudo em 30 segundos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAudit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">URL do seu site</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://meusite.com.br"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="pl-10"
                      required
                      autoFocus
                    />
                  </div>
                  <Button type="submit" disabled={isPending || !url.trim()}>
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analisar"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Não se preocupa, não vamos tocar em nada do seu site. Só vamos olhar.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === "auditing" && (
        <Card>
          <CardHeader>
            <CardTitle>Analisando seu site...</CardTitle>
            <CardDescription>Demora uns 30 segundos. Não feche a página.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 py-8 justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <AuditStepLine label="Verificando DNS e Cloudflare" />
              <AuditStepLine label="Detectando stack (WordPress, Wix, Webflow...)" />
              <AuditStepLine label="Analisando meta tags e schema" />
              <AuditStepLine label="Checando robots.txt e sitemap" />
              <AuditStepLine label="Medindo HTTPS e performance" />
            </div>
          </CardContent>
        </Card>
      )}

      {step === "result" && audit && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Análise concluída</CardTitle>
                <CardDescription>
                  {audit.normalized_url}
                </CardDescription>
              </div>
              <ScoreBadge score={audit.score} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm font-medium mb-1">
                {classificationLabel(audit.classification)}
              </div>
              <div className="text-sm text-muted-foreground">
                {audit.expected_traffic_timeline}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Checagens</h3>
              <CheckLine
                ok={audit.checks.https.passed}
                label="HTTPS"
                detail={audit.checks.https.details}
              />
              <CheckLine
                ok={audit.checks.cloudflare.detected}
                warning={!audit.checks.cloudflare.detected}
                label="Cloudflare"
                detail={audit.checks.cloudflare.details}
              />
              <CheckLine
                ok={audit.checks.stack.detected !== "unknown"}
                label={`Stack: ${audit.checks.stack.detected}`}
                detail={audit.checks.stack.details}
              />
              <CheckLine
                ok={audit.checks.robots.passed}
                label="robots.txt"
                detail={audit.checks.robots.details}
              />
              <CheckLine
                ok={audit.checks.sitemap.passed}
                label="Sitemap"
                detail={audit.checks.sitemap.details}
              />
              <CheckLine
                ok={audit.checks.meta_tags.passed}
                label="Meta tags"
                detail={audit.checks.meta_tags.details}
              />
              <CheckLine
                ok={audit.checks.schema_markup.passed}
                label="Schema markup"
                detail={audit.checks.schema_markup.details}
              />
            </div>

            {audit.recommendations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Recomendações</h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {audit.recommendations.map((r) => (
                    <li key={r} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">→</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-4 border-t">
              <Button asChild size="lg">
                <Link href="/briefing">
                  Continuar pro briefing <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="ghost" onClick={() => setStep("url")} size="sm">
                Trocar URL
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Steps({ current }: { current: Step }) {
  const steps = [
    { id: "url", label: "Conectar site" },
    { id: "result", label: "Auditoria" },
    { id: "briefing_prompt", label: "Briefing" },
  ];
  const currentIdx = steps.findIndex((s) => s.id === current || (current === "auditing" && s.id === "result"));

  return (
    <div className="flex items-center gap-2 text-sm">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <div
            className={
              i <= currentIdx
                ? "w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium"
                : "w-7 h-7 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground"
            }
          >
            {i < currentIdx ? <Check className="w-3 h-3" /> : i + 1}
          </div>
          <span className={i <= currentIdx ? "font-medium" : "text-muted-foreground"}>
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className="w-8 h-px bg-border ml-2" />
          )}
        </div>
      ))}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const variant: "success" | "warning" | "destructive" | "default" =
    score >= 80 ? "success" : score >= 60 ? "warning" : score >= 40 ? "default" : "destructive";
  return (
    <Badge variant={variant} className="text-base px-3 py-1">
      <Sparkles className="w-3 h-3 mr-1" />
      {score}/100
    </Badge>
  );
}

function classificationLabel(c: AuditResult["classification"]) {
  switch (c) {
    case "healthy":
      return "⚡ Site saudável";
    case "ok_with_fixes":
      return "⚠️ OK com ajustes pendentes";
    case "needs_work":
      return "🔧 Site com pendências importantes";
    case "not_recommended":
      return "⛔ Não recomendado";
  }
}

function CheckLine({
  ok,
  warning,
  label,
  detail,
}: {
  ok: boolean;
  warning?: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-2 text-sm py-1.5">
      <div className="mt-0.5">
        {ok ? (
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        ) : warning ? (
          <span className="text-amber-600 dark:text-amber-400">⚠️</span>
        ) : (
          <span className="text-muted-foreground">○</span>
        )}
      </div>
      <div>
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground"> · {detail}</span>
      </div>
    </div>
  );
}

function AuditStepLine({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
      <span>{label}</span>
    </div>
  );
}
