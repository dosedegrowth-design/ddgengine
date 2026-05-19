"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, UserCheck, UserMinus } from "lucide-react";
import { assignTicket } from "./actions";

interface Props {
  ticketId: string;
  currentAssignee: string | null;
  currentUserEmail: string;
}

export function AssigneePicker({
  ticketId,
  currentAssignee,
  currentUserEmail,
}: Props) {
  const [pending, start] = useTransition();
  const [value, setValue] = useState<string | null>(currentAssignee);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentAssignee ?? "");

  function submit(email: string) {
    const previous = value;
    const next = email.trim() || null;
    if (next === previous) {
      setEditing(false);
      return;
    }
    setValue(next);
    start(async () => {
      const r = await assignTicket(ticketId, email);
      if ("error" in r && r.error) {
        toast.error(r.error);
        setValue(previous);
        return;
      }
      toast.success(next ? `Atribuído a ${next}` : "Atribuição removida");
      setEditing(false);
    });
  }

  const isMine = value && value.toLowerCase() === currentUserEmail.toLowerCase();

  return (
    <div className="rounded-xl border-2 border-ddg-stone bg-ddg-cream/40 p-3">
      <div className="ddg-bracket text-[10px] mb-1 flex items-center justify-between">
        ATRIBUÍDO
        {pending && <Loader2 className="w-3 h-3 animate-spin" />}
      </div>

      {!editing ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-ddg-ink truncate">
            {value ? (
              <>
                {value.split("@")[0]}
                {isMine && (
                  <span className="ml-1 text-[10px] font-mono text-ddg-lime-deep">
                    (você)
                  </span>
                )}
              </>
            ) : (
              <span className="text-ddg-muted italic">Ninguém</span>
            )}
          </span>
          <div className="flex items-center gap-1">
            {!isMine && (
              <button
                type="button"
                onClick={() => submit(currentUserEmail)}
                disabled={pending}
                title="Pegar pra mim"
                className="p-1.5 rounded hover:bg-ddg-lime/30 text-ddg-ink disabled:opacity-50"
              >
                <UserCheck className="w-3.5 h-3.5" />
              </button>
            )}
            {value && (
              <button
                type="button"
                onClick={() => submit("")}
                disabled={pending}
                title="Tirar atribuição"
                className="p-1.5 rounded hover:bg-red-50 text-ddg-muted hover:text-red-700 disabled:opacity-50"
              >
                <UserMinus className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setDraft(value ?? "");
                setEditing(true);
              }}
              disabled={pending}
              className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted hover:text-ddg-ink px-1 disabled:opacity-50"
            >
              Editar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="email"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="email@dosedegrowth.com"
            className="flex-1 text-xs bg-ddg-paper border-2 border-ddg-ink rounded px-2 py-1 outline-none focus:bg-ddg-lime/10"
            autoFocus
          />
          <button
            type="button"
            onClick={() => submit(draft)}
            disabled={pending}
            className="text-[10px] font-mono uppercase tracking-widest bg-ddg-ink text-ddg-paper px-2 py-1 rounded disabled:opacity-50"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted px-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
