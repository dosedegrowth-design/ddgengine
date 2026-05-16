"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Download, Globe, Image as ImageIcon, Share2, Loader2, Mail, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { repurposeAction } from "./actions";

type Format = "newsletter" | "linkedin" | "twitter" | "instagram" | "lead_magnet" | "en" | "es";

const FORMATS: { id: Format; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { id: "newsletter", label: "Newsletter", icon: Mail, description: "Email pra sua lista" },
  { id: "linkedin", label: "LinkedIn", icon: Share2, description: "Post de 1300-1500 chars" },
  { id: "twitter", label: "Twitter / X", icon: Send, description: "Thread de 5-8 tweets" },
  { id: "instagram", label: "Instagram", icon: ImageIcon, description: "Carrossel 7-10 slides" },
  { id: "lead_magnet", label: "Lead Magnet (PDF)", icon: Download, description: "Guia gratuito expandido" },
  { id: "en", label: "Inglês", icon: Globe, description: "Tradução pra English" },
  { id: "es", label: "Espanhol", icon: Globe, description: "Tradução pra Español" },
];

export function RepurposePanel({ postId }: { postId: string }) {
  const [pending, start] = useTransition();
  const [results, setResults] = useState<Record<Format, any>>({} as any);

  function run(format: Format) {
    start(async () => {
      toast.info("Gerando... pode levar 30s-2min");
      const r = await repurposeAction({ postId, format });
      if ("error" in r && r.error) toast.error(r.error);
      else {
        setResults((prev) => ({ ...prev, [format]: r }));
        toast.success(`${format} gerado`);
      }
    });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copiado");
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        {FORMATS.map(({ id, label, icon: Icon, description }) => (
          <Card key={id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <Icon className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs text-muted-foreground">{description}</div>
                </div>
              </div>
              <Button
                size="sm"
                variant={results[id] ? "outline" : "default"}
                onClick={() => run(id)}
                disabled={pending}
              >
                {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : results[id] ? "Refazer" : "Gerar"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resultados */}
      <div className="space-y-4">
        {results.newsletter && (
          <ResultBlock title="Newsletter" badge="Email pronto">
            <div className="space-y-2">
              <div>
                <div className="text-xs text-muted-foreground">Subject</div>
                <div className="font-medium text-sm">{results.newsletter.subject}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Pré-header</div>
                <div className="text-sm">{results.newsletter.preview_text}</div>
              </div>
              <CopyableTextarea value={results.newsletter.html} placeholder="HTML do email" />
            </div>
          </ResultBlock>
        )}

        {results.linkedin && (
          <ResultBlock title="LinkedIn" badge={`${results.linkedin.post.length} caracteres`}>
            <CopyableTextarea value={results.linkedin.post + "\n\n" + results.linkedin.hashtags.join(" ")} />
          </ResultBlock>
        )}

        {results.twitter && (
          <ResultBlock title="Twitter / X" badge={`${results.twitter.tweets.length} tweets`}>
            <div className="space-y-2">
              {results.twitter.tweets.map((t: string, i: number) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-md border">
                  <span className="text-xs text-muted-foreground font-mono">{i + 1}/</span>
                  <div className="flex-1 text-sm">{t}</div>
                  <button onClick={() => copyToClipboard(t)} className="p-1 hover:bg-accent rounded">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </ResultBlock>
        )}

        {results.instagram && (
          <ResultBlock title="Instagram Carousel" badge={`${results.instagram.slides.length} slides`}>
            <div className="space-y-2">
              {results.instagram.slides.map((s: any, i: number) => (
                <div key={i} className="p-3 rounded-md border">
                  <div className="text-xs text-muted-foreground">Slide {i + 1}</div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-sm text-muted-foreground">{s.text}</div>
                </div>
              ))}
              <div className="pt-2">
                <div className="text-xs text-muted-foreground mb-1">Caption</div>
                <CopyableTextarea value={results.instagram.caption} />
              </div>
            </div>
          </ResultBlock>
        )}

        {results.lead_magnet && (
          <ResultBlock title="Lead Magnet (PDF)" badge={`${results.lead_magnet.chapters.length} capítulos`}>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">Título</div>
                <div className="font-medium">{results.lead_magnet.title}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Subtítulo</div>
                <div className="text-sm">{results.lead_magnet.subtitle}</div>
              </div>
              <a
                href={`data:text/html;charset=utf-8,${encodeURIComponent(results.lead_magnet.html)}`}
                target="_blank"
                rel="noopener"
              >
                <Button size="sm" variant="outline">
                  <Download className="w-4 h-4" /> Abrir HTML (imprimir PDF)
                </Button>
              </a>
            </div>
          </ResultBlock>
        )}

        {results.en && (
          <ResultBlock title="Tradução EN" badge="English">
            <div className="space-y-2">
              <div className="font-medium">{results.en.title}</div>
              <div className="text-sm text-muted-foreground">{results.en.meta_description}</div>
              <CopyableTextarea value={results.en.content_markdown} />
            </div>
          </ResultBlock>
        )}

        {results.es && (
          <ResultBlock title="Tradução ES" badge="Español">
            <div className="space-y-2">
              <div className="font-medium">{results.es.title}</div>
              <div className="text-sm text-muted-foreground">{results.es.meta_description}</div>
              <CopyableTextarea value={results.es.content_markdown} />
            </div>
          </ResultBlock>
        )}
      </div>
    </div>
  );
}

function ResultBlock({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{title}</h3>
          {badge && <Badge variant="outline" className="text-xs">{badge}</Badge>}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function CopyableTextarea({ value, placeholder }: { value: string; placeholder?: string }) {
  function copy() {
    navigator.clipboard.writeText(value);
    toast.success("Copiado");
  }
  return (
    <div className="relative">
      <textarea
        value={value}
        readOnly
        className="w-full min-h-[120px] max-h-[400px] rounded-md border bg-muted/30 px-3 py-2 text-xs font-mono"
        placeholder={placeholder}
      />
      <Button
        size="sm"
        variant="outline"
        className="absolute top-2 right-2"
        onClick={copy}
      >
        <Copy className="w-3 h-3" /> Copiar
      </Button>
    </div>
  );
}
