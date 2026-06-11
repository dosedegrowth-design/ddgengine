/**
 * /admin/backfill-rag — painel staff pra rodar processBriefingEmbeddings
 * nos briefings que ficaram com embedding_status='pending' ou 'failed'.
 *
 * Usado pra corrigir o legado (briefings criados antes do fix do
 * /api/briefing/save). Visível só pra DDG staff.
 */
import { requireAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackfillRunner } from "./runner";

export default async function BackfillRagPage() {
  await requireAdmin();

  const admin = createServiceClient();

  // Stats agregadas
  const { data: allBriefings } = await admin
    .from("briefings")
    .select("embedding_status, completion_status");
  const stats = (allBriefings ?? []).reduce(
    (acc, b) => {
      const key = b.embedding_status ?? "null";
      acc[key] = (acc[key] ?? 0) + 1;
      if (b.completion_status === "completed") acc._completed++;
      return acc;
    },
    {
      pending: 0,
      processing: 0,
      done: 0,
      failed: 0,
      null: 0,
      _completed: 0,
    } as Record<string, number>
  );

  // Lista de pendentes (completed mas sem embedding done)
  const { data: pending } = await admin
    .from("briefings")
    .select("id, organization_id, site_id, embedding_status, created_at, completed_at")
    .eq("completion_status", "completed")
    .in("embedding_status", ["pending", "failed", "processing"])
    .order("created_at", { ascending: true });

  const pendingList = (pending ?? []) as Array<{
    id: string;
    organization_id: string;
    site_id: string | null;
    embedding_status: string;
    created_at: string;
    completed_at: string | null;
  }>;

  // Enrich com nome da org + domínio do site
  const orgIds = Array.from(new Set(pendingList.map((p) => p.organization_id)));
  const siteIds = Array.from(
    new Set(pendingList.map((p) => p.site_id).filter((x): x is string => !!x))
  );

  const [{ data: orgs }, { data: sites }] = await Promise.all([
    orgIds.length
      ? admin.from("organizations").select("id, name").in("id", orgIds)
      : Promise.resolve({ data: [] }),
    siteIds.length
      ? admin.from("sites").select("id, domain").in("id", siteIds)
      : Promise.resolve({ data: [] }),
  ]);

  const orgById = new Map(
    ((orgs ?? []) as Array<{ id: string; name: string }>).map((o) => [o.id, o.name])
  );
  const siteById = new Map(
    ((sites ?? []) as Array<{ id: string; domain: string | null }>).map((s) => [
      s.id,
      s.domain,
    ])
  );

  // Sample brand_documents pra dar evidência visual
  const { count: brandDocsCount } = await admin
    .from("brand_documents")
    .select("id", { count: "exact", head: true });

  return (
    <div>
      <PageHeader
        bracket="ADMIN · MANUTENÇÃO"
        title="Backfill RAG"
        subtitle={
          <span>
            Roda <code className="text-ddg-ink font-mono">processBriefingEmbeddings</code>{" "}
            nos briefings que ficaram sem RAG. Usado pra corrigir legado anterior
            ao fix do <code>/api/briefing/save</code>.
          </span>
        }
      />

      <div className="container mx-auto max-w-5xl px-6 py-8 space-y-6">
        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard
            label="Briefings completed"
            value={stats._completed}
            tone="stone"
          />
          <StatCard label="embedding=done" value={stats.done} tone="lime" />
          <StatCard
            label="embedding=pending"
            value={stats.pending}
            tone="amber"
          />
          <StatCard label="embedding=failed" value={stats.failed} tone="red" />
          <StatCard
            label="brand_documents (total)"
            value={brandDocsCount ?? 0}
            tone="blue"
          />
        </section>

        {/* Runner */}
        <BackfillRunner targetCount={pendingList.length} />

        {/* Tabela de pendentes */}
        <section className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper overflow-hidden">
          <div className="p-4 border-b-2 border-ddg-stone flex items-center justify-between">
            <div className="ddg-bracket">PENDENTES DE BACKFILL</div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
              {pendingList.length} alvos · processamento sequencial
            </span>
          </div>
          {pendingList.length === 0 ? (
            <div className="p-8 text-center text-sm text-ddg-muted italic">
              Nada pra fazer. Todos os briefings completed já têm RAG processado.
            </div>
          ) : (
            <ul className="divide-y-2 divide-ddg-stone">
              {pendingList.map((b) => {
                const orgName = orgById.get(b.organization_id) ?? "—";
                const domain = b.site_id ? siteById.get(b.site_id) : null;
                return (
                  <li
                    key={b.id}
                    className="p-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-ddg-ink truncate">
                        {orgName}
                        {domain && (
                          <span className="text-ddg-muted font-medium ml-2">
                            · {domain}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
                        <span>id {b.id.slice(0, 8)}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            b.embedding_status === "failed"
                              ? "bg-red-100 text-red-900"
                              : b.embedding_status === "processing"
                                ? "bg-blue-100 text-blue-900"
                                : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {b.embedding_status}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "lime" | "amber" | "red" | "stone" | "blue";
}) {
  const toneCls = {
    lime: "border-ddg-lime bg-ddg-lime/15",
    amber: "border-amber-300 bg-amber-50",
    red: "border-red-300 bg-red-50",
    stone: "border-ddg-stone bg-ddg-cream/50",
    blue: "border-blue-300 bg-blue-50",
  }[tone];

  return (
    <div className={`rounded-xl border-2 p-4 ${toneCls}`}>
      <div className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
        {label}
      </div>
      <div className="font-black text-2xl mt-1">{value}</div>
    </div>
  );
}
