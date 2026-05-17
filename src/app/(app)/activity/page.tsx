/**
 * Activity — log de eventos da org com identidade DDG
 */
import { History } from "lucide-react";
import { getCurrentOrg } from "@/lib/auth";
import { formatRelativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";

const EVENT_LABELS: Record<
  string,
  { label: string; tone: "success" | "info" | "warning" | "neutral" }
> = {
  site_audited: { label: "Site analisado", tone: "info" },
  worker_deployed: { label: "Integração ativada", tone: "success" },
  visibility_run_completed: { label: "Tracking IA concluído", tone: "success" },
  post_approved_whatsapp: { label: "Post aprovado (WhatsApp)", tone: "success" },
  post_published: { label: "Post publicado", tone: "success" },
  post_generated: { label: "Post gerado", tone: "info" },
  payment_received: { label: "Pagamento recebido", tone: "success" },
  subscription_created: { label: "Assinatura criada", tone: "success" },
  briefing_completed: { label: "Briefing completo", tone: "success" },
};

const TONE_CLASS: Record<string, string> = {
  success: "bg-ddg-lime/20 text-ddg-lime-deep border-ddg-lime/40",
  info: "bg-blue-100 text-blue-900 border-blue-300",
  warning: "bg-amber-100 text-amber-900 border-amber-300",
  neutral: "bg-ddg-stone text-ddg-muted border-ddg-stone",
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
    <div>
      <PageHeader
        bracket="ATIVIDADE"
        title="Histórico"
        subtitle="Eventos importantes da sua organização"
      />

      <div className="container mx-auto max-w-4xl px-6 py-8">
        {!events || events.length === 0 ? (
          <EmptyState
            icon={History}
            title="Nada por aqui ainda"
            description="Eventos importantes (deploys, sync, publicações, pagamentos) vão aparecer aqui em ordem cronológica."
          />
        ) : (
          <div className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper overflow-hidden">
            <ul className="divide-y-2 divide-ddg-stone">
              {events.map((e) => {
                const info =
                  EVENT_LABELS[e.event_type] ?? {
                    label: e.event_type,
                    tone: "neutral" as const,
                  };
                const data =
                  e.event_data && typeof e.event_data === "object"
                    ? (e.event_data as Record<string, unknown>)
                    : null;
                return (
                  <li
                    key={e.id}
                    className="p-4 hover:bg-ddg-cream transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                              TONE_CLASS[info.tone]
                            }`}
                          >
                            {info.label}
                          </span>
                        </div>
                        {data && Object.keys(data).length > 0 && (
                          <pre className="text-xs text-ddg-muted font-mono mt-2 max-w-full overflow-x-auto bg-ddg-cream/50 p-2 rounded border border-ddg-stone">
                            {JSON.stringify(data, null, 2).slice(0, 500)}
                          </pre>
                        )}
                      </div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted whitespace-nowrap shrink-0">
                        {formatRelativeTime(e.created_at)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
