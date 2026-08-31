# Conteudai — PROGRESS.md

> Documento vivo do progresso do projeto (antes "DDG Engine" durante beta interno).
> Última atualização: **2026-08-31 (checkup geral)**

---

## 🩺 CHECKUP GERAL 2026-08-31 (retomada após 2,5 meses parado)

### 🚨 INCIDENTE RESOLVIDO: schema `ddg_engine` fora da API (2 meses de outage silencioso)

- **Sintoma**: autopilot parou de gerar posts em 01/jul; blog.petdermafood.com.br devolvia 404 ("Blog não encontrado"); metrics/visibility mortos.
- **Causa raiz**: alguém re-salvou `pgrst.db_schemas` no Supabase compartilhado (ao configurar instituto_miracema/marina_saleme) e o `ddg_engine` SAIU da lista de schemas expostos → TODA chamada PostgREST com `Accept-Profile: ddg_engine` levava PGRST106. Mesma praga que derrubou o Petderma em jul (ver memória petderma-ingest-schema-exposto).
- **Fix aplicado**: `alter role authenticator set pgrst.db_schemas = '... , ddg_engine'` + notify reload. Blog voltou (200), autopilot voltou a enfileirar.
- **Anti-recorrência (pendente decidir)**: guard que re-adiciona schemas críticos se sumirem da lista, ou migrar leituras críticas pra views em `public`.

### 🐛 FIX: dedup de keywords (posts duplicados) — commit `2ee40d3`

- `canonicalKey` não colapsava plural/sinônimo → autopilot escreveu **3 posts quase idênticos** de "ração hipoalergênica" (23, 29, 30/jun) e tinha mais 4 variantes na fila.
- Fix: stem leve PT (rações→ração, cães→cão) + sinônimos (cachorro/canino→cão, felino→gato) + posts `failed` não contam mais como cobertura ("ração natural", 9.900 buscas/mês, estava presa por post que falhou).
- Curadoria da fila do piloto: variantes já cobertas marcadas `covered` apontando pro post existente; duplicatas exatas removidas; "ração natural" devolvida pra fila. Resultado: 21 oportunidades únicas + 20 cobertas.
- +5 testes unitários (33 no total).

### ✅ Validado no checkup

- Typecheck limpo · 33/33 testes · build de produção ok · deploy = último commit.
- `/api/health` ok · landing/pricing/login/status/sitemap 200.
- 6 crons Vercel registrados · autopilot dry-run e run real ok (post "ração guabi natural" enfileirado, n8n "Conteudai - Gerar Post" ativo e executando).
- Google Ads Keyword Planner funcionando (refresh trouxe 46 keywords).
- Envs críticas presentes na Vercel (Anthropic, OpenAI, Asaas prod, Resend, Cloudflare, Google OAuth/Ads, Vercel API).

### ❌ Ainda faltando (mapa)

- **Piloto**: GSC/GA4 nunca conectados (site_integrations=0, metrics_daily=0) — envs do Google OAuth existem, falta clicar em Conectar no painel logado.
- **Envs ausentes**: WHATSAPP_* (templates Meta nunca submetidos), PERPLEXITY_API_KEY + GOOGLE_AI_API_KEY (visibility tracker roda só com ChatGPT/Claude), INNGEST_* (bypassado — geração via n8n), Sentry/PostHog/Meta Pixel.
- **Comercial**: 0 assinaturas; checkout Asaas nunca testado com cliente real; logo ainda placeholder; cases placeholder; termos sem advogado; banner LGPD.
- **Sujeira**: 11 sites/orgs de teste (maio) pausados no banco; 7 posts `failed` antigos (jun) — inofensivos.
- Visibility tracker: só 1 run na história (cron semanal deve voltar a rodar agora com o schema consertado — acompanhar segunda-feira).

---

## 🚀 Maratona 2026-05-18 / 19 (rebrand + admin + infra)

### Domínio em produção

| Item | Status |
|---|---|
| Domínio | `conteudai.com.br` (Hostinger registrar) |
| Nameservers | `carter.ns.cloudflare.com` + `tori.ns.cloudflare.com` |
| Cloudflare zone | `active` (master account DDG) |
| Vercel custom domain | apex + `www` redirect 308 → apex |
| SSL | Auto via Vercel |
| Resend domain | `verified` (DKIM + SPF MX + SPF TXT) em sa-east-1 |
| EMAIL_FROM | `Conteudai <oi@conteudai.com.br>` |
| Test email | ✅ chegou |

