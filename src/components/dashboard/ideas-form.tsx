"use client";

/**
 * IdeasForm — "Ideias / Fontes": o cliente cola um link (notícia, vídeo do
 * YouTube, post) OU um texto, e a engine ADAPTA num post original no tom da
 * marca dele. Reaproveitamento de conteúdo, como nas grandes plataformas.
 *
 * Fluxo:
 *  1. Cola o link → "Pré-visualizar" extrai e mostra título + prévia.
 *  2. (Opcional) ajusta o ângulo/foco e a palavra-chave.
 *  3. "Gerar post" → multi-pass adapta e redireciona pro post.
 *
 * Alternativa: cola o texto direto (quando não há link ou a extração falha).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  Link2,
  Video,
  Newspaper,
  ClipboardPaste,
  ArrowRight,
  CheckCircle2,
  FileText,
  HelpCircle,
} from "lucide-react";
import {
  previewSourceAction,
  generateFromSourceAction,
} from "@/app/(app)/posts/actions";

type SourceMode = "link" | "text";

export function IdeasForm() {
  const router = useRouter();
  const [mode, setMode] = useState<SourceMode>("link");
  const [type, setType] = useState<"long_form" | "faq_page">("long_form");
  const [url, setUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [angle, setAngle] = useState("");
  const [keyword, setKeyword] = useState("");
  const [preview, setPreview] = useState<{
    title: string;
    type: string;
    chars: number;
    preview: string;
  } | null>(null);
  const [previewing, startPreview] = useTransition();
  const [generating, startGenerate] = useTransition();

  function handlePreview() {
    if (!url.trim()) {
      toast.error("Cole um link primeiro");
      return;
    }
    setPreview(null);
    startPreview(async () => {
      const res = await previewSourceAction(url.trim());
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      if ("success" in res && res.success) {
        setPreview({
          title: res.title,
          type: res.type,
          chars: res.chars,
          preview: res.preview,
        });
        if (!angle.trim()) setAngle("");
        toast.success("Conteúdo lido! Confira a prévia abaixo.");
      }
    });
  }

  function handleGenerate() {
    if (mode === "link" && !url.trim() && !preview) {
      toast.error("Cole um link e pré-visualize");
      return;
    }
    if (mode === "text" && rawText.trim().length < 120) {
      toast.error("Cole um texto com pelo menos algumas frases");
      return;
    }

    startGenerate(async () => {
      toast.info("Adaptando o conteúdo… pode levar 1-2 minutos", {
        duration: 8000,
      });
      const res = await generateFromSourceAction({
        type,
        url: mode === "link" ? url.trim() || undefined : undefined,
        rawText: mode === "text" ? rawText.trim() || undefined : undefined,
        angle: angle.trim() || undefined,
        targetKeyword: keyword.trim() || undefined,
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      if ("success" in res && res.success && res.post) {
        toast.success(`Post gerado: ${res.post.title}`);
        const postId = (res.post as { postId?: string }).postId;
        if (postId) router.push(`/posts/${postId}`);
        else router.push("/posts");
        router.refresh();
      }
    });
  }

  const busy = previewing || generating;

  return (
    <div className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper shadow-[5px_5px_0_var(--ddg-ink)]">
      {/* Header do card */}
      <div className="p-5 md:p-6 border-b-2 border-ddg-ink">
        <div className="ddg-bracket mb-1 text-ddg-muted">REAPROVEITAR · IA</div>
        <h2 className="font-black text-xl md:text-2xl text-ddg-ink leading-tight">
          Tem um conteúdo bom? Vira post.
        </h2>
        <p className="text-sm text-ddg-muted mt-1.5">
          Cole o link de uma notícia, vídeo ou post — a engine adapta num
          artigo <strong className="text-ddg-ink">original</strong> na sua voz,
          otimizado pra Google e IAs.
        </p>
      </div>

      <div className="p-5 md:p-6 space-y-5">
        {/* Modo: link x texto */}
        <div className="grid grid-cols-2 gap-3">
          <ModeCard
            active={mode === "link"}
            onClick={() => setMode("link")}
            disabled={busy}
            icon={Link2}
            title="Tenho um link"
            hint="Notícia, vídeo, post"
          />
          <ModeCard
            active={mode === "text"}
            onClick={() => setMode("text")}
            disabled={busy}
            icon={ClipboardPaste}
            title="Vou colar o texto"
            hint="Direto, sem link"
          />
        </div>

        {/* Tipo de conteúdo */}
        <div>
          <div className="ddg-bracket text-ddg-muted mb-2">Tipo de post</div>
          <div className="grid grid-cols-2 gap-3">
            <ModeCard
              active={type === "long_form"}
              onClick={() => setType("long_form")}
              disabled={busy}
              icon={FileText}
              title="Artigo"
              hint="1500-3500 palavras"
            />
            <ModeCard
              active={type === "faq_page"}
              onClick={() => setType("faq_page")}
              disabled={busy}
              icon={HelpCircle}
              title="FAQ"
              hint="Resposta pra IAs"
            />
          </div>
        </div>

        {/* Entrada: link OU texto */}
        {mode === "link" ? (
          <div>
            <label htmlFor="src-url" className="ddg-bracket text-ddg-muted block mb-2">
              Link da fonte
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="src-url"
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setPreview(null);
                }}
                placeholder="https://… (notícia, youtube.com/watch, post)"
                disabled={busy}
                className="flex-1 h-11 px-3 rounded-lg border-2 border-ddg-ink bg-ddg-paper text-ddg-ink placeholder:text-ddg-muted/60 focus:bg-ddg-cream focus:outline-none disabled:opacity-50 transition-colors text-sm"
              />
              <button
                type="button"
                onClick={handlePreview}
                disabled={busy || !url.trim()}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-4 h-11 rounded-lg border-2 border-ddg-ink text-ddg-ink font-bold text-sm hover:bg-ddg-ink hover:text-ddg-paper transition-colors disabled:opacity-40"
              >
                {previewing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Pré-visualizar
              </button>
            </div>
            <p className="text-xs text-ddg-muted mt-1.5">
              Funciona com artigos, notícias e posts. Em vídeos do YouTube
              pegamos título e descrição — pra usar a fala do vídeo, abra
              &ldquo;Mostrar transcrição&rdquo; no YouTube e cole no modo
              &ldquo;texto&rdquo;.
            </p>

            {/* Prévia da extração */}
            {preview && (
              <div className="mt-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="text-xs font-mono uppercase tracking-widest text-emerald-800 flex items-center gap-1.5">
                    {preview.type === "youtube" ? (
                      <Video className="w-3.5 h-3.5" />
                    ) : (
                      <Newspaper className="w-3.5 h-3.5" />
                    )}
                    Conteúdo lido · {preview.chars.toLocaleString("pt-BR")} caracteres
                  </span>
                </div>
                <div className="font-bold text-sm text-emerald-950 mb-1">
                  {preview.title}
                </div>
                <p className="text-xs text-emerald-900/80 line-clamp-4">
                  {preview.preview}…
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label htmlFor="src-text" className="ddg-bracket text-ddg-muted block mb-2">
              Cole o conteúdo
            </label>
            <textarea
              id="src-text"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Cole aqui a notícia, transcrição, post ou suas anotações…"
              disabled={busy}
              rows={7}
              className="w-full px-3 py-2.5 rounded-lg border-2 border-ddg-ink bg-ddg-paper text-ddg-ink placeholder:text-ddg-muted/60 focus:bg-ddg-cream focus:outline-none disabled:opacity-50 transition-colors text-sm resize-y"
            />
            <p className="text-xs text-ddg-muted mt-1.5">
              {rawText.trim().length > 0
                ? `${rawText.trim().length.toLocaleString("pt-BR")} caracteres`
                : "Quanto mais conteúdo, melhor a adaptação."}
            </p>
          </div>
        )}

        {/* Ângulo + keyword (opcionais) */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="angle" className="ddg-bracket text-ddg-muted block mb-2">
              Ângulo / foco <span className="normal-case font-normal">(opcional)</span>
            </label>
            <input
              id="angle"
              type="text"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              placeholder="Ex: focar no benefício pro tutor"
              disabled={busy}
              className="w-full h-11 px-3 rounded-lg border-2 border-ddg-ink bg-ddg-paper text-ddg-ink placeholder:text-ddg-muted/60 focus:bg-ddg-cream focus:outline-none disabled:opacity-50 transition-colors text-sm"
            />
          </div>
          <div>
            <label htmlFor="src-kw" className="ddg-bracket text-ddg-muted block mb-2">
              Palavra-chave <span className="normal-case font-normal">(opcional)</span>
            </label>
            <input
              id="src-kw"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Ex: ração hipoalergênica"
              disabled={busy}
              className="w-full h-11 px-3 rounded-lg border-2 border-ddg-ink bg-ddg-paper text-ddg-ink placeholder:text-ddg-muted/60 focus:bg-ddg-cream focus:outline-none disabled:opacity-50 transition-colors text-sm"
            />
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between gap-2 pt-4 border-t border-ddg-stone">
          <p className="text-xs text-ddg-muted max-w-[55%]">
            A engine reescreve 100% original. Nada de cópia — só os fatos e
            ideias viram um post seu.
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-wait disabled:hover:shadow-[3px_3px_0_var(--ddg-ink)] disabled:hover:translate-y-0"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adaptando…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Gerar post
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  disabled,
  icon: Icon,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-left p-4 rounded-xl border-2 transition-all disabled:opacity-50 ${
        active
          ? "border-ddg-ink bg-ddg-lime/15 shadow-[3px_3px_0_var(--ddg-ink)]"
          : "border-ddg-stone bg-ddg-paper hover:border-ddg-ink/40 hover:bg-ddg-cream"
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md border-2 border-ddg-ink ${
            active ? "bg-ddg-lime" : "bg-ddg-stone"
          }`}
        >
          <Icon
            className={`w-3.5 h-3.5 ${active ? "text-ddg-ink" : "text-ddg-muted"}`}
            strokeWidth={2.5}
          />
        </div>
        <div className="font-bold text-sm text-ddg-ink">{title}</div>
      </div>
      <div className="text-xs text-ddg-muted">{hint}</div>
    </button>
  );
}
