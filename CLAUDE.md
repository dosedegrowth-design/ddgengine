# DDG Engine — Notas pra Claude Code

> Contexto pra futuras sessões de Claude Code trabalharem nesse projeto.

## Visão geral

SaaS brasileiro de blog automation com IA. Cliente conecta site, preenche briefing, IA gera conteúdo otimizado pra Google + ChatGPT, publica em blog dedicado.

**Arquitetura**: Next.js 16 App Router + Supabase + Tailwind v4 + shadcn/ui + Claude Sonnet.

## Contexto importante (PRECISA SABER)

- **Supabase compartilhado**: usamos projeto `hkjukobqpjezhpxzplpj` (DDG) com schema dedicado `ddg_engine`. NUNCA misturar com schemas `public`, `crm_onboarding`, `trafego_ddg` (outros projetos DDG).
- **Multi-tenant via RLS**: helpers `ddg_engine.is_member_of(uuid)` e `ddg_engine.my_org_ids()`. Toda tabela tem RLS habilitado.
- **Next.js 16**: usa `proxy.ts` (não `middleware.ts`). Função exportada deve ser `proxy()`.
- **Tailwind v4**: config é CSS-first. Tokens shadcn em `src/app/globals.css` via `@theme inline`.
- **Auth**: Supabase Auth. Server Actions chamam `createClient()` de `@/lib/supabase/server`. Browser usa `@/lib/supabase/client`.

## Padrões adotados

### Server Actions

```typescript
"use server";
import { createClient } from "@/lib/supabase/server";

export async function minhaAction(data) {
  const supabase = await createClient();
  // ...
}
```

### Auth helpers (server-side)

```typescript
import { requireUser, getCurrentOrg, getCurrentSite } from "@/lib/auth";

const { user, supabase } = await requireUser();
const { org } = await getCurrentOrg();
const { site } = await getCurrentSite();
```

### IA / Geração

- Claude via `generateWithClaude()` de `@/lib/ai/claude` (com prompt caching).
- Embeddings via `embed()` / `embedBatch()` de `@/lib/ai/embeddings`.
- Geração de post via `generatePost()` de `@/lib/ai/generate`.

### Brand RAG

- `processBriefingEmbeddings(briefingId)` — chamado após cliente submeter briefing.
- `retrieveBrandContext(siteId, query, limit)` — chamado durante geração.
- RPC `public.ddg_engine_match_brand_documents` faz busca cosine no pgvector.

### Auditor automático

- `auditSite(rawUrl)` de `@/lib/audit/index.ts`.
- Retorna score 0-100 + classificação + checks + recomendações.
- Detecta: HTTPS, Cloudflare, stack (WP/Wix/Webflow/etc), robots, sitemap, meta, schema.

## Estado das tabelas (schema ddg_engine)

```
organizations         — workspaces
org_memberships       — users × orgs (multi-membership)
sites                 — 1+ por org (futuramente)
briefings             — 15 perguntas estruturadas
brand_documents       — chunks + embeddings (pgvector 1536)
posts                 — long_form + faq_page
audit_log             — eventos importantes
```

## Próximos blocos (semanas 2+)

1. **Cloudflare Worker reverse proxy** — pra blog rodar em `cliente.com/blog`
   - Worker JS template parametrizado por tenant
   - Reescrita de URLs internas no HTML
   - Cloudflare API integration pra automation
2. **Multi-pass engine** — 7 passes com self-critique
3. **8 quality gates** — plágio, brand voice, fact-check, SEO score, GEO score, disclaimer, toxicidade, tamanho
4. **AI Visibility Tracker** — cron semanal, 200 prompts × 4 LLMs
5. **WhatsApp Cloud API** — templates pré-aprovados, botões interativos
6. **Asaas integration** — PIX + cartão recorrente, trial 14 dias
7. **GSC + GA4 OAuth** — métricas reais no painel
8. **Relatórios mensais** — PDF + email + WhatsApp

## Gotchas conhecidos

- **`useSearchParams()` em client component**: deve ser wrappado em `<Suspense>` ou build falha no Next.js 16.
- **Multi-tenant queries**: Supabase nested selects retornam arrays mesmo em relações 1:1. Lidar com `Array.isArray`.
- **Service role key**: NUNCA usar em request user-facing. Só pra cron, edge functions, admin internos. Disponível via `createServiceClient()`.
- **Schema separado**: ao usar Supabase JS, passar `db: { schema: "ddg_engine" }` no createClient.
- **Build-time data**: rotas que dependem de Supabase service role devem ter `export const dynamic = "force-dynamic"` E ter fallback caso env não esteja configurada.

## Decisões deliberadas (não mudar sem pensar)

- ✅ Schema separado `ddg_engine` (vs schema `public` ou novo projeto Supabase) — porque DDG já paga Pro deste projeto. Migrar pra projeto próprio quando MRR > R$ 30k.
- ✅ Single-pass geração no MVP (vs multi-pass) — multi-pass vem na semana 2.
- ✅ pgvector vs serviço dedicado (Pinecone, etc) — pgvector é grátis e suficiente até 100k vetores.
- ✅ Next.js Server Actions vs API Routes — Server Actions pra mutations user-facing, Route Handlers só pra webhooks/auth callbacks.
- ✅ shadcn/ui copy-paste vs lib npm — copy-paste pra controle total e zero version mismatch.
- ✅ Anthropic API direto (sem AWS Bedrock) — preço idêntico, latência menor, prompt caching nativo.

## Comandos comuns

```bash
npm run dev          # dev server
npm run build        # production build
npx tsc --noEmit     # type-check completo

# Aplicar migration via MCP Supabase do Claude Code:
# mcp__fa50d8ff*__apply_migration com project_id="hkjukobqpjezhpxzplpj"
```

## Referências externas

- Doc estratégico completo: `/Users/lucascassiano/Claude/DDG-Engine-MASTER.md`
- Plano de execução: `/Users/lucascassiano/Claude/DDG-Engine-PLANO-EXECUCAO.md`
- Apresentação: `/Users/lucascassiano/Claude/DDG-Engine-Apresentacao-Investidores.md`
