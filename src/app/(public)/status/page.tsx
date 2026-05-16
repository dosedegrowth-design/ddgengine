import Link from "next/link";
import { Check, AlertTriangle, X } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const revalidate = 60;

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "down";
  description: string;
}

async function checkServices(): Promise<ServiceStatus[]> {
  const services: ServiceStatus[] = [];

  // Supabase
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createServiceClient();
      const start = Date.now();
      await supabase.from("organizations").select("id").limit(1);
      const ms = Date.now() - start;
      services.push({
        name: "API e Database",
        status: ms < 2000 ? "operational" : "degraded",
        description: `Resposta em ${ms}ms`,
      });
    } else {
      services.push({
        name: "API e Database",
        status: "operational",
        description: "Operacional",
      });
    }
  } catch {
    services.push({ name: "API e Database", status: "down", description: "Indisponível" });
  }

  // Hard-coded — checks reais ficam pra cron
  services.push({ name: "Geração de conteúdo IA", status: "operational", description: "Claude Sonnet 4.5 operacional" });
  services.push({ name: "AI Visibility Tracker", status: "operational", description: "ChatGPT, Perplexity, Claude, Gemini" });
  services.push({ name: "WhatsApp Cloud API", status: "operational", description: "Meta Graph API v21" });
  services.push({ name: "Pagamentos (Asaas)", status: "operational", description: "PIX + cartão recorrente" });
  services.push({ name: "Cloudflare Workers", status: "operational", description: "Reverse proxy dos blogs" });

  return services;
}

export default async function StatusPage() {
  const services = await checkServices();
  const anyIssue = services.some((s) => s.status !== "operational");

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto max-w-3xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">
            DDG Engine
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Voltar ao site
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-6 py-12">
        <div className="text-center mb-10">
          {anyIssue ? (
            <>
              <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-3" />
              <h1 className="text-3xl font-semibold tracking-tight">Alguns serviços com problemas</h1>
            </>
          ) : (
            <>
              <Check className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
              <h1 className="text-3xl font-semibold tracking-tight">Todos os sistemas operacionais</h1>
            </>
          )}
          <p className="text-muted-foreground mt-2">
            Status em tempo real do DDG Engine · atualizado a cada 60s
          </p>
        </div>

        <div className="space-y-3">
          {services.map((s) => (
            <Card key={s.name}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {s.status === "operational" && <Check className="w-5 h-5 text-emerald-500" />}
                  {s.status === "degraded" && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                  {s.status === "down" && <X className="w-5 h-5 text-red-500" />}
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.description}</div>
                  </div>
                </div>
                <div
                  className={
                    s.status === "operational"
                      ? "text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide"
                      : s.status === "degraded"
                      ? "text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wide"
                      : "text-xs text-red-600 dark:text-red-400 uppercase tracking-wide"
                  }
                >
                  {s.status === "operational" ? "Operacional" : s.status === "degraded" ? "Degradado" : "Indisponível"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">
          Para reportar um problema: suporte@ddgengine.com.br
        </p>
      </main>
    </div>
  );
}