### Rebrand DDG Engine → Conteudai
- ~45 arquivos TS/TSX renomeados user-facing
- Wordmark XXL: `DDG | ENGINE` → `CONTE | UDAI` (preserva ritmo brutalist)
- Emails: contato@, suporte@, dpo@, noreply@ → `@conteudai.com.br`
- User-Agent bot: `ConteudaiBot/1.0`
- README + .env.example atualizados
- **Preservado**: schema Postgres `ddg_engine`, repo folder, vars `DDG_ENGINE_SCHEMA`, mentions à agência (`@dosedegrowth.com.br`)
- Commit: `d6803f6`

### Admin panel `/admin/tickets` (built from scratch)
- Gate via `ADMIN_EMAILS` env (csv) + default `@dosedegrowth.com`
- Layout próprio (sem briefing gate)
- Lista com 5 stat cards + filtros (status, type, busca livre) + 200 max
- Detalhe: status picker / assignee picker / notas internas / timeline / sidebar (org, site, NS atribuídos, link CF)
- Server actions: `updateTicketStatus`, `assignTicket`, `addInternalNote`, `selfAssign`
- Audit em `metadata.events[]` (who/when/what)
- Link sidebar "Admin · Staff" só renderiza se isAdmin
- Commit: `17aeb8b`

### Emails de ticket (cliente + time DDG)
- 4 templates cliente: in_progress / waiting_client / resolved / cancelled (HTML brutalist)
- Time DDG: log compacto em 3 eventos: `status_change` / `assigned` / `note_added`
- Fire-and-forget — falha de email NUNCA bloqueia mutação

### Checkout DDG-styled
- `settings/billing/page.tsx`: rewrite sem shadcn (lime/amber/red por status, 4-plan grid, badge "Popular"/"Atual")
- `settings/billing/checkout/page.tsx`: 2-col com summary sticky + toggle Mensal/Anual
- `checkout-form.tsx`: native inputs, MethodCard (PIX/Cartão), CTA brutalist `[4px_4px_0]`
- Commit: `b88a9e5`

### Registrar tutorials polidos
- `StepMock` discriminated union (6 variantes: sidebar-nav, ns-replace, toggle, radio-choice, button-row, login-form)
- Mocks brutalist sem screenshot real (campo `screenshot?: { url, alt }` pronto pra Supabase Storage no futuro)
- `MockFrame` reutilizável + indicador "X/N"
- Commit: `b88a9e5`

### Infra extras
- Vercel cron `verify-dns`: `*/30 min` → daily (Hobby plan limit)
- `ADMIN_EMAILS` setado em prod / dev / preview (preview via API direta — CLI tem bug com branch)
- 3 commits semânticos pushed: `d6803f6` → `17aeb8b` → `b88a9e5`

---

## 🔄 Rodadas pós-rebrand (2026-05-19 madrugada)

### Email pro time DDG quando ticket muda (commit `01f2543`)
- Notificações de status e atribuição direcionadas a `SUPPORT_TEAM_EMAIL`
- Templates compactos por evento (`status_change` / `assigned` / `note_added`)
- Reutilizam infra do `sendEmail` + Resend

### 7 polish fixes da landing (commit `b3fca0a`)
Atacando os pontos que tavam abertos no PROGRESS antigo:

| # | Fix | Detalhe |
|---|---|---|
| 1 | Hero desktop reposition | Removido `lg:pt-10` do mockup; `items-start` → `items-center`; gap aumentado |
| 2 | "A DOR REAL" R$3500 | `R$` virou label mono acima; número `7rem→11rem` igual ao `73%` e `0` |
| 3 | Sticky Card 4 (Conteudai) | Title subiu de `2xl-4xl` → `3xl-5xl` (era menor que cards velhos) |
| 4 | "O QUE VOCÊ GANHA" | 6 features no grid 2×3 + 7ª "SEM LOCK-IN" virou closing statement full-width com shadow lime brutalist `[10px_10px_0]` |
| 5 | Pricing volume | `≈ 8.000/12.000/16.000/32.000/120.000 palavras/mês` em todos os planos (calc: 1500/artigo + 250/FAQ) |
| 6 | Hover effects pricing | 6 cards: `hover:-translate-y-1` + shadow brutalist expandindo; Pro com `[12px_12px_0]` lime |
| 7 | FAQ items | Hover shadow + open state com `?` em circle (escala 1.1× quando aberto, vira lime), bg lime/15 |

