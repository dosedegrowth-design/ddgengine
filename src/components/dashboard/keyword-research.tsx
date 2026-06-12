"use client";

/**
 * KeywordResearch — pesquisa de palavra-chave (Google Keyword Planner).
 *
 * Cliente digita um termo semente → tabela de ideias com volume mensal,
 * concorrência e tendência (Brasil/pt-BR). Cada linha vira post com 1 clique
 * (gera com aquela palavra-chave de foco e abre o post).
 *
 * Se a integração ainda não está configurada, mostra estado neutro.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ArrowUpDown,
} from "lucide-react";
import { keywordIdeasAction } from "@/app/(app)/palavras-chave/actions";
import { generatePostAction } from "@/app/(app)/posts/actions";
import type { KeywordIdea, Competition } from "@/lib/seo/keyword-research";

const COMP_STYLE: Record<Competition, { label: string; cls: string }> = {
  baixa: { label: "Baixa", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  media: { label: "Média", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  alta: { label: "Alta", cls: "bg-red-100 text-red-800 border-red-300" },
  desconhecida: { label: "—", cls: "bg-ddg-stone text-ddg-muted border-ddg-stone" },
};

type SortKey = "volume" | "competition";

export function KeywordResearch({ initialSeed }: { initialSeed?: string }) {
  const router = useRouter();
  const [seed, setSeed] = useState(initialSeed ?? "");
  const [ideas, setIdeas] = useState<KeywordIdea[] | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [searching, startSearch] = useTransition();
  const [genKw, setGenKw] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("volume");

  function search(term?: string) {
    const q = (term ?? seed).trim();
    if (!q) {
      toast.error("Digite um termo pra pesquisar");
      return;
    }
    if (term) setSeed(term);
    startSearch(async () => {
      const res = await keywordIdeasAction(q);
      if (!res.ok) {
        if (res.notConfigured) {
          setNotConfigured(true);
          setIdeas(null);
          return;
        }
        toast.error(res.error);
        return;
      }
      setNotConfigured(false);
      setIdeas(res.ideas);
      if (res.ideas.length === 0) toast.info("Nenhuma ideia encontrada pra esse termo.");
    });
  }

  function generateFrom(keyword: string) {
    setGenKw(keyword);
    toast.info(`Gerando post pra "${keyword}"… 1-2 min`, { duration: 8000 });
    (async () => {
      const res = await generatePostAction({
        type: "long_form",
        topic: keyword,
        targetKeyword: keyword,
      });
      setGenKw(null);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      if ("success" in res && res.success && res.post) {
        toast.success(`Post gerado: ${res.post.title}`);
        const postId = (res.post as { postId?: string }).postId;
        router.push(postId ? `/posts/${postId}` : "/posts");
        router.refresh();
      }
    })();
  }

  const sorted = ideas
    ? [...ideas].sort((a, b) =>
        sortKey === "volume"
          ? b.volume - a.volume
          : (b.competitionIndex ?? -1) - (a.competitionIndex ?? -1)
      )
    : null;

  return (
    <div className="space-y-5">
      {/* Busca */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ddg-muted" />
          <input
            type="text"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Ex: ração hipoalergênica, dermatite em cães"
            disabled={searching}
            className="w-full h-11 pl-9 pr-3 rounded-lg border-2 border-ddg-ink bg-ddg-paper text-ddg-ink placeholder:text-ddg-muted/60 focus:bg-ddg-cream focus:outline-none disabled:opacity-50 transition-colors text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => search()}
          disabled={searching || !seed.trim()}
          className="shrink-0 inline-flex items-center justify-center gap-2 px-5 h-11 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-50"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Pesquisar
        </button>
      </div>

      {/* Estado: não configurado */}
      {notConfigured && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Pesquisa de palavra-chave em configuração.</strong> A conexão
          com o Google ainda está sendo ativada — volta em breve.
        </div>
      )}

      {/* Resultados */}
      {sorted && sorted.length > 0 && (
        <div className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-ddg-ink bg-ddg-cream/50 text-left">
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-ddg-muted">
                    Palavra-chave
                  </th>
                  <th className="px-3 py-3">
                    <button
                      onClick={() => setSortKey("volume")}
                      className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest ${
                        sortKey === "volume" ? "text-ddg-ink" : "text-ddg-muted"
                      }`}
                    >
                      Buscas/mês <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-3 py-3">
                    <button
                      onClick={() => setSortKey("competition")}
                      className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest ${
                        sortKey === "competition" ? "text-ddg-ink" : "text-ddg-muted"
                      }`}
                    >
                      Concorrência <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-widest text-ddg-muted hidden sm:table-cell">
                    Tendência
                  </th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ddg-stone">
                {sorted.map((k) => {
                  const comp = COMP_STYLE[k.competition];
                  return (
                    <tr key={k.keyword} className="hover:bg-ddg-cream/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-ddg-ink">{k.keyword}</td>
                      <td className="px-3 py-3 tabular-nums font-bold text-ddg-ink">
                        {k.volume.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${comp.cls}`}
                        >
                          {comp.label}
                          {k.competitionIndex != null && (
                            <span className="ml-1 opacity-70">{k.competitionIndex}</span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <TrendCell trend={k.trend} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => generateFrom(k.keyword)}
                          disabled={genKw !== null}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border-2 border-ddg-ink text-ddg-ink text-xs font-bold hover:bg-ddg-lime transition-colors disabled:opacity-40 whitespace-nowrap"
                        >
                          {genKw === k.keyword ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                          Gerar post
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2.5 text-[11px] text-ddg-muted bg-ddg-cream/40 border-t border-ddg-stone">
            Volume médio mensal de buscas no Google · Brasil · pt-BR. Fonte:
            Google Keyword Planner.
          </p>
        </div>
      )}

      {sorted && sorted.length === 0 && !searching && (
        <div className="rounded-xl border-2 border-ddg-stone bg-ddg-paper p-6 text-center text-sm text-ddg-muted">
          Nenhuma ideia encontrada. Tenta um termo mais genérico.
        </div>
      )}
    </div>
  );
}

function TrendCell({ trend }: { trend: number | null }) {
  if (trend == null)
    return <span className="text-ddg-muted inline-flex items-center gap-1"><Minus className="w-3 h-3" /></span>;
  if (trend > 5)
    return (
      <span className="text-emerald-700 inline-flex items-center gap-1 text-xs font-medium">
        <TrendingUp className="w-3.5 h-3.5" /> +{trend}%
      </span>
    );
  if (trend < -5)
    return (
      <span className="text-red-600 inline-flex items-center gap-1 text-xs font-medium">
        <TrendingDown className="w-3.5 h-3.5" /> {trend}%
      </span>
    );
  return (
    <span className="text-ddg-muted inline-flex items-center gap-1 text-xs">
      <Minus className="w-3 h-3" /> estável
    </span>
  );
}
