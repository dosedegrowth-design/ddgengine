"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { addClientComment } from "./actions";

interface Props {
  ticketId: string;
}

const MAX = 2000;

export function CommentForm({ ticketId }: Props) {
  const [pending, start] = useTransition();
  const [text, setText] = useState("");

  function submit() {
    const value = text.trim();
    if (!value) return;
    start(async () => {
      const r = await addClientComment(ticketId, value);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Comentário enviado!");
      setText("");
    });
  }

  const remaining = MAX - text.length;
  const overLimit = remaining < 0;

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        rows={4}
        placeholder="Tem alguma info pra adicionar, dúvida ou pergunta? Escreve aqui. O time DDG é notificado por email. ⌘/Ctrl+Enter pra enviar."
        disabled={pending}
        className={`w-full text-sm bg-ddg-paper border-2 ${
          overLimit ? "border-red-400" : "border-ddg-stone focus:border-ddg-ink"
        } rounded-lg px-3 py-2.5 outline-none resize-none placeholder:text-ddg-muted/70 disabled:opacity-50 transition-colors`}
      />
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[10px] font-mono uppercase tracking-widest ${
            overLimit ? "text-red-600 font-bold" : "text-ddg-muted"
          }`}
        >
          {text.length > 0 && `${remaining} caracteres restantes`}
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !text.trim() || overLimit}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[4px_4px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-[2px_2px_0_var(--ddg-stone)]"
        >
          {pending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          Enviar comentário
        </button>
      </div>
    </div>
  );
}