### Página pública `/tickets/[id]` (commit `6bf1eef`)
**Fecha o loop do concierge sem fricção:**

- Cliente recebe email → clica → cai direto na página sem precisar logar
- UUID v4 do ticket como token (~122 bits aleatórios, unguessable)
- **Mostra:** status com label friendly, mensagem original, histórico filtrado, form de comentário
- **Esconde:** notas internas do staff, email do time, outros tickets
- **Validação server:** UUID regex, tickets resolved/cancelled bloqueiam novos comentários, MAX 2000 chars
- **Email pro time:** `sendClientCommentToTeam` dispara com box destacado quando cliente comenta
- **URLs atualizadas:** `ticket-status-emails.ts` + `concierge-emails.ts` agora apontam `/tickets/[id]` (era `/settings/integration`)

### WhatsApp suporte real (commit `f572fa9`)
- Substituído placeholder `5511999999999` → `5511989885531`
- 3 arquivos do código (fallback hardcoded também atualizado defensivamente)
- Vercel env `NEXT_PUBLIC_SUPPORT_WHATSAPP` unificado em 1 entrada nos 3 targets (prod + preview + dev) via API direta
- `.env.local` + `.env.example` documentados

### Resumo de commits desta rodada
```
f572fa9 feat(whatsapp): numero real do suporte 5511989885531
6bf1eef feat(tickets): pagina publica /tickets/[id] (cliente sem login)
b3fca0a feat(landing): 7 polish fixes do PROGRESS antigo
01f2543 feat(admin): emails pro time DDG + PROGRESS atualizado
```

Tudo em `main`, deploys auto Vercel `Ready`. tsc + eslint 100% clean a cada turno.

---

## 🔥 AUDITORIA DE LANÇAMENTO (2026-05-19) — por que blog não tá rodando

> Pergunta do Lucas: "como funciona criação de blog, falta n8n? o que tá funcional?"

**Resposta curta:** código 100% pronto, **toda lógica é Next.js + Inngest interno**, sem n8n.
**2 bugs/configs de infra travam tudo.**

### O que JÁ existe e funciona

| Camada | Stack interna | Estado |
|---|---|---|
| Onboarding + briefing | UI step-by-step + audio transcript (Whisper) | ✅ |
| Brand RAG | `processBriefingEmbeddings` → chunks em `brand_documents` (pgvector 1536d) | ✅ código, **não roda** |
| Multi-pass engine | 7 passes Claude → outline/draft/SEO/GEO/brand/fact/polish | ✅ código, **falha por crédito** |
| Quality gates | SEO + GEO score, brand similarity | ✅ |
| Image gen | gpt-image-1 hero image | ✅ |
| Aprovação | Manual + WhatsApp + Auto modes | ✅ |
| Blog público | `/blog/[orgSlug]` + categoria + search + sitemap + RSS + OG | ✅ |
| Reverse proxy | Cloudflare Worker deploy automático no domínio do cliente | ✅ |
| Inngest | 10 funções durables (visibility, workers, metrics, reports, postGenerate, briefingEmbed) | ✅ configurado |
| Email pipeline | Resend (concierge, status ticket, trial, blog activated) | ✅ |

### 🔴 Bloqueio #1: Anthropic API sem crédito
O único post criado no banco está com status `failed`. Metadata:
```
"Your credit balance is too low to access the Anthropic API.
Please go to Plans & Billing to upgrade or purchase credits."
```
Multi-pass usa Claude Sonnet 4.5 como LLM principal. Sem créditos, nenhum post novo é gerado. Tem `with-fallback.ts` que cai pra OpenAI, mas precisa verificar se dispara nessa condição específica (400 invalid_request_error).

**Ação:** Lucas carrega crédito em console.anthropic.com → Plans & Billing.

### 🔴 Bloqueio #2: Brand RAG nunca é populado (bug duplo)
Em `src/app/api/briefing/save/route.ts` linha 162-173:
```ts
// Tenta escrever 'embedding' na tabela 'briefings'...
await supabase.from("briefings").update({ embedding })
//                                          ^^^^^^^^^
// MAS essa coluna NÃO EXISTE na tabela briefings.
// O catch swallows o erro silenciosamente.
```

