/**
 * Página pública de aprovação via link (recebido por WhatsApp ou email).
 * Token assinado (HMAC) — não precisa de login.
 */
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyApprovalToken } from "@/lib/whatsapp/notifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { renderMarkdown } from "@/lib/markdown";
import { ApprovalActions } from "./approval-actions";

export const dynamic = "force-dynamic";

export default async function ApprovalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const postId = verifyApprovalToken(token);
  if (!postId) notFound();

  const supabase = createServiceClient();
  const { data: post } = await supabase
    .from("posts")
    .select("*, sites(domain, organizations(name))")
    .eq("id", postId)
    .maybeSingle();

  if (!post) notFound();
  if (post.status === "published") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>Post já publicado</CardTitle>
            <CardDescription>Este conteúdo já está no ar</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Você pode visualizar diretamente no blog.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const html = post.content_markdown ? renderMarkdown(post.content_markdown) : "";
  const wordCount = post.content_markdown
    ? post.content_markdown.split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <div className="font-semibold tracking-tight">Conteudai</div>
          <div className="text-xs text-muted-foreground">
            {(post as any).sites?.organizations?.name} · Aprovação rápida
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-6 py-10 space-y-6">
        <Card>
          <CardHeader>
            <CardDescription>Aprovação de novo conteúdo</CardDescription>
            <CardTitle className="text-3xl tracking-tight">{post.title}</CardTitle>
            <div className="text-sm text-muted-foreground mt-2">
              {post.type === "long_form" ? "Artigo longo" : "FAQ"} · {wordCount} palavras
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{post.meta_description}</p>
          </CardContent>
        </Card>

        <ApprovalActions postId={postId} token={token} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview do conteúdo</CardTitle>
          </CardHeader>
          <CardContent>
            <article
              className="prose prose-neutral dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </CardContent>
        </Card>

        <ApprovalActions postId={postId} token={token} />
      </main>
    </div>
  );
}
