"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { addInternalNote } from "./actions";

interface Props {
  ticketId: string;
}

export function NoteForm({ ticketId }: Props) {
  const [pending, start] = useTransition();
  const [text, setText] = useState("");

  function submit() {
    const value = text.trim();
    if (!value) return;
    start(async () => {
      const r = await addInternalNote(ticketId, value);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Nota adicionada");
      setText("");
    });
  }

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
        rows={3}
        placeholder="Nota interna (visível só pro time DDG). ⌘/Ctrl+Enter pra salvar."
        disabled={pending}
        className="w-full text-sm bg-ddg-paper border-2 border-ddg-stone rounded-lg px-3 py-2 outline-none focus:border-ddg-ink resize-none placeholder:text-ddg-muted/70 disabled:opacity-50"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
          {text.length > 0 && `${text.length} caracteres`}
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !text.trim()}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ddg-ink text-ddg-paper text-xs font-bold hover:bg-ddg-ink/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <MessageSquarePlus className="w-3.5 h-3.5" />
          )}
          Adicionar nota
        </button>
      </div>
    </div>
  );
}
