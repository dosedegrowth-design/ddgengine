/**
 * /admin/tickets/[id] — detalhe completo de um ticket.
 *
 * Mostra: org + site + cliente + mensagem + timeline de eventos
 * Permite: mudar status, atribuir/auto-atribuir, adicionar nota interna
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Globe,
  Mail,
  Phone,
  Server,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { formatRelativeTime, formatDate } from "@/lib/utils";
import { StatusPicker } from "../status-picker";
import { AssigneePicker } from "../assignee-picker";
import { NoteForm } from "../note-form";

const STATUS_LABEL: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  waiting_client: "Aguardando cliente",
  resolved: "Resolvido",
  cancelled: "Cancelado",
};

const TYPE_LABEL: Record<string, string> = {
  domain_integration: "Concierge · Integração de domínio",
};

interface TicketEvent {
  type: "status_change" | "assigned" | "note_added" | "comment";
  by: string;
  at: string;
  payload: Record<string, unknown>;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminTicketDetailPage({ params }: PageProps) {
  const { user } = await requireAdmin();
  const { id } = await params;

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
      .select("id, name, slug, plan, status, contact_phone, owner_user_id")
      .eq("id", ticket.organization_id)
      .maybeSingle(),
    ticket.site_id
      ? admin
          .from("sites")
          .select(
            "id, domain, integration_state, cloudflare_zone_id, cloudflare_nameservers, integration_started_at, integration_activated_at"
          )
          .eq("id", ticket.site_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const metadata = (ticket.metadata ?? {}) as {
    events?: TicketEvent[];
    [k: string]: unknown;
  };
  const events = [...(metadata.events ?? [])].reverse();
  const notes = events.filter((e) => e.type === "note_added");

  return (
    <div className="container mx-auto max-w-5xl px-4 md:px-6 py-6 md:py-8">
      <Link
        href="/admin/tickets"
        className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-ddg-muted hover:text-ddg-ink transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar pros tickets
      </Link>

      {/* Header */}
      <div className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper shadow-[5px_5px_0_var(--ddg-ink)] p-5 md:p-7">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="ddg-bracket">TICKET</span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
            {TYPE_LABEL[ticket.type] ?? ticket.type}
          </span>
          <code className="text-[10px] font-mono text-ddg-muted">
            #{ticket.id.slice(0, 8)}
          </code>
        </div>
        <h1 className="ddg-display text-2xl md:text-3xl mb-1">
          {org?.name ?? "Org desconhecida"}
        </h1>
        {site?.domain && (
          <p className="text-base text-ddg-muted">
            Domínio:{" "}
            <strong className="text-ddg-ink font-mono">{site.domain}</strong>
          </p>
        )}

        <div className="mt-5 grid md:grid-cols-3 gap-3">
          <StatusPicker
            ticketId={ticket.id}
            currentStatus={ticket.status as string}
          />
          <AssigneePicker
            ticketId={ticket.id}
            currentAssignee={ticket.assigned_to_email as string | null}
            currentUserEmail={user.email ?? ""}
          />
          <div className="rounded-xl border-2 border-ddg-stone bg-ddg-cream/40 p-3">
            <div className="ddg-bracket text-[10px] mb-1">CRIADO</div>
            <div className="text-sm font-medium text-ddg-ink">
              {formatRelativeTime(ticket.created_at)}
            </div>
            <div className="text-[10px] font-mono text-ddg-muted mt-0.5">
              {formatDate(ticket.created_at)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        {/* Coluna principal — mensagem + notes + timeline */}
        <div className="md:col-span-2 space-y-4">
          {ticket.message && (
            <section className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-5">
              <div className="ddg-bracket mb-2">MENSAGEM DO CLIENTE</div>
              <p className="text-sm text-ddg-ink whitespace-pre-wrap leading-relaxed">
                {ticket.message}
              </p>
            </section>
          )}

          <section className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="ddg-bracket">NOTAS INTERNAS</div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
                Só pro time DDG
              </span>
            </div>

            <NoteForm ticketId={ticket.id} />

            {notes.length === 0 ? (
              <p className="text-sm text-ddg-muted italic mt-4">
                Nenhuma nota interna ainda.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {notes.map((n, i) => (
                  <li
                    key={i}
                    className="rounded-xl border-2 border-ddg-stone bg-ddg-cream/40 p-3"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-ddg-ink">
                        {n.by}
                      </span>
                      <span className="text-[10px] font-mono text-ddg-muted">
                        {formatRelativeTime(n.at)}
                      </span>
                    </div>
                    <p className="text-sm text-ddg-ink whitespace-pre-wrap">
                      {String((n.payload as { text?: string }).text ?? "")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-5">
            <div className="ddg-bracket mb-3">TIMELINE</div>
            {events.length === 0 ? (
              <p className="text-sm text-ddg-muted italic">
                Nenhum evento ainda.
              </p>
            ) : (
              <ul className="space-y-2">
                {events.map((e, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <div className="shrink-0 w-1.5 mt-2 rounded-full bg-ddg-lime self-stretch" />
                    <div className="flex-1 min-w-0">
                      <EventLabel event={e} />
                      <div className="text-[10px] font-mono text-ddg-muted mt-0.5">
                        {formatDate(e.at)} · {e.by}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Sidebar — info contato + org + site */}
        <aside className="space-y-4">
          <section className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-5">
            <div className="ddg-bracket mb-3">CONTATO</div>
            <dl className="space-y-2.5 text-sm">
              {ticket.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-ddg-muted shrink-0" />
                  <a
                    href={`mailto:${ticket.contact_email}`}
                    className="text-ddg-ink hover:underline truncate"
                  >
                    {ticket.contact_email}
                  </a>
                </div>
              )}
              {ticket.contact_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-ddg-muted shrink-0" />
                  <a
                    href={`https://wa.me/${ticket.contact_phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ddg-ink hover:underline"
                  >
                    {ticket.contact_phone}
                  </a>
                </div>
              )}
            </dl>
          </section>

          {org && (
            <section className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-5">
              <div className="ddg-bracket mb-3">ORGANIZAÇÃO</div>
              <dl className="space-y-2.5 text-sm">
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-ddg-muted shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-ddg-ink font-medium">{org.name}</div>
                    <div className="text-[10px] font-mono text-ddg-muted">
                      {org.slug}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-ddg-stone">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
                      Plano
                    </div>
                    <div className="text-ddg-ink font-medium">{org.plan ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
                      Status
                    </div>
                    <div className="text-ddg-ink font-medium">{org.status ?? "—"}</div>
                  </div>
                </div>
              </dl>
            </section>
          )}

          {site && (
            <section className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-5">
              <div className="ddg-bracket mb-3">SITE / INTEGRAÇÃO</div>
              <dl className="space-y-2.5 text-sm">
                {site.domain && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-ddg-muted shrink-0" />
                    <code className="font-mono text-ddg-ink">{site.domain}</code>
                  </div>
                )}
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted mb-1">
                    Estado
                  </div>
                  <code className="inline-block text-[11px] font-mono px-2 py-1 rounded bg-ddg-ink text-ddg-paper">
                    {site.integration_state ?? "—"}
                  </code>
                </div>
                {site.cloudflare_nameservers && (
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted mb-1">
                      Nameservers atribuídos
                    </div>
                    <ul className="space-y-0.5">
                      {(site.cloudflare_nameservers as string[]).map((ns) => (
                        <li key={ns}>
                          <code className="text-[11px] font-mono text-ddg-ink">
                            {ns}
                          </code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {site.cloudflare_zone_id && (
                  <a
                    href={`https://dash.cloudflare.com/?to=/:account/${site.cloudflare_zone_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-ddg-ink hover:text-ddg-lime-deep transition-colors mt-1"
                  >
                    <Server className="w-3.5 h-3.5" />
                    Abrir no Cloudflare
                  </a>
                )}
              </dl>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function EventLabel({ event }: { event: TicketEvent }) {
  if (event.type === "status_change") {
    const { from, to } = event.payload as { from: string; to: string };
    return (
      <span className="text-ddg-ink">
        Status:{" "}
        <strong>{STATUS_LABEL[from] ?? from}</strong> →{" "}
        <strong>{STATUS_LABEL[to] ?? to}</strong>
      </span>
    );
  }
  if (event.type === "assigned") {
    const { from, to } = event.payload as {
      from: string | null;
      to: string | null;
    };
    if (!to) return <span className="text-ddg-ink">Atribuição removida</span>;
    if (!from)
      return (
        <span className="text-ddg-ink">
          Atribuído a <strong>{to}</strong>
        </span>
      );
    return (
      <span className="text-ddg-ink">
        Reatribuído: <strong>{from}</strong> → <strong>{to}</strong>
      </span>
    );
  }
  if (event.type === "note_added") {
    return <span className="text-ddg-ink">Nota interna adicionada</span>;
  }
  return <span className="text-ddg-muted">{event.type}</span>;
}