E mais grave: **NUNCA dispara o evento Inngest** `ddg/briefing.embed` que rodaria `processBriefingEmbeddings` (que existe, faz tudo certo, mas ninguém chama).

**Verificado no banco prod (`ddg_engine.brand_documents`):**
- 22 organizations, 14 com briefing `completion_status='completed'`
- **0 rows em `brand_documents`** (deveria ter 3-8 por site após briefing)
- **TODOS** com `embedding_status='pending'`

Sem RAG da marca → multi-pass Pass 5 (Brand Voice) trabalha às cegas.

**Ação:** Fix do `route.ts`:
1. Remover o `.update({ embedding })` inline
2. Disparar `sendInngestEvent({ name: 'ddg/briefing.embed', data: { briefing_id } })`
3. Endpoint admin `/admin/backfill-rag` pra rodar `processBriefingEmbeddings` nos 14 briefings já completed

### Smoke test pós-fix
1. Org com briefing completo → confirmar `brand_documents` populado
2. Gerar 1 post multi-pass → confirmar status `pending_review` ou `published`
3. Confirmar render em `/blog/{orgSlug}/{slug}`

### Status pós-fix esperado
Sistema operacionalmente pronto pra **primeiro cliente real**.

---

## 📋 Backlog ordenado por impacto (pós-auditoria)

### 🔥 Bloqueador #0 — Desbloquear geração de blog
- [ ] **Lucas:** carregar crédito Anthropic
- [ ] Fix `/api/briefing/save` (disparar Inngest em vez de embed inline)
- [ ] Endpoint backfill `/admin/backfill-rag`
- [ ] Smoke test 1 org → 1 post → publicado no `/blog/{slug}`

### 🟡 Alto impacto — Branding (Lucas precisa fornecer)
- [ ] Logo real (`brand-mark.tsx` ainda placeholder)
- [ ] Aprovação WhatsApp (precisa Meta Business + número verificado — número `5511989885531` já em produção pra CTAs de suporte)

### 🟢 Backlog autônomo (posso atacar sem input)
- [ ] Trial→paid conversion banner (revenue lever)
- [ ] Migração admin gate: allowlist env → tabela `ddg_engine.staff_users`
- [ ] Busca por short-id no `/admin/tickets`
- [ ] Screenshots reais nos tutoriais (Supabase Storage; fallback mock já implementado)
- [ ] Cliente importar WordPress (código existe, não testado E2E)
- [ ] GSC import (Search Console)
- [ ] Inbox real (precisa decidir schema antes)

---

# 📜 Histórico anterior (pré-maratona)

> Documento vivo do progresso do projeto Conteudai.
> Sessão anterior: 2026-05-16

---

## 🎯 Visão geral do produto

**SaaS BR de blog automático + AI Visibility Tracker** — reverse proxy plug-and-play, aprovação WhatsApp, multi-pass content engine, monitoramento de marca em ChatGPT/Perplexity/Claude/Gemini.

**Posicionamento**: "Você sugere o tema. A engine faz o SEO. Google e IA fazem o resto*."

**Público**: PMEs brasileiras (30+ anos), founders, gestores de marketing — digital nativos mid-level que já usam Notion/ChatGPT/Linear.

**Stack**:
- Next.js 16 (App Router) + TypeScript + Tailwind v4 CSS-first
- Supabase Postgres (schema `ddg_engine`) + RLS multi-tenant
- pgvector (1536d) + Postgres FTS Portuguese
- shadcn/ui (new-york) + Radix UI
- Claude Sonnet 4.5 (multi-pass 7 passos)
- OpenAI text-embedding-3-small + gpt-image-1
- 4-LLM AI Visibility Tracker
- Cloudflare Workers reverse proxy
- Meta WhatsApp Cloud API
- Asaas (PIX + cartão recorrente)
- Resend (5 email templates)
- Google OAuth (GSC + GA4)
- Inngest v4 (10 functions durables)
- Vercel deployment

**Deploy live**: https://ddgengine.vercel.app
**Repo**: github.com/dosedegrowth-design/ddgengine

---

## 📦 Estado da implementação (alto nível)

