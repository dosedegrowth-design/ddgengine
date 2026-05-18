"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles, X, FileText, HelpCircle, ArrowRight } from "lucide-react";
import { generatePostAction } from "@/app/(app)/posts/actions";

export function GeneratePostButton({ siteId: _siteId }: { siteId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"long_form" | "faq_page">("long_form");
  const [topic, setTopic] = useState("");
  const [keyword, setKeyword] = useState("");
  const [question, setQuestion] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (type === "long_form" && !topic.trim() && !keyword.trim()) {
      toast.error("Informe um tema ou palavra-chave");
      return;
    }
    if (type === "faq_page" && !question.trim()) {
      toast.error("Informe a pergunta");
      return;
    }

    startTransition(async () => {
      toast.info("Gerando post… pode levar 1-2 minutos");
      const result = await generatePostAction({
        type,
        topic: topic.trim() || undefined,
        targetKeyword: keyword.trim() || undefined,
        targetQuestion: question.trim() || undefined,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else if ("success" in result && result.success && result.post) {
        toast.success(`Post gerado: ${result.post.title}`);
        setOpen(false);
        setTopic("");
        setKeyword("");
        setQuestion("");
        const postId = (result.post as { id?: string; postId?: string }).id ??
          (result.post as { postId?: string }).postId;
        if (postId) router.push(`/posts/${postId}`);
        else router.push("/posts");
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all"
      >
        <Sparkles className="w-4 h-4" />
        Gerar post
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ddg-ink/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) setOpen(false);
      }}
    >
      <div className="w-full max-w-xl rounded-2xl border-2 border-ddg-ink bg-ddg-paper shadow-[6px_6px_0_var(--ddg-ink)]">
        {/* Header */}
        <div className="flex items-start justify-between p-5 md:p-6 border-b-2 border-ddg-ink">
          <div>
            <div className="ddg-bracket mb-1">GERAR POST · IA</div>
            <h2 className="font-black text-xl md:text-2xl text-ddg-ink leading-tight">
              Novo post pra seu blog
            </h2>
            <p className="text-xs text-ddg-muted mt-1.5">
              A engine usa seu briefing pra escrever na sua voz.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="shrink-0 p-1.5 rounded-md border-2 border-ddg-ink hover:bg-ddg-ink hover:text-ddg-paper transition-colors disabled:opacity-40"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-5">
          {/* Tipo */}
          <div>
            <Label>Tipo de conteúdo</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <TypeCard
                active={type === "long_form"}
                onClick={() => setType("long_form")}
                disabled={isPending}
                icon={FileText}
                title="Artigo"
                hint="1500-3500 palavras · SEO"
              />
              <TypeCard
                active={type === "faq_page"}
                onClick={() => setType("faq_page")}
                disabled={isPending}
                icon={HelpCircle}
                title="FAQ"
                hint="400-800 palavras · IAs"
              />
            </div>
          </div>

          {/* Campos por tipo */}
          {type === "long_form" ? (
            <>
              <Field
                id="topic"
                label="Tema"
                hint="Sobre o que é o artigo. Opcional."
                value={topic}
                onChange={setTopic}
                placeholder="Ex: tratamento de dermatite em cães"
                disabled={isPending}
              />
              <Field
                id="kw"
                label="Palavra-chave alvo"
                hint="Se vazio, a engine escolhe baseado no briefing."
                value={keyword}
                onChange={setKeyword}
                placeholder="Ex: dermatologista veterinário SP"
                disabled={isPending}
              />
            </>
          ) : (
            <Field
              id="q"
              label="Pergunta a responder"
              hint="A IA escreve uma resposta otimizada pra aparecer no ChatGPT/Google."
              value={question}
              onChange={setQuestion}
              placeholder="Ex: Cachorro pode tomar dipirona?"
              disabled={isPending}
              required
            />
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 pt-4 border-t border-ddg-stone">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="text-xs font-mono uppercase tracking-widest text-ddg-muted hover:text-ddg-ink transition-colors disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-wait disabled:hover:shadow-[3px_3px_0_var(--ddg-ink)] disabled:hover:translate-y-0"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando…
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
        </form>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="ddg-bracket text-ddg-muted">{children}</div>
  );
}

function TypeCard({
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
      <div className="flex items-center gap-2 mb-2">
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

function Field({
  id,
  label,
  hint,
  value,
  onChange,
  placeholder,
  disabled,
  required,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="ddg-bracket text-ddg-muted block mb-2">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className="w-full h-11 px-3 rounded-lg border-2 border-ddg-ink bg-ddg-paper text-ddg-ink placeholder:text-ddg-muted/60 focus:bg-ddg-cream focus:outline-none disabled:opacity-50 transition-colors text-sm"
      />
      {hint && (
        <p className="text-xs text-ddg-muted mt-1.5">{hint}</p>
      )}
    </div>
  );
}
