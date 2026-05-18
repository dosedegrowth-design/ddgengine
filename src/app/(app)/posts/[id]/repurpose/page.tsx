import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentSite } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RepurposePanel } from "./repurpose-panel";

export default async function RepurposePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { site, supabase } = await getCurrentSite();
  if (!site) redirect("/onboarding");

  const { data: post } = await supabase
    .from("posts")
    .select("id, title, type, status")
    .eq("id", id)
    .eq("site_id", site.id)
    .maybeSingle();
  if (!post) notFound();

  return (
    <div className="container mx-auto max-w-4xl px-6 py-10 space-y-6">
      <header>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
          <Link href={`/posts/${id}`}>
            <ArrowLeft className="w-4 h-4" /> Voltar pro post
          </Link>
        </Button>
        <h1 className="ddg-display text-2xl md:text-3xl text-ddg-ink">Reaproveitar</h1>
        <p className="text-sm text-ddg-muted mt-1">
          Transforme este post em outros formatos: newsletter, LinkedIn, X, Instagram, PDF, traduções.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{post.title}</CardTitle>
          <CardDescription>
            {post.type === "long_form" ? "Artigo longo" : "FAQ"} · {post.status}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RepurposePanel postId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
