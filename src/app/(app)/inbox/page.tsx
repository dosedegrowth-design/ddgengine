/**
 * Inbox — posts aguardando aprovação com identidade DDG
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, Inbox as InboxIcon } from "lucide-react";
import { getCurrentSite } from "@/lib/auth";
import { formatRelativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";

export default async function InboxPage() {
  const { site, supabase } = await getCurrentSite();
  if (!site) redirect("/onboarding");

  const { data: posts } = await supabase
    .from("posts")
    .select(
      "id, title, type, status, created_at, meta_description, target_keyword"
    )
    .eq("site_id", site.id)
    .eq("status", "in_review")
    .order("created_at", { ascending: false });

  const count = posts?.length ?? 0;

  return (
    <div>
      <PageHeader
        bracket="INBOX DE APROVAÇÕES"
        title="Aprovar posts"
        subtitle={
          count > 0
            ? `${count} ${count === 1 ? "post aguardando" : "posts aguardando"} sua revisão`
            : "Tudo em dia — nada aguardando aprovação."
        }
      />

      <div className="container mx-auto max-w-5xl px-6 py-8 space-y-6">
        {count === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-ddg-ink/30 bg-ddg-cream/50 p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-ddg-lime mb-4 border-2 border-ddg-ink">
              <CheckCircle2 className="w-7 h-7 text-ddg-ink" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black text-ddg-ink mb-2">
              Tudo aprovado!
            </h3>
            <p className="text-sm text-ddg-muted max-w-md mx-auto">
              Nenhum post pendente. Próximas gerações vão aparecer aqui pra você
              aprovar com 1 clique.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {posts!.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/posts/${p.id}`}
                  className="block p-5 rounded-2xl border-2 border-ddg-ink bg-ddg-paper hover:bg-ddg-cream hover:shadow-[4px_4px_0_var(--ddg-lime)] hover:-translate-y-0.5 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-ddg-stone text-ddg-muted">
                          {p.type === "long_form" ? "Artigo" : "FAQ"}
                        </span>
                        <StatusBadge status="in_review" />
                      </div>
                      <h3 className="text-lg md:text-xl font-black text-ddg-ink mb-1 group-hover:text-ddg-lime-deep transition-colors">
                        {p.title}
                      </h3>
                      {p.meta_description && (
                        <p className="text-sm text-ddg-muted leading-relaxed line-clamp-2 mb-2">
                          {p.meta_description}
                        </p>
                      )}
                      <div className="text-xs font-mono uppercase tracking-widest text-ddg-muted mt-2">
                        Criado {formatRelativeTime(p.created_at)}
                        {p.target_keyword && (
                          <span className="ml-2">
                            ● Keyword: {p.target_keyword}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] group-hover:shadow-[5px_5px_0_var(--ddg-ink)] group-hover:-translate-y-0.5 transition-all">
                      Revisar
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="text-center text-xs font-mono uppercase tracking-widest text-ddg-muted pt-4">
          <InboxIcon className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
          Você também pode aprovar via WhatsApp — configure em{" "}
          <Link
            href="/settings/notifications"
            className="text-ddg-lime-deep hover:underline"
          >
            Notificações
          </Link>
        </p>
      </div>
    </div>
  );
}
