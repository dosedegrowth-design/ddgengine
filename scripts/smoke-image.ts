/**
 * Smoke test isolado da geração de hero image.
 * Gera imagem pro post do smoke-blog anterior e faz upload no Storage.
 *
 * Rodar: npx tsx scripts/smoke-image.ts
 */
import * as fs from "fs";
import * as path from "path";

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

import { generateHeroImage, buildVisualPromptFromTitle } from "../src/lib/ai/image-gen";
import { uploadHeroImage } from "../src/lib/storage/post-images";
import { createServiceClient } from "../src/lib/supabase/server";

const POST_ID = "24c92e6d-ab02-493d-8596-c88e250d4975";
const SITE_ID = "64556670-7585-4aea-a16a-9391c3bbddb9";
const TITLE = "Como Cuidar da Barba em Casa: Guia Completo 2024 [7 Passos]";

async function main() {
  console.log("=== SMOKE IMAGE ===\n");

  const supabase = createServiceClient();

  console.log("🎨 1/3 Gerando hero image (gpt-image-1)...");
  const t0 = Date.now();
  const prompt = buildVisualPromptFromTitle(TITLE, "barbearia");
  console.log(`   prompt: ${prompt.slice(0, 120)}...`);
  const img = await generateHeroImage({
    prompt,
    style: "photo",
    size: "1536x1024",
  });
  console.log(
    `   ✅ gerada em ${((Date.now() - t0) / 1000).toFixed(1)}s · ${(img.bytes.length / 1024).toFixed(0)}KB · $${img.costUsd.toFixed(4)}`
  );

  console.log("\n☁️  2/3 Upload no Supabase Storage...");
  const uploaded = await uploadHeroImage({
    postId: POST_ID,
    siteId: SITE_ID,
    bytes: img.bytes,
    contentType: "image/png",
  });
  console.log(`   ✅ ${uploaded.url}`);

  console.log("\n💾 3/3 Update og_image_url no post...");
  const { error } = await supabase
    .from("posts")
    .update({ og_image_url: uploaded.url })
    .eq("id", POST_ID);
  if (error) {
    console.error("   ❌", error.message);
    process.exit(1);
  }
  console.log("   ✅ post atualizado");

  console.log("\n=== ✅ IMAGE SMOKE PASSOU ===");
  console.log(`URL: ${uploaded.url}`);
}

main().catch((err) => {
  console.error("\n❌ FALHOU:", err);
  process.exit(1);
});
