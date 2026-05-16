/**
 * ReviewCard — uma seção da ficha editável inline
 * Usado na etapa 4 (Revisão).
 */
"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | string[];
  onSave: (newValue: string) => void;
  multiline?: boolean;
}

export function ReviewCard({ label, value, onSave, multiline = false }: Props) {
  const [editing, setEditing] = useState(false);
  const initial = Array.isArray(value) ? value.join("\n") : value;
  const [draft, setDraft] = useState(initial);

  const isEmpty = !initial || initial.trim() === "";

  function handleSave() {
    onSave(draft.trim());
    setEditing(false);
  }

  function handleCancel() {
    setDraft(initial);
    setEditing(false);
  }

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-4 transition-colors",
        editing
          ? "border-ddg-lime bg-ddg-lime/5"
          : "border-ddg-paper/15 bg-ddg-paper/[0.03] hover:border-ddg-paper/30"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-ddg-paper/60">
          {label}
        </span>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[10px] font-mono uppercase tracking-widest text-ddg-paper/40 hover:text-ddg-lime transition-colors inline-flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" />
            Editar
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="text-[10px] font-mono uppercase tracking-widest text-ddg-paper/40 hover:text-ddg-paper inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="text-[10px] font-mono uppercase tracking-widest text-ddg-lime hover:text-ddg-lime-bright inline-flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Salvar
            </button>
          </div>
        )}
      </div>

      {editing ? (
        multiline ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            autoFocus
            className="w-full px-3 py-2 rounded-md border-2 border-ddg-paper/15 bg-ddg-ink text-ddg-paper focus:border-ddg-lime/60 focus:outline-none transition-colors text-sm leading-relaxed resize-none"
          />
        ) : (
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            className="w-full h-10 px-3 rounded-md border-2 border-ddg-paper/15 bg-ddg-ink text-ddg-paper focus:border-ddg-lime/60 focus:outline-none transition-colors text-sm"
          />
        )
      ) : (
        <p
          className={cn(
            "text-sm leading-relaxed whitespace-pre-wrap",
            isEmpty ? "italic text-ddg-paper/30" : "text-ddg-paper/90"
          )}
        >
          {isEmpty ? "(não preenchido)" : initial}
        </p>
      )}
    </div>
  );
}
