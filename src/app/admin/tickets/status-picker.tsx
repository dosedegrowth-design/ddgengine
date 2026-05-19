"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { updateTicketStatus } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  waiting_client: "Aguardando cliente",
  resolved: "Resolvido",
  cancelled: "Cancelado",
};

interface Props {
  ticketId: string;
  currentStatus: string;
}

export function StatusPicker({ ticketId, currentStatus }: Props) {
  const [pending, start] = useTransition();
  const [value, setValue] = useState(currentStatus);

  function onChange(next: string) {
    if (next === value) return;
    const previous = value;
    setValue(next);
    start(async () => {
      const r = await updateTicketStatus(ticketId, next);
      if ("error" in r && r.error) {
        toast.error(r.error);
        setValue(previous);
        return;
      }
      toast.success(`Status: ${STATUS_LABEL[next] ?? next}`);
    });
  }

  return (
    <div className="rounded-xl border-2 border-ddg-stone bg-ddg-cream/40 p-3">
      <div className="ddg-bracket text-[10px] mb-1 flex items-center justify-between">
        STATUS
        {pending && <Loader2 className="w-3 h-3 animate-spin" />}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={pending}
        className="w-full text-sm font-bold bg-ddg-paper border-2 border-ddg-ink rounded-lg px-2 py-1.5 outline-none focus:bg-ddg-lime/30 transition-colors disabled:opacity-50"
      >
        {Object.entries(STATUS_LABEL).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
