"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runVisibilityAction } from "@/app/(app)/visibility/actions";

export function RunVisibilityButton({ siteId: _siteId }: { siteId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      onClick={() =>
        start(async () => {
          toast.info("Iniciando AI Visibility Tracking... pode levar 5-10 min");
          const r = await runVisibilityAction();
          if ("error" in r && r.error) toast.error(r.error);
          else if ("success" in r && r.success) {
            toast.success(`${r.result?.totalCitations} citações encontradas`);
          }
        })
      }
      disabled={pending}
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
      Rodar tracking
    </Button>
  );
}
