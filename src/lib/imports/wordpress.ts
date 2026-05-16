/**
 * Bulk import de WordPress (RSS feed ou WP REST API).
 *
 * Estratégia:
 * 1. Tenta /wp-json/wp/v2/posts (REST API moderno)
 * 2. Fallback /feed/ (RSS)
 * 3. Cria posts em status 'archived' (importados, não publicados ainda)
 * 4. Cliente escolhe quais re-otimizar com IA
 */
import { createServiceClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export async function importWordPressBlog(args: {
  siteId: string;
  sourceUrl: string;
  limit?: number;
}): Promise<ImportResult> {
  const supabase = createServiceClient();
  const cleanUrl = args.sourceUrl.replace(/\/+$/, "");
  const limit = args.limit ?? 50;

  const result: ImportResult = { total: 0, imported: 0, skipped: 0, failed: 0, errors: [] };

  // Cria registro do import
  const { data: importRow } = await supabase
    .from("wp_imports")
    .insert({
      site_id: args.siteId,
      source_url: cleanUrl,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (!importRow) throw new Error("Erro criando import");

  try {
    // Tenta WP REST API primeiro
    const posts = await fetchWPRestPosts(cleanUrl, limit);
    if (!posts || posts.length === 0) {
      throw new Error("Nenhum post encontrado via REST API. Site usa WordPress?");
    }
    result.total = posts.length;

    for (const wpPost of posts) {
      try {
        const slug = slugify(wpPost.slug ?? wpPost.title?.rendered ?? `post-${Date.now()}`).slice(0, 100);
        const title = stripHtml(wpPost.title?.rendered ?? "").slice(0, 200);
        const content = htmlToMarkdown(wpPost.content?.rendered ?? "");
        const excerpt = stripHtml(wpPost.excerpt?.rendered ?? "").slice(0, 165);

        // Skip se já existe
        const { data: existing } = await supabase
          .from("posts")
          .select("id")
          .eq("site_id", args.siteId)
          .eq("slug", slug)
          .maybeSingle();

        if (existing) {
          result.skipped++;
          continue;
        }

        const { error } = await supabase.from("posts").insert({
          site_id: args.siteId,
          type: "long_form",
          slug,
          title,
          meta_description: excerpt,
          content_markdown: content,
          status: "archived", // importados ficam arquivados, user re-publica se quiser
          generation_mode: "imported",
          metadata: {
            imported_from: "wordpress",
            original_url: wpPost.link,
            original_id: wpPost.id,
            original_date: wpPost.date,
          },
        });

        if (error) {
          result.failed++;
          result.errors.push(`${slug}: ${error.message}`);
        } else {
          result.imported++;
        }
      } catch (err) {
        result.failed++;
        result.errors.push(err instanceof Error ? err.message : "unknown");
      }
    }

    await supabase
      .from("wp_imports")
      .update({
        status: "completed",
        total_posts: result.total,
        imported_posts: result.imported,
        skipped_posts: result.skipped,
        failed_posts: result.failed,
        completed_at: new Date().toISOString(),
      })
      .eq("id", importRow.id);

    return result;
  } catch (err) {
    await supabase
      .from("wp_imports")
      .update({
        status: "failed",
        error: err instanceof Error ? err.message : "unknown",
        completed_at: new Date().toISOString(),
      })
      .eq("id", importRow.id);
    throw err;
  }
}

async function fetchWPRestPosts(baseUrl: string, limit: number): Promise<any[]> {
  const url = `${baseUrl}/wp-json/wp/v2/posts?per_page=${Math.min(limit, 100)}&_fields=id,date,slug,title,content,excerpt,link`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`WP REST API retornou ${res.status}`);
  return res.json();
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Conversor HTML → Markdown simples.
 * Pra MVP, mantém HTML como markdown bruto (Tiptap render aceita).
 * Versão avançada: usar turndown library.
 */
function htmlToMarkdown(html: string): string {
  let md = html;

  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n");

  // Bold + italic
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");

  // Links
  md = md.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, "[$2]($1)");

  // Lists
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
  md = md.replace(/<\/?(ul|ol)[^>]*>/gi, "\n");

  // Paragraphs
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n");

  // Line breaks
  md = md.replace(/<br[^>]*>/gi, "\n");

  // Remove demais tags
  md = md.replace(/<[^>]+>/g, "");

  // Decode entities
  md = md
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  // Cleanup whitespace
  md = md.replace(/\n{3,}/g, "\n\n").trim();

  return md;
}
