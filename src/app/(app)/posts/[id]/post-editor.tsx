"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Edit2, Eye, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { renderMarkdown } from "@/lib/markdown";
import { savePostEdits, approvePostAction, rejectPostAction } from "../actions";

interface Props {
  postId: string;
  initialContent: string;
  initialTitle: string;
  initialMeta: string;
  status: string;
}

export function PostEditor({ postId, initialContent, initialTitle, initialMeta, status }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [title, setTitle] = useState(initialTitle);
  const [meta, setMeta] = useState(initialMeta);
  const [content, setContent] = useState(initialContent);
  const [pending, start] = useTransition();
  const isInReview = status === "in_review";
  const canEdit = ["draft", "in_review", "approved", "scheduled"].includes(status);

  function save() {
    start(async () => {
      const r = await savePostEdits(postId, { title, meta_description: meta, content_markdown: content });
      if ("error" in r && r.error) toast.error(r.error);
      else {
        toast.success("Alterações salvas");
        setMode("preview");
        router.refresh();
      }
    });
  }

  function approve() {
    start(async () => {
      const r = await approvePostAction(postId);
      if ("error" in r && r.error) toast.error(r.error);
      else {
        toast.success("Post publicado");
        router.refresh();
      }
    });
  }

  function reject() {
    if (!confirm("Tem certeza? O post será arquivado.")) return;
    start(async () => {
      const r = await rejectPostAction(postId);
      if ("error" in r && r.error) toast.error(r.error);
      else {
        toast.success("Post descartado");
        router.push("/inbox");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base flex items-center gap-2">
          {mode === "preview" ? <Eye className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          {mode === "preview" ? "Preview" : "Edição"}
          {mode === "edit" && <Badge variant="warning" className="ml-1">Não salvo</Badge>}
        </CardTitle>
        <div className="flex gap-2">
          {canEdit && (
            <Button
              variant={mode === "edit" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
              disabled={pending}
            >
              {mode === "edit" ? "Preview" : "Editar"}
            </Button>
          )}
          {mode === "edit" && (
            <Button size="sm" onClick={save} disabled={pending}>
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {mode === "edit" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={pending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta">Meta description</Label>
              <Input
                id="meta"
                value={meta}
                onChange={(e) => setMeta(e.target.value)}
                disabled={pending}
                maxLength={170}
              />
              <p className="text-xs text-muted-foreground">{meta.length}/165 caracteres</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo (Markdown)</Label>
              <textarea
                id="content"
                className="w-full min-h-[500px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={pending}
              />
              <p className="text-xs text-muted-foreground">
                {content.split(/\s+/).filter(Boolean).length} palavras · {content.length} caracteres
              </p>
            </div>
          </div>
        ) : (
          <article
            className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        )}

        {/* Approval actions (só em in_review) */}
        {isInReview && mode === "preview" && (
          <div className="mt-6 pt-6 border-t flex gap-2">
            <Button onClick={approve} disabled={pending} size="lg">
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Aprovar e publicar
            </Button>
            <Button onClick={reject} disabled={pending} variant="outline" size="lg">
              <X className="w-4 h-4" />
              Descartar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