### ✅ Backend / API / Engine (100%)
- 57 rotas Next.js implementadas
- 27 tabelas Supabase com RLS
- Multi-pass content engine (7 passos)
- AI Visibility Tracker (4 LLMs)
- Reverse proxy via `_proxy.ts`
- WhatsApp Cloud API direct (sem BSP)
- Asaas integration (PIX + cartão)
- 10 Inngest functions
- 8 Quality Gates automation
- SSE realtime endpoint
- Sentry instrumentation helper
- 28 testes Vitest passing
- GitHub Actions CI
- 4 cron schedules (Vercel Hobby-compatible)

### ✅ Landing page redesign — "Engine BR Disruptivo" (~95%)
Mix: 70% Brutalist + 20% AI Glow + 10% Editorial.
Paleta: branco/preto/verde lime `#C8FF3D`.

**Componentes próprios criados** (`src/components/landing/`):
1. `llm-badge.tsx` — `LLMBadge` + `LLMTrustStrip`
2. `numbered-step.tsx` — passos 01-04 serif XXL
3. `stat-block.tsx` — stats com glow lime
4. `mockup-dashboard.tsx` — **dashboard vivo** (não imagem) com 10 micro-animações
5. `flow-diagram.tsx` — pipeline horizontal/vertical
6. `feature-card.tsx` — mosaic features
7. `wordmark-xxl.tsx` — "DDG ● ENGINE" footer
8. `hero-decorations.tsx` — 11 elementos animados (asteriscos, plus, dots, brackets, círculos)
9. `sticky-stack.tsx` — cards empilhando com scale-down

**Motion helpers** (`src/components/landing/motion/`):
1. `animated-counter.tsx` — count-up com fallback timeout
2. `live-value.tsx` — count-up + drift contínuo (efeito real-time)
3. `reveal.tsx` — `Reveal` + `StaggerGroup` + `StaggerItem` (5 variantes)
4. `scroll-progress.tsx` — barra lime topo
5. `word-reveal.tsx` — headline word-by-word
6. `magnet.tsx` — CTAs grudam no cursor
7. `marquee-row.tsx` — scroll-driven 2 direções
8. `shiny-text.tsx` — gradiente animado infinito
9. `scroll-char-reveal.tsx` — caracteres opacity progressiva
10. `spotlight-card.tsx` — gradiente cursor nos cards
11. `floating-orbs.tsx` — 5 esferas lime blurred
12. `grain-overlay.tsx` — SVG noise editorial
13. `cursor-trail.tsx` — 5 dots lime seguindo cursor
14. `asterisk-mark.tsx` — ✦ superscript rotacionando

**Brand**:
- `brand-mark.tsx` — slot pro logo final (placeholder "DDG ● ENGINE")

**Design tokens** (`globals.css`):
- Paleta DDG (9 variáveis)
- 13 utilities (`ddg-bracket`, `ddg-display`, `ddg-stat`, `ddg-pill-lime`, `ddg-grid-dark/light`, `ddg-cta-lime`, `ddg-cta-ghost`, `ddg-pulse`, `ddg-ping-ring`, `ddg-breath`, `ddg-float`, `ddg-shimmer-x`, `ddg-scanline`, `ddg-text-shimmer`, `ddg-spin-slow`, `ddg-shiny-text`, `ddg-wordmark`, `ddg-counter`)

---

## 🎨 Estrutura final da landing (11 seções)

1. **Nav sticky** — BrandMark + 4 links + 2 CTAs
2. **Hero split** — eyebrow + headline 3 linhas + sub + 2 CTAs + Mockup vivo direita
3. **Trust strip + Marquee** — LLMs + 2 rows de citações scroll-driven
4. **Problema dark** — 3 stats count-up + char-reveal
5. **Como funciona** — 4 NumberedSteps
6. **Flow diagram** — pipeline 5 nodes
7. **Sticky stack** — 3 jeitos antigos vs DDG (cards empilham)
8. **Features mosaic** — 7 cards (era 6, agora 7 com "Você sugere os temas")
9. **Testimonials dark** — 3 cards com pill métrica
10. **Pricing 6 tiers** — 4 self-service (Starter/Light/Pro/Multi) + 2 enterprise (Agência/Native)
11. **FAQ accordion** — 10 perguntas
12. **CTA final dark** — headline + CTA Magnet + LLM badge
13. **Footer** — BrandMark + 3 colunas links + WordmarkXXL

