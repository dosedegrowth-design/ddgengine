/**
 * /settings/categories — CRUD das categorias do blog do cliente.
 *
 * Cliente já confirmou no onboarding. Aqui ele pode:
 * - Adicionar nova
 * - Renomear (slug não muda — preserva URLs)
 * - Apagar (posts vinculados ficam category_id=null)
 */
import { getCurrentSite } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CategoriesManager } from "./categories-manager";

export default async function CategoriesPage() {
  const { site, supabase } = await getCurrentSite();
  if (!site) redirect("/onboarding");

  const { data: categories } = await supabase
    .from("blog_categories")
    .select("id, name, slug, description, display_order, source")
    .eq("site_id", site.id)
    .order("display_order", { ascending: true });

  // Counts: quantos posts em cada categoria
  const { data: posts } = await supabase
    .from("posts")
    .select("category_id")
    .eq("site_id", site.id)
    .not("category_id", "is", null);

  const counts = new Map<string, number>();
  for (const p of posts ?? []) {
    if (p.category_id) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);
  }

  const list = (categories ?? []).map((c) => ({
    ...c,
    postCount: counts.get(c.id) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="ddg-bracket mb-1">CONFIGURAÇÕES</div>
        <h2 className="ddg-display text-2xl text-ddg-ink">Categorias do blog</h2>
        <p className="text-sm text-ddg-muted mt-1 max-w-xl leading-relaxed">
          As categorias organizam seu blog em seções navegáveis. A IA classifica
          cada post novo automaticamente em uma delas. URLs públicas:{" "}
          <code className="text-xs">/blog/{site.tenant_slug ?? "seu-site"}/categoria/&lt;slug&gt;</code>
        </p>
      </div>

      <CategoriesManager initial={list} />
    </div>
  );
}
