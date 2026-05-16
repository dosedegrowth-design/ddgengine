"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReferralLinkBox({ link, code }: { link: string; code: string }) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copiado");
    setTimeout(() => setCopied(false), 2000);
  }

  function copyCode() {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado");
  }

  function share() {
    if (navigator.share) {
      navigator.share({
        title: "DDG Engine — Blog automático com IA",
        text: `Use meu link e ganhe 1 mês grátis: ${link}`,
        url: link,
      });
    } else {
      copyLink();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={link} readOnly className="font-mono text-sm" />
        <Button onClick={copyLink} variant={copied ? "default" : "outline"}>
          <Copy className="w-4 h-4" /> {copied ? "Copiado" : "Copiar"}
        </Button>
        <Button onClick={share}>
          <Share2 className="w-4 h-4" /> Compartilhar
        </Button>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Código:</span>
        <button
          onClick={copyCode}
          className="font-mono font-semibold tracking-wider hover:bg-accent px-2 py-0.5 rounded"
        >
          {code}
        </button>
      </div>
    </div>
  );
}
