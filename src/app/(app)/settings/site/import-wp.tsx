"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importWordPress } from "./actions";

export function ImportWordPressForm({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [limit, setLimit] = useState(50);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<any>(null);

  function run() {
    if (!url.startsWith("http")) return toast.error("URL inválida");
    start(async () => {
      toast.info(`Importando até ${limit} posts... pode levar alguns minutos`);
      const r = await importWordPress({ siteId, sourceUrl: url, limit });
      if ("error" in r && r.error) toast.error(r.error);
      else if ("result" in r && r.result) {
        setResult(r.result);
        toast.success(`${r.result.imported} posts importados`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="wp-url">URL do WordPress (origem)</Label>
        <Input
          id="wp-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://meublogantigo.com.br"
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          Suporta WP REST API (`/wp-json/wp/v2/posts`).
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="wp-limit">Limite de posts</Label>
        <Input
          id="wp-limit"
          type="number"
          min={1}
          max={100}
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value, 10))}
          disabled={pending}
        />
      </div>
      <Button onClick={run} disabled={pending}>
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Importar posts
      </Button>

      {result && (
        <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
          <div><strong>Total encontrado:</strong> {result.total}</div>
          <div><strong>Importados:</strong> {result.imported}</div>
          <div><strong>Pulados (já existem):</strong> {result.skipped}</div>
          <div><strong>Falharam:</strong> {result.failed}</div>
          {result.errors.length > 0 && (
            <details className="text-xs mt-2">
              <summary className="cursor-pointer">Ver erros</summary>
              <ul className="mt-2 pl-4">
                {result.errors.slice(0, 10).map((e: string, i: number) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
