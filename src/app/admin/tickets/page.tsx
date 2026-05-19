/**
 * /admin/tickets — lista todos os tickets de TODAS as orgs (visão DDG staff).
 *
 * Filtros via query string:
 *   ?status=open|in_progress|waiting_client|resolved|cancelled|all
 *   ?type=domain_integration|...
 *   ?q=<search>     (busca em domínio/email/org_name)
 *
 * Defaults: status='open,in_progress,waiting_client' (não-resolvidos), type='all'
 */
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  Filter,
  Mail,
  Phone,
  Search,
  Sparkles,
  User,
} from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { PageHeader } from "@/components/dashboard/page-header";
import { formatRelativeTime } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const STATUS_LABEL: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  waiting_client: "Aguardando cliente",
  resolved: "Resolvido",
  cancelled: "Cancelado",
};

const STATUS_TONE: Record<string, string> = {
  open: "bg-red-50 text-red-900 border-red-200",
  in_progress: "bg-blue-50 text-blue-900 border-blue-200",
  waiting_client: "bg-amber-50 text-amber-900 border-amber-200",
  resolved: "bg-ddg-lime/20 text-ddg-ink border-ddg-lime",
  cancelled: "bg-ddg-stone text-ddg-muted border-ddg-stone",
};

const TYPE_LABEL: Record<string, string> = {
  domain_integration: "Concierge · Integração",
};

const ACTIVE_STATUSES = ["open", "in_progress", "waiting_client"];

interface Ticket {
  id: string;
  organization_id: string;
  site_id: string | null;
  type: string;
  status: string;
  message: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  assigned_to_email: string | null;
  metadata: Record<string, unknown> | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface OrgRow {
  id: string;
  name: string;
  slug: string;
}

interface SiteRow {
  id: string;
  domain: string | null;
  integration_state: string | null;
}

export default async function AdminTicketsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const statusFilter = typeof sp.status === "string" ? sp.status : "active";
  const typeFilter = typeof sp.type === "string" ? sp.type : "all";
  const query = (typeof sp.q === "string" ? sp.q : "").trim();

  const admin = createServiceClient();

  let q = admin
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (statusFilter === "active") {
    q = q.in("status", ACTIVE_STATUSES);
  } else if (statusFilter !== "all") {
    q = q.eq("status", statusFilter);
  }
  if (typeFilter !== "all") q = q.eq("type", typeFilter);

  const { data: ticketsRaw } = await q;
  const tickets = (ticketsRaw ?? []) as Ticket[];

  // Lookup orgs + sites em batch (sem FK join no PostgREST porque schema custom)
  const orgIds = Array.from(new Set(tickets.map((t) => t.organization_id)));
  const siteIds = Array.from(
    new Set(tickets.map((t) => t.site_id).filter((x): x is string => !!x))
  );

  const [{ data: orgs }, { data: sites }] = await Promise.all([
    orgIds.length
      ? admin.from("organizations").select("id, name, slug").in("id", orgIds)
      : Promise.resolve({ data: [] }),
    siteIds.length
      ? admin
          .from("sites")
          .select("id, domain, integration_state")
          .in("id", siteIds)
      : Promise.resolve({ data: [] }),
  ]);

  const orgById = new Map<string, OrgRow>(
    ((orgs ?? []) as OrgRow[]).map((o) => [o.id, o])
  );
  const siteById = new Map<string, SiteRow>(
    ((sites ?? []) as SiteRow[]).map((s) => [s.id, s])
  );