---

## 💰 Pricing — 6 tiers (recuperado da MASTER doc)

### Self-service (grid 4 colunas)
| Plano | Preço | Long | FAQ | Sites | Modo | Visibility | Brand RAG | Suporte |
|---|---|---|---|---|---|---|---|---|
| **Starter** | R$ 97 | 4 | 8 | 1 | Auto | 50 × 2 IAs | Básico | Email |
| **Light** | R$ 197 | 6 | 12 | 1 | Auto | 100 × 3 IAs | Médio | Email |
| **Pro** ⭐ | **R$ 297** | **8** | **16** | **1** | **Auto + WhatsApp** | **200 × 4 IAs** | **Completo** | **WhatsApp** |
| **Multi** | R$ 897 | 16 | 32 | 3 | Auto + WhatsApp | × 3 sites | × 3 marcas | Prioritário |

### Enterprise (cards horizontais)
- **Agência** R$ 1.997/mês — Ilimitado / 30 sites / API / White-label
- **Native** R$ 2.497 setup + R$ 1.497/mês — Integração nativa / 7-14d setup

Todos com 14 dias grátis + sem cartão + garantia 90 dias.

---

## 📜 Histórico de commits relevantes

| Commit | Descrição |
|---|---|
| `0f0879e` | feat(landing): redesign Engine BR Disruptivo — brutalist + lime DDG + motion |
| `7cc3486` | feat(landing): turbinar MockupDashboard com 10 micro-animações |
| `37d7cb9` | feat(landing): lapidação completa da copy — foco em ROI e cena |
| `8861c5b` | feat(landing): hero cinematográfico + reposicionamento SEO + dor de ads |
| `790ea19` | feat(landing): reposicionamento "você no controle + SEO técnico profundo" |
| `51a9351` | fix(landing): 4 ajustes — planos, CTA final, FlowDiagram, hero bg |
| `951d05f` | feat(landing): restaurar 6 tiers originais (4 self-service + 2 enterprise) |
| `cafed0c` | fix(mobile): auditoria responsiva Playwright — 5 fixes críticos |

---

## ⚠️ Pendências atuais (fila de fixes pedidos pelo Lucas)

### 🔴 P0 — Bugs visuais críticos

#### 1. HERO mal posicionada (DESKTOP)
**Problema**: headline "Você sugere o tema. A engine faz o SEO. Google e IA fazem o resto." está quebrando em 6 linhas verticais com pills "o" e "resto" cortados em linhas separadas. O mockup à direita parece desalinhado. CTAs aparecem fora do viewport inicial em 1440x900.

**Causa**: text-7xl no headline força quebras em viewport limitado. Layout grid lg:grid-cols-12 não distribui bem.

**Fix planejado**:
- Reduzir scale: `text-3xl md:text-5xl lg:text-6xl xl:text-[5rem]`
- Garantir que mockup não compita por espaço — ajustar grid pra `lg:grid-cols-[1.2fr_1fr]`
- Reduzir altura mínima do hero `min-h-[88vh]` → `min-h-screen` ou `min-h-[80vh]`
- Garantir CTAs visíveis above-the-fold

#### 2. A DOR REAL bugada
**Problema**: parágrafo "Por anos você precisou de agência..." cortando horizontalmente no viewport (overflow). Stats 73% / 0 / R$ 3500 com números enormes mas labels minúsculos — "tímidos".

**Causa**: `max-w-3xl` no parágrafo com `text-2xl` ultrapassa viewport visual quando combinado com padding lateral. ScrollCharRevealDark renderiza spans individuais que podem estourar.

**Fix planejado**:
- Container do parágrafo: `max-w-2xl` em vez de `3xl`
- Stats: aumentar label size de `text-sm` pra `text-lg md:text-xl`
- Numbers: já enormes, **ENGORDAR ainda mais** (`text-8xl md:text-9xl` ou usar custom `text-[10rem]`)
- Helper text dos stats: aumentar de `text-sm` pra `text-base`
- Aumentar gap entre os 3 stats pra dar respiro

#### 3. STICKY STACK Card 4 ("Jeito novo · A virada")
**Problema**: layout do último card com preço lateral (R$ 97+) onde texto ficou pequeno e o preço ficou tímido. Informações abaixo (bullets) estão pequenas. O "= R$ 9,90/DIA" também tímido.

