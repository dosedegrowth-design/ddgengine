"use client";

/**
 * SeoReport — painel de score SEO/GEO por post (estilo RankMath).
 *
 * Recebe o relatório inicial calculado no server e mostra:
 *  - nota geral (0-100) + selo de qualidade
 *  - contadores (palavras, leitura, links, imagens)
 *  - seções (palavra-chave, SEO, GEO, estrutura) com checklist colorido
 *  - botão "Reanalisar" (recalcula sobre o conteúdo salvo após editar)
 *
 * O checklist destaca o que falta primeiro (fail/warn no topo).
 */
import { useState, useTransition } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ChevronDown,
  Gauge,
  FileText,
  Clock,
  Link2,
  Image as ImageIcon,
} from "lucide-react";
import { analyzePostAction } from "@/app/(app)/posts/actions";
import type { PostSeoReport, SeoSection, CheckStatus } from "@/lib/seo/analyze-post";

const RATING_LABEL: Record<PostSeoReport["rating"], string> = {
  excelente: "Excelente",
  bom: "Bom",
  regular: "Regular",
  ruim: "Precisa melhorar",
};

function scoreColor(score: number): { text: string; bg: string; ring: string } {
  if (score >= 85) return { text: "text-emerald-700", bg: "bg-emerald-500", ring: "text-emerald-500" };
  if (score >= 70) return { text: "text-lime-700", bg: "bg-lime-500", ring: "text-lime-500" };
  if (score >= 50) return { text: "text-amber-700", bg: "bg-amber-500", ring: "text-amber-500" };
  return { text: "text-red-700", bg: "bg-red-500", ring: "text-red-500" };
}

export function SeoReport({
  postId,
  initial,
}: {
  postId: string;
  initial: PostSeoReport;
}) {
  const [report, setReport] = useState<PostSeoReport>(initial);
  const [isPending, startTransition] = useTransition();

  function reanalyze() {
    startTransition(async () => {
      const res = await analyzePostAction(postId);
      if ("report" in res) setReport(res.report);
    });
  }

  const c = scoreColor(report.overall);
  const circumference = 2 * Math.PI * 26;
  const dash = (report.overall / 100) * circumference;

  return (
    <div className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper overflow-hidden">
      {/* Cabeçalho com nota geral */}
      <div className="p-5 md:p-6 border-b-2 border-ddg-ink flex items-center gap-5">
        {/* Gauge circular */}
        <div className="relative shrink-0 w-[68px] h-[68px]">
          <svg viewBox="0 0 60 60" className="w-full h-full -rotate-90">
            <circle cx="30" cy="30" r="26" fill="none" stroke="currentColor" strokeWidth="6" className="text-ddg-stone" />
            <circle
              cx="30"
              cy="30"
              r="26"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              className={c.ring}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-black text-lg ${c.text}`}>{report.overall}</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="ddg-bracket text-ddg-muted flex items-center gap-1.5">
            <Gauge className="w-3 h-3" /> QUALIDADE SEO · GEO
          </div>
          <div className={`font-black text-xl ${c.text}`}>{RATING_LABEL[report.rating]}</div>
          {report.focusKeyword ? (
            <p className="text-xs text-ddg-muted mt-0.5">
              Foco: <strong className="text-ddg-ink">{report.focusKeyword}</strong>
            </p>
          ) : (
            <p className="text-xs text-ddg-muted mt-0.5">
              Sem palavra-chave de foco definida
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={reanalyze}
          disabled={isPending}
          className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-ddg-ink text-ddg-ink text-xs font-bold hover:bg-ddg-ink hover:text-ddg-paper transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
          Reanalisar
        </button>
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-4 divide-x divide-ddg-stone border-b-2 border-ddg-ink">
        <Counter icon={FileText} label="Palavras" value={report.counts.words.toLocaleString("pt-BR")} />
        <Counter icon={Clock} label="Leitura" value={`${report.counts.readingMinutes} min`} />
        <Counter icon={Link2} label="Links" value={String(report.counts.links)} />
        <Counter icon={ImageIcon} label="Imagens" value={String(report.counts.images)} />
      </div>

      {/* Seções */}
      <div className="divide-y divide-ddg-stone">
        {report.sections.map((s) => (
          <SectionBlock key={s.key} section={s} />
        ))}
      </div>

      <p className="px-5 py-3 text-[11px] text-ddg-muted bg-ddg-cream/40 border-t border-ddg-stone">
        Editou o post? Salve e clique em <strong>Reanalisar</strong> pra atualizar a nota.
      </p>
    </div>
  );
}

function Counter({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="px-3 py-3 text-center">
      <Icon className="w-3.5 h-3.5 text-ddg-muted mx-auto mb-1" />
      <div className="font-black text-sm text-ddg-ink leading-none">{value}</div>
      <div className="text-[9px] font-mono uppercase tracking-widest text-ddg-muted mt-1">
        {label}
      </div>
    </div>
  );
}

function SectionBlock({ section }: { section: SeoSection }) {
  // fails/warns primeiro, passes depois
  const order: Record<CheckStatus, number> = { fail: 0, warn: 1, pass: 2 };
  const checks = [...section.checks].sort((a, b) => order[a.status] - order[b.status]);
  const problems = section.checks.filter((c) => c.status !== "pass").length;
  const [open, setOpen] = useState(problems > 0);
  const c = scoreColor(section.score);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-ddg-cream/40 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-ddg-ink">{section.label}</div>
          <div className="text-[11px] text-ddg-muted">
            {problems === 0 ? "Tudo certo" : `${problems} item(ns) pra melhorar`}
          </div>
        </div>
        {/* mini barra */}
        <div className="hidden sm:block w-24 h-2 rounded-full bg-ddg-stone overflow-hidden shrink-0">
          <div className={`h-full ${c.bg}`} style={{ width: `${section.score}%` }} />
        </div>
        <span className={`font-black text-sm w-9 text-right ${c.text}`}>{section.score}</span>
        <ChevronDown
          className={`w-4 h-4 text-ddg-muted transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul className="px-5 pb-4 space-y-2">
          {checks.map((check) => (
            <li key={check.id} className="flex items-start gap-2.5">
              <StatusIcon status={check.status} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-ddg-ink font-medium">{check.label}</span>
                  <span className="text-[11px] text-ddg-muted shrink-0">{check.detail}</span>
                </div>
                {check.status !== "pass" && check.hint && (
                  <p className="text-[11px] text-ddg-muted mt-0.5">{check.hint}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "pass")
    return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />;
  if (status === "warn")
    return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
  return <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />;
}
