/**
 * /tickets/[id] — Página PÚBLICA pro cliente acompanhar o ticket.
 *
 * Sem auth. Acesso via UUID v4 (~122 bits aleatórios).
 *
 * Mostra:
 *  - Header com org + status atual + label
 *  - Mensagem original do cliente
 *  - Timeline de mudanças (status, assigned, comments do cliente)
 *  - Form pra adicionar comentário
 *
 * NÃO mostra:
 *  - Notas internas (eventos do tipo note_added do staff)
 *  - Email do staff que pegou o ticket
 *  - Outros tickets da org
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Globe,
  Mail,
  MessageCircle,
  Phone,
  Sparkles,
} from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { formatRelativeTime, formatDate } from "@/lib/utils";
import { CommentForm } from "./comment-form";

export const dynamic = "force-dynamic";

interface TicketEvent {
  type: "status_change" | "assigned" | "note_added" | "client_comment";
  by: string;
  at: string;
  payload: Record<string, unknown>;
}

const STATUS_PUBLIC: Record<
  string,
  { label: string; desc: string; tone: string; icon: typeof Clock }
> = {
  open: {
    label: "Recebido",
    desc: "A gente já recebeu seu pedido. Em breve um especialista pega.",
    tone: "border-amber-300 bg-amber-50 text-amber-900",
    icon: Clock,
  },
  in_progress: {
    label: "Em andamento",
    desc: "Estamos cuidando do seu pedido agora. Te avisamos quando terminar.",
    tone: "border-blue-300 bg-blue-50 text-blue-900",
    icon: Sparkles,
  },
  waiting_client: {
    label: "Aguardando você",
    desc: "Precisamos de uma resposta sua antes de continuar.",
    tone: "border-amber-300 bg-amber-50 text-amber-900",
    icon: MessageCircle,
  },
  resolved: {
    label: "Resolvido",
    desc: "Pedido concluído! Qualquer dúvida, abre outro chamado.",
    tone: "border-ddg-lime bg-ddg-lime/15 text-ddg-ink",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelado",
    desc: "Esse pedido foi cancelado. Se foi engano, fala com a gente no WhatsApp.",
    tone: "border-ddg-stone bg-ddg-cream text-ddg-muted",
    icon: Clock,
  },
};

const TYPE_LABEL: Record<string, string> = {
  domain_integration: "Configuração do seu blog",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicTicketPage({ params }: PageProps) {
  const { id } = await params;

  // Validação básica de formato UUID
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return notFound();
  }

  const admin = createServiceClient();
  const { data: ticket } = await admin
    .from("support_tickets")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!ticket) return notFound();

  const [{ data: org }, { data: site }] = await Promise.all([
    admin
      .from("organizations")
      .select("name")
      .eq("id", ticket.organization_id)
      .maybeSingle(),
    ticket.site_id
      ? admin.from("sites").select("domain").eq("id", ticket.site_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const metadata = (ticket.metadata ?? {}) as { events?: TicketEvent[] };
  // Apenas eventos públicos pro cliente — esconde notes internas e detalhes de assignment
  const publicEvents = (metadata.events ?? [])
    .filter((e) => e.type !== "note_added")
    .reverse();

  const status = (ticket.status as string) ?? "open";
  const statusMeta = STATUS_PUBLIC[status] ?? STATUS_PUBLIC.open;
  const StatusIcon = statusMeta.icon;
  const ticketType = (ticket.type as string) ?? "";
  const canComment = status !== "resolved" && status !== "cancelled";

  return (
    <div className="min-h-screen bg-ddg-cream/30 py-8 md:py-12">
      <div className="container mx-auto max-w-3xl px-4">
        {/* Brand header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-mono uppercase tracking-widest text-ddg-muted hover:text-ddg-ink transition-colors"
          >
            ← Conteudai
          </Link>
          <code className="text-[10px] font-mono text-ddg-muted">
            #{ticket.id.slice(0, 8)}
          </code>
        </div>

        {/* Header card */}
        <section className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper shadow-[5px_5px_0_var(--ddg-ink)] p-5 md:p-7">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="ddg-bracket">SEU PEDIDO</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
              {TYPE_LABEL[ticketType] ?? ticketType}
            </span>
          </div>
          <h1 className="ddg-display text-2xl md:text-3xl text-ddg-ink mb-1">
            {(org?.name as string | undefined) ?? "Seu pedido"}
          </h1>
          {site?.domain && (
            <p className="text-sm text-ddg-muted">
              Domínio:{" "}
              <strong className="text-ddg-ink font-mono">
                {site.domain as string}
              </strong>
            </p>
          )}

          {/* Status box */}
          <div
            className={`mt-5 rounded-xl border-2 p-4 flex items-start gap-3 ${statusMeta.tone}`}
          >
            <StatusIcon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-widest mb-0.5">
                Status atual
              </div>
              <div className="font-black text-lg leading-tight">
                {statusMeta.label}
              </div>
              <p className="text-sm mt-1 leading-relaxed">{statusMeta.desc}</p>
            </div>
          </div>

          {/* Data + contato */}
          <div className="mt-5 pt-4 border-t border-ddg-stone grid sm:grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted mb-0.5">
                Criado em
              </div>
              <div className="font-medium text-ddg-ink inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-ddg-muted" />
                {formatRelativeTime(ticket.created_at as string)}
              </div>
            </div>
            {ticket.contact_email && (
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted mb-0.5">
                  Email
                </div>
                <div className="font-medium text-ddg-ink inline-flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-ddg-muted shrink-0" />
                  <span className="truncate">{ticket.contact_email as string}</span>
                </div>
              </div>
            )}
            {ticket.contact_phone && (
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted mb-0.5">
                  WhatsApp
                </div>
                <div className="font-medium text-ddg-ink inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-ddg-muted" />
                  {ticket.contact_phone as string}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Mensagem original */}
        {ticket.message && (
          <section className="mt-5 rounded-2xl border-2 border-ddg-stone bg-ddg-paper p-5">
            <div className="ddg-bracket mb-2">SEU PEDIDO ORIGINAL</div>
            <p className="text-sm text-ddg-ink whitespace-pre-wrap leading-relaxed">
              {ticket.message as string}
            </p>
          </section>
        )}

        {/* Comentário */}
        <section className="mt-5 rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-5">
          <div className="ddg-bracket mb-3">FALAR COM O TIME</div>
          {canComment ? (
            <CommentForm ticketId={ticket.id as string} />
          ) : (
            <p className="text-sm text-ddg-muted italic">
              Esse pedido já foi {status === "resolved" ? "concluído" : "cancelado"}.
              Pra abrir um novo, volta no{" "}
              <Link
                href="/settings/integration"
                className="text-ddg-ink underline hover:text-ddg-lime-deep"
              >
                painel
              </Link>
              .
            </p>
          )}
        </section>

        {/* Histórico */}
        <section className="mt-5 rounded-2xl border-2 border-ddg-stone bg-ddg-paper p-5">
          <div className="ddg-bracket mb-3">HISTÓRICO</div>
          {publicEvents.length === 0 ? (
            <p className="text-sm text-ddg-muted italic">
              Nada por enquanto. Conforme avançarmos, a gente atualiza aqui.
            </p>
          ) : (
            <ul className="space-y-3">
              {publicEvents.map((e, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <div className="shrink-0 w-1.5 mt-2 rounded-full bg-ddg-lime self-stretch" />
                  <div className="flex-1 min-w-0">
                    <PublicEvent event={e} />
                    <div className="text-[10px] font-mono text-ddg-muted mt-0.5">
                      {formatDate(e.at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-ddg-muted">
            Link único do seu pedido · não compartilhe
          </p>
          <Link
            href="/"
            className="mt-2 inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-ddg-muted hover:text-ddg-ink transition-colors"
          >
            <Globe className="w-3 h-3" />
            conteudai.com.br
          </Link>
        </div>
      </div>
    </div>
  );
}

const STATUS_LABEL_PUBLIC: Record<string, string> = {
  open: "Recebido",
  in_progress: "Em andamento",
  waiting_client: "Aguardando você",
  resolved: "Resolvido",
  cancelled: "Cancelado",
};

function PublicEvent({ event }: { event: TicketEvent }) {
  if (event.type === "status_change") {
    const { from, to } = event.payload as { from: string; to: string };
    return (
      <span className="text-ddg-ink">
        Status:{" "}
        <strong>{STATUS_LABEL_PUBLIC[from] ?? from}</strong> →{" "}
        <strong>{STATUS_LABEL_PUBLIC[to] ?? to}</strong>
      </span>
    );
  }
  if (event.type === "assigned") {
    const { to } = event.payload as { to: string | null };
    if (!to)
      return <span className="text-ddg-muted">Time DDG reorganizando ticket</span>;
    return (
      <span className="text-ddg-ink">
        Um especialista do time DDG pegou seu pedido
      </span>
    );
  }
  if (event.type === "client_comment") {
    return (
      <div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-ddg-lime-deep">
          Você comentou
        </span>
        <p className="text-ddg-ink mt-1 whitespace-pre-wrap">
          {String((event.payload as { text?: string }).text ?? "")}
        </p>
      </div>
    );
  }
  return null;
}
