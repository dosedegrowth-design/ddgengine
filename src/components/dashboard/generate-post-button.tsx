"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generatePostAction } from "@/app/(app)/posts/actions";

export function GeneratePostButton({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"long_form" | "faq_page">("long_form");
  const [topic, setTopic] = useState("");
  const [keyword, setKeyword] = useState("");
  const [question, setQuestion] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (type === "long_form" && !topic.trim() && !keyword.trim()) {
      toast.error("Informe um tópico ou keyword");
      return;
    }
    if (type === "faq_page" && !question.trim()) {
      toast.error("Informe a pergunta");
      return;
    }

    startTransition(async () => {
      toast.info("Gerando post... pode levar 1-2 minutos");
      const result = await generatePostAction({
        type,
        topic: topic.trim() || undefined,
        targetKeyword: keyword.trim() || undefined,
        targetQuestion: question.trim() || undefined,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else if ("success" in result && result.success && result.post) {
        toast.success(`Post gerado: ${result.post.title}`);
        setOpen(false);
        setTopic("");
        setKeyword("");
        setQuestion("");
        router.push(`/posts/${result.post.postId}`);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Sparkles className="w-4 h-4" />
        Gerar post
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-background rounded-lg border shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <div className="font-semibold">Gerar novo post</div>
            <div className="text-xs text-muted-foreground">
              A IA usa o briefing pra escrever na sua voz
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-accent"
            disabled={isPending}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("long_form")}
                className={
                  type === "long_form"
                    ? "border-2 border-primary bg-primary/5 rounded-md p-3 text-left"
                    : "border rounded-md p-3 text-left hover:bg-accent/40"
                }
                disabled={isPending}
              >
                <div className="font-medium text-sm">Artigo longo</div>
                <div className="text-xs text-muted-foreground mt-0.5">1500-3500 palavras</div>
              </button>
              <button
                type="button"
                onClick={() => setType("faq_page")}
                className={
                  type === "faq_page"
                    ? "border-2 border-primary bg-primary/5 rounded-md p-3 text-left"
                    : "border rounded-md p-3 text-left hover:bg-accent/40"
                }
                disabled={isPending}
              >
                <div className="font-medium text-sm">FAQ Page</div>
                <div className="text-xs text-muted-foreground mt-0.5">400-800 palavras</div>
              </button>
            </div>
          </div>

          {type === "long_form" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="topic">Tópico (opcional)</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ex: tratamento de dermatite em cães"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kw">Palavra-chave alvo (opcional)</Label>
                <Input
                  id="kw"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Ex: dermatologista veterinário SP"
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Se vazio, IA escolhe baseado no briefing.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="q">Pergunta a responder</Label>
              <Input
                id="q"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ex: Cachorro pode tomar dipirona?"
                disabled={isPending}
                required
              />
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Gerar</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
