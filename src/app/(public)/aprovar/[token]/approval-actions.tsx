"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveByToken, rejectByToken } from "./actions";

export function ApprovalActions({ postId, token }: { postId: string; token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);

  if (done === "approved") {
    return (
      <div className="rounded-lg border bg-emerald-500/10 border-emerald-500/30 p-6 text-center">
        <Check className="w-8 h-8 mx-auto text-emerald-600 dark:text-emerald-400 mb-2" />
        <div className="font-medium">Post aprovado e publicado!</div>
        <p className="text-sm text-muted-foreground mt-1">Pode fechar essa página.</p>
      </div>
    );
  }

  if (done === "rejected") {
    return (
      <div className="rounded-lg border bg-muted/40 p-6 text-center">
        <X className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <div className="font-medium">Post descartado</div>
        <p className="text-sm text-muted-foreground mt-1">A IA vai gerar outro próxima vez.</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-3">
      <Button
        size="lg"
        onClick={() =>
          start(async () => {
            const r = await approveByToken(token);
            if ("error" in r && r.error) toast.error(r.error);
            else {
              setDone("approved");
              router.refresh();
            }
          })
        }
        disabled={pending}
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Aprovar e publicar
      </Button>
      <Button
        size="lg"
        variant="outline"
        onClick={() =>
          start(async () => {
            const r = await rejectByToken(token);
            if ("error" in r && r.error) toast.error(r.error);
            else setDone("rejected");
          })
        }
        disabled={pending}
      >
        <X className="w-4 h-4" />
        Descartar
      </Button>
    </div>
  );
}