**Fix planejado**:
- Aumentar fonte dos bullets de `text-sm` pra `text-base`
- Aumentar preço de `text-4xl sm:text-5xl md:text-7xl` pra **`text-5xl sm:text-6xl md:text-8xl`**
- "= R$ 9,90/DIA" mais visível (text-base + cor lime)
- Title pode ficar `text-3xl sm:text-4xl md:text-6xl`
- Adicionar espaço respiratório entre seções

#### 4. "O QUE VOCÊ GANHA" — 1 card sozinho
**Problema**: 7 features em grid `md:grid-cols-2 lg:grid-cols-3` deixam 1 card sozinho na 3ª linha em desktop (3+3+1).

**Fix planejado**:
- Opção A: **voltar pra 6 features** (remover "SEM LOCK-IN" que é menos crítico)
- Opção B: **adicionar 8ª feature** (ex: "Garantia 90 dias" / "Suporte WhatsApp humano")
- Opção C: **destacar último card como wide** (col-span-2 ou col-span-3 no último)

**Recomendação**: Opção B — adicionar 8ª feature, deixar 4+4 em desktop.

---

### 🟡 P1 — Conteúdo / Mensagem

#### 5. CTA Final + outros lugares — VOLUME = VELOCIDADE
**Pedido**: explicar que mais volume de postagens = ranqueamento mais rápido no SEO e em IA.

**Fix planejado** (5 lugares):
1. CTA Final sub: adicionar mensagem
2. Hero sub: incluir "mais conteúdo = mais rápido"
3. Pricing: banner curto antes dos cards
4. Pricing cards: comparação visual de timeline por tier
5. FAQ "Quanto tempo": refinar com volume comparison
6. **Nova mini-seção** "Matemática do Volume" entre Sticky Stack e Features

#### 6. Pricing — números MASTIGADOS
**Pedido**: cliente precisa entender "X publicações/mês" claramente, calculadas.

**Fix planejado**:
- Cada card mostra:
  - **TOTAL/mês**: "12 publicações" (Starter) / "18" (Light) / "24" (Pro) / "48" (Multi 3 sites)
  - Decomposição: "4 artigos longos + 8 perguntas-respostas"
  - **Equivalente em palavras**: "~12.000 palavras de conteúdo SEO/mês"
- Comparação implícita: Starter X palavras, Pro 2X, Multi 4X

---

### 🟢 P2 — Polish / Animação

#### 7. Hover effects nos planos + botões
**Pedido**: efeito ao passar o mouse nos cards de pricing e nos botões.

**Fix planejado**:
- Pricing cards: lift -4px + scale 1.02 + border lime no hover
- Botões CTA: já têm `ddg-cta-lime` com shadow offset, mas pode incluir scale leve
- Magnet já tá nos CTAs principais — espalhar pros secundários
- SpotlightCard no pricing também

#### 8. FAQ — vida no background
**Pedido**: background do FAQ tá morto, dar vida.

**Fix planejado**:
- Adicionar `FloatingOrbs variant="light"` sutil
- Ou `GrainOverlay` + grid pattern animado
- Ou decorações geométricas estilo `HeroDecorations` mas mais sutis
- Mantér FAQ accordion legível

---

## 📂 Estrutura de arquivos crítica

```
/Users/lucascassiano/Antigravity/ddg-engine/
├── PROGRESS.md ← este arquivo
├── src/
│   ├── app/
│   │   ├── globals.css                  # Design tokens DDG + 16 utilities
│   │   └── page.tsx                     # Landing 11 seções (~900 linhas)
│   └── components/
│       ├── brand/
│       │   └── brand-mark.tsx           # Slot pro logo final
│       └── landing/
│           ├── llm-badge.tsx
│           ├── numbered-step.tsx
│           ├── stat-block.tsx
│           ├── mockup-dashboard.tsx     # Dashboard vivo com 10 micro-animações
│           ├── flow-diagram.tsx
│           ├── feature-card.tsx
│           ├── wordmark-xxl.tsx
│           ├── hero-decorations.tsx     # 11 elementos animados
│           ├── sticky-stack.tsx         # Cards empilhando
│           └── motion/
│               ├── animated-counter.tsx # Count-up + fallback timeout
│               ├── live-value.tsx       # Count-up + drift contínuo
│               ├── reveal.tsx           # 5 variantes de fade
│               ├── scroll-progress.tsx
│               ├── word-reveal.tsx
│               ├── magnet.tsx           # Mouse-follow magnetic
│               ├── marquee-row.tsx      # Scroll-driven 2 dirs
│               ├── shiny-text.tsx       # Gradient animado infinito
│               ├── scroll-char-reveal.tsx
│               ├── spotlight-card.tsx
│               ├── floating-orbs.tsx    # 5 orbs lime blurred
│               ├── grain-overlay.tsx    # SVG noise
│               ├── cursor-trail.tsx     # 5 dots lime
│               └── asterisk-mark.tsx    # ✦ rotacionando
```

