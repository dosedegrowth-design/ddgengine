# DDG Engine

> SaaS brasileiro de blog automation com IA. Visibilidade automática no Google e ChatGPT.

## O que é

Plataforma que conecta o site do cliente (qualquer stack — WordPress, Wix, Webflow, Shopify, custom), aprende a voz da marca via briefing inteligente, e gera conteúdo otimizado pra Google + IAs (ChatGPT, Perplexity, Claude, Gemini).

**Posicionamento**: a primeira plataforma brasileira de visibilidade em IA + Google. Setup em 7 minutos, sem plugin, sem código.

## Status

🚧 **MVP em construção** — fim de semana intensivo de fundação técnica.

### O que já funciona

- ✅ Multi-tenant com Supabase + RLS no schema `ddg_engine`
- ✅ Auth (email + Google OAuth) com Server Actions
- ✅ Landing page completa (hero, problema, solução, pricing, FAQ)
- ✅ Painel cliente com sidebar e dashboard
- ✅ Onboarding wizard com auditor automático do site (DNS, Cloudflare, stack, HTTPS, robots, sitemap, schema → score 0-100)
- ✅ Briefing wizard de 15 perguntas com autosave debounced
- ✅ Brand RAG (embeddings text-embedding-3-small + pgvector + retrieval via cosine)
- ✅ Engine de geração single-pass com Claude Sonnet 4.5
  - Long-form (1500-3500 palavras)
  - FAQ pages (400-800 palavras)
  - Schema markup automático (Article, FAQPage)
- ✅ Páginas de blog públicas em `/blog/[orgSlug]/[slug]` com SEO completo
- ✅ Sitemap.xml, robots.txt, llms.txt
- ✅ Modo AUTO (publica direto) e modo APROVAÇÃO

### Próximas semanas

- ⏳ Reverse proxy via Cloudflare Worker (blog em `cliente.com/blog`)
- ⏳ Multi-pass engine (7 passes com self-critique)
- ⏳ 8 quality gates automáticos
- ⏳ AI Visibility Tracker (200 prompts × 4 LLMs/semana)
- ⏳ WhatsApp Cloud API (aprovação com botões interativos)
- ⏳ Asaas integration (PIX + cartão recorrente)
- ⏳ GSC + GA4 OAuth + métricas no painel
- ⏳ Relatórios mensais automatizados

## Stack

| Camada | Escolha |
|---|---|
| Framework | Next.js 16 App Router |
| Linguagem | TypeScript |
| Styling | Tailwind CSS v4 (CSS-first) |
| Componentes | shadcn/ui (new-york, neutral) + Radix |
| Database | Supabase Postgres (schema `ddg_engine`) |
| Vector | pgvector (1536 dim) |
| Auth | Supabase Auth |
| LLM principal | Anthropic Claude Sonnet 4.5 |
| Embeddings | OpenAI text-embedding-3-small |
| Hospedagem | Vercel |
| Domínios/CDN | Cloudflare (futuros Workers) |

## Setup local

```bash
# 1. Install
npm install

# 2. Copy env template
cp .env.example .env.local
# Preencha: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY

# 3. Dev
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Estrutura

```
src/
├─ app/
│  ├─ page.tsx              # landing page principal
│  ├─ (auth)/               # login, signup, logout
│  ├─ (app)/                # painel autenticado
│  │  ├─ dashboard/
│  │  ├─ onboarding/
│  │  ├─ briefing/
│  │  ├─ posts/
│  │  └─ settings/
│  ├─ auth/callback/        # OAuth callback
│  ├─ blog/[orgSlug]/       # blogs públicos
│  ├─ sitemap.ts
│  ├─ robots.ts
│  └─ llms.txt/
├─ components/
│  ├─ ui/                   # shadcn primitives
│  ├─ dashboard/            # sidebar, generate button
│  └─ onboarding/           # wizards
├─ lib/
│  ├─ supabase/             # client, server, proxy
│  ├─ ai/                   # claude, embeddings, generate
│  ├─ audit/                # auditor automático
│  ├─ rag/                  # Brand RAG
│  ├─ auth.ts               # helpers
│  ├─ markdown.ts
│  └─ utils.ts
└─ proxy.ts                 # Next.js 16 proxy (refresh session)
```

## Schema do banco

Schema dedicado `ddg_engine` no Supabase DDG (projeto `hkjukobqpjezhpxzplpj`).

Tabelas core:
- `organizations` — workspaces multi-tenant
- `org_memberships` — usuários × orgs
- `sites` — domínios conectados + audit data
- `briefings` — 15 perguntas estruturadas
- `brand_documents` — chunks de texto + embeddings pgvector(1536)
- `posts` — conteúdo gerado (long_form + faq_page)
- `audit_log` — eventos auditáveis

RLS multi-tenant em todas as tabelas via helpers `is_member_of()` e `my_org_ids()`.

## Comandos

```bash
npm run dev          # dev server (Turbopack)
npm run build        # production build
npm run start        # production server
npm run lint         # ESLint
npx tsc --noEmit     # type-check
```

## Roadmap completo

Ver `/Users/lucascassiano/Claude/DDG-Engine-MASTER.md` pra documento estratégico completo.

## Licença

Proprietário — Dose de Growth.

---

🤖 Co-construído com Claude Code.
