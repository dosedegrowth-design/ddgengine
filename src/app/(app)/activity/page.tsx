import { redirect } from "next/navigation";
import { History } from "lucide-react";
import { getCurrentOrg } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeTime } from "@/lib/utils";

const EVENT_LABELS: Record<string, { label: string; color: "default" | "success" | "warning" | "destructive" }> = {
  site_audited: { label: "Site auditado", color: "default" },
  worker_deployed: { label: "Worker deployado", color: "success" },
  visibility_run_completed: { label: "Tracking IA concluído", color: "success" },
  post_approved_whatsapp: { label: "Post aprovado (WhatsApp)", color: "success" },
  post_published: { label: "Post publicado", color: "success" },
  payment_received: { label: "Pagamento recebido", color: "success" },
  subscription_created: { label: "Assinatura criada", color: "success" },
};

export default async function ActivityPage() {
  const { org, supabase } = await getCurrentOrg();

  const { data: events } = await supabase
    .from("audit_log")
    .select("*")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="container mx-auto max-w-4xl px-6 py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
          <History className="w-7 h-7" />
          Atividade
        </h1>
        <p className="text-muted-foreground mt-1">
          Histórico de eventos importantes na sua organização
        </p>
      </header>

      {!events || events.length === 0 ? (
        <EmptyState
          icon={History}
          title="Nada por aqui ainda"
          description="Eventos importantes (deploys, sync, publicações) aparecerão aqui."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {events.map((e: any) => {
                const info = EVENT_LABELS[e.event_type] ?? { label: e.event_type, color: "default" as const };
                return (
                  <div key={e.id} className="p-4 hover:bg-accent/20 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={info.color}>{info.label}</Badge>
                        </div>
                        {e.event_data && Object.keys(e.event_data).length > 0 && (
                          <pre className="text-xs text-muted-foreground font-mono mt-2 max-w-full overflow-x-auto">
                            {JSON.stringify(e.event_data, null, 2).slice(0, 500)}
                          </pre>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(e.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