---

## 📊 Métricas do projeto

- **Linhas de código novas**: ~3.500 (landing + componentes)
- **Componentes criados**: 23 (9 landing + 14 motion + 1 brand)
- **Animações implementadas**: ~55 individuais
- **Routes deployadas**: 57
- **Tabelas Supabase**: 27 (todas com RLS)
- **Tests passing**: 28
- **Build time**: ~10-11s
- **Static pages prerendered**: 38

---

## 🚀 Próximos passos imediatos (2026-05-19 →)

### 🔥 Alta prioridade
1. **Logo real** — `brand-mark.tsx` ainda é placeholder (Lucas precisa entregar SVG)
2. **WhatsApp real** — substituir placeholder `5511999999999` em 5+ lugares (NEXT_PUBLIC_SUPPORT_WHATSAPP env + concierge fallbacks)
3. **Landing fixes pendentes** (do PROGRESS antigo) — 7 ajustes visuais

### 🟡 Média prioridade — Landing fixes (pré-maratona)
1. Hero desktop reposition
2. "A DOR REAL" — corrigir overflow + engordar números
3. Sticky stack Card 4 — engordar tipografia
4. "O QUE VOCÊ GANHA" — resolver card solitário
5. Pricing — números mastigados (palavras/mês em vez de tokens)
6. Hover effects pricing + buttons
7. FAQ — background vivo (orbs/grain)

### 🟢 Backlog / próximas rodadas
- Cliente pode comentar/responder ao ticket (hoje só staff escreve)
- Busca por ID no `/admin/tickets`
- Screenshots reais dos tutoriais (5 registradores) — plug Supabase Storage
- Trial → paid conversion flow (banner, upsells)
- Inbox real (página existe mas está vazia)
- Aprovação WhatsApp (feature do plano Pro)
- Migrar admin gate de allowlist env pra tabela `ddg_engine.staff_users` quando time >5

---

## 🎨 Status do design system (pós-maratona)

| Página | Status DDG-styled |
|---|---|
| Landing `/` | ✅ Brutalist completo |
| Onboarding | ✅ Brutalist |
| Dashboard | ✅ Brutalist |
| Posts | ✅ Brutalist |
| Briefing | ✅ Brutalist |
| Settings/integration | ✅ Brutalist (com mocks brutalist nos tutoriais) |
| **Settings/billing** | ✅ **Brutalist (refatorado 2026-05-19)** |
| **Settings/billing/checkout** | ✅ **Brutalist (refatorado 2026-05-19)** |
| **/admin/tickets** | ✅ **Brutalist (novo 2026-05-19)** |
| Email templates | ✅ HTML brutalist (lime/ink chips) |

---

## 📌 Documentos relacionados

- `/Users/lucascassiano/Claude/DDG-Engine-MASTER.md` — Doc estratégica completa (tese, concorrência, arquitetura, pricing 6 tiers, marketing, jurídico)
- `/Users/lucascassiano/Claude/DDG-Engine-STATUS.md` — Status pós-blocks 1-9
- `/Users/lucascassiano/Claude/DDG-Engine-RESUMO-FINAL.md` — Latest status (post Phases A-F)
- `/Users/lucascassiano/Claude/DDG-Engine-LANDING-REDESIGN.md` — Estratégia do redesign
- `/Users/lucascassiano/Claude/DDG-Engine-Concorrencia-BR-Analise.md` — Análise BR
- `/Users/lucascassiano/Claude/DDG-Engine-Apresentacao-Investidores.md` — Pitch deck
