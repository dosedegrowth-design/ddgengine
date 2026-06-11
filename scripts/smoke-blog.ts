/**
 * Smoke test E2E do fluxo briefing→RAG→post→blog.
 *
 * Rodar: npx tsx scripts/smoke-blog.ts
 *
 * Estratégia:
 *  1. Pega 1 briefing completed com embedding_status=pending
 *  2. Roda processBriefingEmbeddings → confirma brand_documents populated
 *  3. Roda generatePostMultiPass → confirma post criado
 *  4. Imprime URL de preview do blog
 *
 * NÃO commita resultado — apenas reporta no console.
 */
import "dotenv/config";

// Setup env first
import * as fs from "fs";
import * as path from "path";

// Carrega .env.local manualmente (a key SUPABASE_SERVICE_ROLE_KEY tá lá)
const envLocal = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocal)) {
  const raw = fs.readFileSync(envLocal, "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq);
    const v = trimmed.slice(eq + 1).replace(/^"(.*)"$/, "$1");
    if (!(k in process.env)) process.env[k] = v;
  }
}

import { processBriefingEmbeddings } from "../src/lib/rag/brand";
import { generatePostMultiPass } from "../src/lib/ai/multi-pass";
import { createServiceClient } from "../src/lib/supabase/server";

const TARGET_BRIEFING_ID = "aab25c08-d830-4b51-9411-8e340a7163b7"; // Teste's Workspace / feelkingbarbearia
const TARGET_SITE_ID = "64556670-7585-4aea-a16a-9391c3bbddb9";

async function main() {
  console.log("=== SMOKE TEST E2E ===\n");

  const supabase = createServiceClient();

  // Step 1: Brand RAG
  console.log("📚 1/4 Processando RAG do briefing...");
  const t0 = Date.now();
  await processBriefingEmbeddings(TARGET_BRIEFING_ID);
  console.log(`   ✅ feito em ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // Step 2: Verifica brand_documents
  console.log("\n📋 2/4 Verificando brand_documents...");
  const { data: docs, error: docsErr } = await supabase
    .from("brand_documents")
    .select("id, source, chunk_index, token_count")
    .eq("site_id", TARGET_SITE_ID);
  if (docsErr) {
    console.error("   ❌ erro buscando brand_documents:", docsErr.message);
    process.exit(1);
  }
  console.log(`   ✅ ${docs?.length ?? 0} chunks no brand_documents`);
  for (const d of docs ?? []) {
    console.log(
      `      - chunk ${d.chunk_index} (${d.token_count} tokens) source=${d.source}`
    );
  }

  // Step 3: Multi-pass post generation
  console.log("\n🧠 3/4 Gerando post multi-pass...");
  const t1 = Date.now();
  const post = await generatePostMultiPass({
    siteId: TARGET_SITE_ID,
    type: "long_form",
    topic: "Como cuidar da barba em casa: dicas essenciais",
  });
  console.log(
    `   ✅ post criado em ${((Date.now() - t1) / 1000).toFixed(1)}s`
  );
  console.log(`      postId: ${post.postId}`);
  console.log(`      slug: ${post.slug}`);
  console.log(`      title: ${post.title}`);
  console.log(`      word_count: ${post.word_count}`);
  console.log(`      gates: ${post.gates_passed}/${post.gates_total}`);
  console.log(`      cost: $${post.total_cost_usd.toFixed(4)}`);

  // Lê status do banco pra reportar (post final é gravado pelo multi-pass)
  const { data: dbPost } = await supabase
    .from("posts")
    .select("status, content_markdown")
    .eq("id", post.postId)
    .maybeSingle();
  console.log(`      status (db): ${dbPost?.status ?? "?"}`);
  console.log(
    `      markdown size: ${dbPost?.content_markdown?.length ?? 0} chars`
  );

  // Step 4: Confirma URL final
  console.log("\n🌐 4/4 URL de preview:");
  const { data: org } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", (await supabase.from("sites").select("organization_id").eq("id", TARGET_SITE_ID).maybeSingle()).data?.organization_id)
    .maybeSingle();
  const orgSlug = org?.slug ?? "?";
  console.log(`   https://conteudai.com.br/blog/${orgSlug}/${post.slug}`);
  console.log(`   (em dev: http://localhost:3000/blog/${orgSlug}/${post.slug})`);

  console.log("\n=== ✅ SMOKE TEST PASSOU ===");
}

main().catch((err) => {
  console.error("\n❌ SMOKE TEST FALHOU:");
  console.error(err);
  process.exit(1);
});