  // Filtro de texto (em memória, dataset pequeno)
  const lowerQ = query.toLowerCase();
  const filteredTickets = query
    ? tickets.filter((t) => {
        const org = orgById.get(t.organization_id);
        const site = t.site_id ? siteById.get(t.site_id) : null;
        const hay = [
          t.contact_email,
          t.contact_phone,
          t.message,
          org?.name,
          org?.slug,
          site?.domain,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(lowerQ);
      })
    : tickets;

  // Estatísticas (sem filtro de status nem texto)
  const { data: statsRaw } = await admin
    .from("support_tickets")
    .select("status");
  const stats = (statsRaw ?? []) as { status: string }[];
  const byStatus: Record<string, number> = {};
  for (const s of stats) byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
  const totalActive = ACTIVE_STATUSES.reduce(
    (acc, k) => acc + (byStatus[k] ?? 0),
    0
  );

  return (
    <div>
      <PageHeader
        bracket="ADMIN"
        title="Tickets de suporte"
        subtitle={
          <span>
            Pedidos de concierge + suporte. Você é DDG staff aqui — vê
            <strong className="text-ddg-ink"> todas as orgs</strong>.
          </span>
        }
      />

      <div className="container mx-auto max-w-7xl px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard
            label="Ativos"
            value={totalActive}
            tone="lime"
            href="?status=active"
          />
          <StatCard
            label="Abertos"
            value={byStatus.open ?? 0}
            tone="red"
            href="?status=open"
          />
          <StatCard
            label="Em andamento"
            value={byStatus.in_progress ?? 0}
            tone="blue"
            href="?status=in_progress"
          />
          <StatCard
            label="Aguardando cliente"
            value={byStatus.waiting_client ?? 0}
            tone="amber"
            href="?status=waiting_client"
          />
          <StatCard
            label="Resolvidos"
            value={byStatus.resolved ?? 0}
            tone="stone"
            href="?status=resolved"
          />
        </div>

        {/* Filtros */}
        <form
          method="get"
          className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center"
        >
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-ddg-muted shrink-0">
            <Filter className="w-3.5 h-3.5" />
            Filtros
          </div>

          <label className="flex-1 flex items-center gap-2 border-2 border-ddg-stone rounded-lg px-3 py-2 focus-within:border-ddg-ink transition-colors">
            <Search className="w-4 h-4 text-ddg-muted shrink-0" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Buscar por domínio, email, org…"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-ddg-muted"
            />
          </label>

          <select
            name="status"
            defaultValue={statusFilter}
            className="border-2 border-ddg-stone rounded-lg px-3 py-2 text-sm bg-ddg-paper outline-none focus:border-ddg-ink"
          >
            <option value="active">Ativos</option>
            <option value="all">Todos</option>
            <option value="open">Abertos</option>
            <option value="in_progress">Em andamento</option>
            <option value="waiting_client">Aguardando cliente</option>
            <option value="resolved">Resolvidos</option>
            <option value="cancelled">Cancelados</option>
          </select>

          <select
            name="type"
            defaultValue={typeFilter}
            className="border-2 border-ddg-stone rounded-lg px-3 py-2 text-sm bg-ddg-paper outline-none focus:border-ddg-ink"
          >
            <option value="all">Todos os tipos</option>
            <option value="domain_integration">Integração de domínio</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-ddg-ink text-ddg-paper font-bold text-sm hover:bg-ddg-ink/85 transition-colors shrink-0"
          >
            Aplicar
          </button>
        </form>

        {/* Lista */}
        {filteredTickets.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-ddg-stone bg-ddg-cream/30 p-12 text-center">
            <Sparkles className="w-8 h-8 mx-auto text-ddg-muted mb-3" />
            <div className="ddg-bracket mb-2">VAZIO</div>
            <p className="text-sm text-ddg-muted">
              Nenhum ticket bate com esses filtros.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper overflow-hidden">
            <ul className="divide-y-2 divide-ddg-stone">
              {filteredTickets.map((t) => {
                const org = orgById.get(t.organization_id);
                const site = t.site_id ? siteById.get(t.site_id) : null;
                return (
                  <li key={t.id}>
                    <Link
                      href={`/admin/tickets/${t.id}`}
                      className="flex items-start gap-4 p-4 hover:bg-ddg-lime/10 transition-colors group"
                    >
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest border ${
                              STATUS_TONE[t.status] ??
                              "bg-ddg-stone text-ddg-muted border-ddg-stone"
                            }`}
                          >
                            {STATUS_LABEL[t.status] ?? t.status}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
                            {TYPE_LABEL[t.type] ?? t.type}
                          </span>
                          {t.assigned_to_email && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-ddg-ink">
                              <User className="w-3 h-3" />
                              {t.assigned_to_email.split("@")[0]}
                            </span>
                          )}
                        </div>

                        <div className="font-bold text-base text-ddg-ink truncate">
                          {org?.name ?? "Org desconhecida"}
                          {site?.domain && (
                            <span className="text-ddg-muted font-medium ml-2">
                              · {site.domain}
                            </span>
                          )}
                        </div>

                        {t.message && (
                          <p className="text-sm text-ddg-muted leading-snug line-clamp-2">
                            {t.message}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ddg-muted">
                          {t.contact_email && (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {t.contact_email}
                            </span>
                          )}
                          {t.contact_phone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {t.contact_phone}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatRelativeTime(t.created_at)}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-ddg-muted shrink-0 mt-1 group-hover:text-ddg-ink transition-colors" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {filteredTickets.length >= 200 && (
          <div className="flex items-center gap-2 text-xs text-ddg-muted">
            <AlertCircle className="w-3.5 h-3.5" />
            Mostrando os 200 mais recentes. Estreita os filtros pra ver mais.
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: number;
  tone: "lime" | "red" | "blue" | "amber" | "stone";
  href: string;
}) {
  const toneCls = {
    lime: "border-ddg-lime bg-ddg-lime/15",
    red: "border-red-300 bg-red-50",
    blue: "border-blue-300 bg-blue-50",
    amber: "border-amber-300 bg-amber-50",
    stone: "border-ddg-stone bg-ddg-cream/50",
  }[tone];

  return (
    <Link
      href={href}
      className={`rounded-xl border-2 p-4 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--ddg-ink)] transition-all ${toneCls}`}
    >
      <div className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
        {label}
      </div>
      <div className="font-black text-2xl mt-1">{value}</div>
    </Link>
  );
}
