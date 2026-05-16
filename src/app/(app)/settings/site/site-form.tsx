"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deployWorker, redoAudit } from "./actions";

export function SiteSettingsForm({ siteId, hasWorker }: { siteId: string; hasWorker: boolean }) {
  const [pending, start] = useTransition();

  return (
    <div className="flex gap-2 pt-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          start(async () => {
            const r = await redoAudit(siteId);
            if ("error" in r && r.error) toast.error(r.error);
            else toast.success("Auditoria refeita");
          })
        }
        disabled={pending}
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refazer auditoria"}
      </Button>
      <Button
        size="sm"
        onClick={() =>
          start(async () => {
            toast.info("Deployando Worker no Cloudflare...");
            const r = await deployWorker(siteId);
            if ("error" in r && r.error) toast.error(r.error);
            else toast.success(`Worker deployado: ${r.workerName}`);
          })
        }
        disabled={pending}
      >
        {hasWorker ? "Re-deployar Worker" : "Deployar Worker"}
      </Button>
    </div>
  );
}
