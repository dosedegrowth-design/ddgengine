"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Check, X, Tag } from "lucide-react";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from "./actions";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  source: string;
  postCount: number;
}

export function CategoriesManager({ initial }: { initial: Category[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    start(async () => {
      const r = await createCategoryAction({ name });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Categoria criada!");
      setNewName("");
      router.refresh();
    });
  }

  function startEdit(c: Category) {
    setEditingId(c.id);
    setEditName(c.name);
  }

  function saveEdit(id: string) {
    const name = editName.trim();
    if (!name) {
      toast.error("Nome obrigatório");
      return;
    }
    start(async () => {
      const r = await updateCategoryAction(id, { name });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Atualizada!");
      setEditingId(null);
      router.refresh();
    });
  }

  function handleDelete(c: Category) {
    const msg = c.postCount
      ? `Apagar "${c.name}"? ${c.postCount} post${c.postCount > 1 ? "s ficam" : " fica"} sem categoria.`
      : `Apagar "${c.name}"?`;
    if (!confirm(msg)) return;
    start(async () => {
      const r = await deleteCategoryAction(c.id);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Categoria apagada");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Add new */}
      <div className="rounded-2xl border-2 border-dashed border-ddg-stone bg-ddg-cream/30 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Nome da nova categoria"
            maxLength={50}
            className="flex-1 h-10 px-3 rounded-lg border-2 border-ddg-ink bg-ddg-paper text-ddg-ink placeholder:text-ddg-muted/60 focus:bg-ddg-cream focus:outline-none text-sm"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={pending || !newName.trim()}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Adicionar
          </button>
        </div>
      </div>

      {/* Lista */}
      {initial.length === 0 ? (
        <div className="text-center py-8 text-sm text-ddg-muted">
          Sem categorias ainda. Adicione a primeira aí em cima.
        </div>
      ) : (
        <ul className="space-y-2">
          {initial.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 p-3 rounded-xl border-2 border-ddg-stone bg-ddg-paper hover:border-ddg-ink/30 transition-colors"
            >
              <div className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-ddg-lime/20 border border-ddg-lime/40">
                <Tag className="w-4 h-4 text-ddg-lime-deep" strokeWidth={2.5} />
              </div>

              {editingId === c.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(c.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 h-9 px-2 rounded-md border-2 border-ddg-ink bg-ddg-paper text-ddg-ink text-sm focus:outline-none"
                    maxLength={50}
                  />
                  <button
                    type="button"
                    onClick={() => saveEdit(c.id)}
                    disabled={pending}
                    aria-label="Salvar"
                    className="p-1.5 rounded-md bg-ddg-lime border-2 border-ddg-ink hover:shadow-[2px_2px_0_var(--ddg-ink)] transition-all"
                  >
                    {pending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 text-ddg-ink" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    disabled={pending}
                    aria-label="Cancelar"
                    className="p-1.5 rounded-md border-2 border-ddg-ink hover:bg-ddg-ink hover:text-ddg-paper transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ddg-ink truncate">
                        {c.name}
                      </span>
                      <code className="text-[10px] font-mono text-ddg-muted">
                        /{c.slug}
                      </code>
                      {c.source === "ai_suggested" && (
                        <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-ddg-lime/15 text-ddg-lime-deep border border-ddg-lime/40">
                          IA
                        </span>
                      )}
                    </div>
                    {c.description && (
                      <p className="text-xs text-ddg-muted truncate mt-0.5">
                        {c.description}
                      </p>
                    )}
                    <div className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted mt-1">
                      {c.postCount} {c.postCount === 1 ? "post" : "posts"}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => startEdit(c)}
                      aria-label="Editar"
                      className="p-2 rounded-md border-2 border-transparent hover:border-ddg-ink hover:bg-ddg-cream transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5 text-ddg-muted" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      aria-label="Apagar"
                      className="p-2 rounded-md border-2 border-transparent hover:border-red-500 hover:bg-red-50 hover:text-red-600 transition-colors text-ddg-muted"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
