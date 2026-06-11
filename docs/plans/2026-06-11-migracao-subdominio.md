# Plano de Migração: Subdiretório → Subdomínio

> **Status:** PROPOSTA — aguardando revisão do Lucas. Nada executado ainda.
> **Data:** 2026-06-11
> **Autor:** auditoria de 3 exploradores + síntese

---

## 0. TL;DR

O produto foi construído pra entregar o blog em `cliente.com.br/blog` (subdiretório)
via **reverse proxy Cloudflare Worker + troca de nameserver**. Isso é frágil e
arriscado: trocar nameserver = a gente assume o DNS inteiro do cliente, e se a
zona não replica todos os registros (A, MX/email, TXT, subdomínios), **o site do
cliente cai**.

**Decisão (Lucas):** migrar pra **subdomínio `blog.cliente.com.br` via 1 CNAME**.
O cliente adiciona 1 registro DNS, o site principal **nunca é tocado**, zero risco.
É o padrão de todo blog SaaS (HubSpot, Ghost, Substack, Webflow, Shopify).

Isso **remove o Cloudflare inteiro** (Worker, zona, nameserver, reescrita de HTML)
e substitui por **Vercel Custom Domains API + middleware por Host**.

---

## 1. Como funciona o modelo novo (técnico)

Padrão multi-tenant da Vercel (o "Platforms Starter Kit" oficial faz exatamente isso):

```
1. Cliente adiciona 1 CNAME no DNS dele:
   blog.cliente.com.br  →  cname.conteudai.com.br   (ver decisão §3)

2. A gente chama a API da Vercel e adiciona "blog.cliente.com.br"
   como domínio do nosso projeto ddgengine.

3. Vercel detecta o CNAME, emite SSL automático, valida.

4. Middleware (src/middleware.ts) lê o header Host: blog.cliente.com.br,
   resolve o tenant pelo domínio, e faz rewrite pro conteúdo do blog daquele site.

5. Pronto. blog.cliente.com.br/{slug} serve o post.
   O site principal cliente.com.br continua 100% onde estava.
```

**Vantagens sobre o modelo Cloudflare:**
- Remove dependência inteira do Cloudflare (Worker, zona, API)
- Sem reescrita de HTML (o Worker fazia isso, era frágil)
- SSL automático pela Vercel
- Mais barato (sem Worker)
- Cliente faz 1 ação (CNAME), não troca nameserver

**Caveat resolvido:** Vercel não suporta *wildcard* (`*.conteudai.com.br`) fora do
Enterprise — MAS a gente NÃO precisa de wildcard. Adiciona cada `blog.cliente.com.br`
como domínio individual via API (suportado no Pro). Escalável programaticamente.

---

## 2. SEO — a narrativa muda (importante)

Hoje a **landing FAQ vende o subdiretório como superior**:
> "Usamos subdiretório (seusite.com.br/blog, não subdomínio), que concentra
> autoridade SEO... +30-50% tráfego."

A gente vai **inverter** isso. A reframe honesta e correta:
> "Seu blog em `blog.seudominio.com.br` — no seu domínio raiz, com link interno
> do seu site. Ganha autoridade de marca SEM risco de quebrar seu site."

**Verdade técnica:** a diferença SEO entre subdomínio e subdiretório em 2024+ é
**marginal**. O Google trata subdomínio do mesmo domínio raiz como parte da marca.
A simplicidade + zero risco compensam de longe. É o que 90% das marcas usam
(`blog.nubank.com.br`, `blog.stone.com.br`, etc).

---

## 3. DECISÃO PENDENTE: alvo do CNAME

O cliente vai apontar `blog.dominio.com.br` pra QUÊ?

### Opção A — Branded: `cname.conteudai.com.br` ⭐ RECOMENDADO
- Cliente aponta pra `cname.conteudai.com.br`, que internamente é um CNAME pra `cname.vercel-dns.com`
- **Por que é melhor:**
  - White-label: o DNS do cliente não expõe "vercel"
  - **Future-proof (argumento matador):** se um dia a gente sair da Vercel pra
    outro host, a gente só re-aponta `cname.conteudai.com.br` do NOSSO lado.
    **Nenhum cliente precisa mexer no DNS de novo.** Com o CNAME raw da Vercel,
    cada cliente teria que reconfigurar.
- **Custo:** criar 1 registro `cname.conteudai.com.br` na zona do conteudai (1 min)

### Opção B — Direto: `cname.vercel-dns.com`
- Cliente aponta direto pro CNAME da Vercel
- Mais simples de montar (zero setup nosso), mas expõe Vercel e trava a gente nela

**Recomendação: Opção A.** O argumento future-proof sozinho já justifica — a gente
NUNCA quer pedir pra 50+ clientes mudarem DNS de novo.

---

## 4. Schema do banco (mudanças)

### Tabela `sites` — colunas a ADICIONAR
| Coluna | Tipo | Pra quê |
|---|---|---|
| `subdomain` | text | ex: `blog` (vira `blog.{domain}`) |
| `cname_target` | text | ex: `cname.conteudai.com.br` |
| `cname_verified` | boolean | CNAME propagou + Vercel validou? |
| `cname_verified_at` | timestamptz | quando |
| `vercel_domain_added` | boolean | já adicionamos na Vercel API? |

### Tabela `sites` — colunas que viram LEGADO (manter por ora, parar de usar)
- `cloudflare_zone_id`, `cloudflare_nameservers`, `cloudflare_worker_id`
- `proxy_method` (passa a ser sempre `subdomain`)
- `proxy_path` (não é mais configurável; blog vive no root do subdomínio)
- `tenant_slug` → **MANTÉM** (ainda útil pra resolver tenant)

### Tabela `cloudflare_workers` — DEPRECAR
- Migration marca todos `status='removed'`. Não dropar a tabela já (histórico).

### `integration_state` (FSM) — novo fluxo
```
Antigo: preview → zone_created → verifying → active
Novo:   preview → cname_pending → verifying → active
                                              ↘ error
                                              ↘ concierge_requested
```

---

## 5. Plano em fases

### FASE 1 — Mecanismo (núcleo técnico) ~1 dia
- [ ] Migration: colunas novas em `sites` + marca `cloudflare_workers` removed
- [ ] `src/middleware.ts` — resolve Host `blog.X` → tenant → rewrite pro conteúdo
- [ ] `src/lib/vercel/domains.ts` — wrapper da Vercel API (addDomain, verifyDomain, removeDomain)
- [ ] Reescrever `settings/integration/actions.ts`:
  - `initiateDomainConnection` → gera info do CNAME + chama Vercel addDomain
  - `verifyDomainConnection` → checa CNAME via DNS + Vercel domain status
- [ ] Criar registro `cname.conteudai.com.br` na zona do conteudai (se Opção A)

### FASE 2 — Validar na Petderma ~30 min
- [ ] Cliente (Douglas) adiciona 1 CNAME `blog.petdermafood.com.br → cname.conteudai.com.br`
- [ ] Sistema adiciona o domínio na Vercel, valida, ativa
- [ ] `blog.petdermafood.com.br/{post}` serve o blog AO VIVO
- [ ] Confirmar: site principal `petdermafood.com.br` 100% intocado

### FASE 3 — Wizard + tutoriais + emails ~1 dia
- [ ] `wizard.tsx` — 2 passos (era 3): "1. Iniciar · 2. Adicione 1 CNAME · verificar"
- [ ] `registrar-tutorials.ts` — reescrever os 5 (Registro.br, HostGator, Locaweb,
      Hostinger, GoDaddy): de "trocar 2 nameservers" → "adicionar 1 CNAME"
- [ ] `registrar-tutorials.tsx` — prop `nameservers[]` → `cnameTarget` + `subdomain`
- [ ] `integration/page.tsx` — header + FAQ (prazo 5-30min, "1 CNAME", sem email-risk)
- [ ] `integration-banner.tsx`, `concierge-button.tsx`, `concierge-modal.tsx` — copy
- [ ] Emails: `ticket-status-emails.ts`, `concierge-emails.ts`, `blog-activated.ts`
      — `{domain}/blog` → `blog.{domain}`, "nameserver" → "CNAME"

### FASE 4 — Copy/marketing ~meio dia
- [ ] `page.tsx` landing: hero, 6 features (PLUG-AND-PLAY etc), **FAQ SEO invertida**,
      DOR REAL, pricing card Native ("não reverse proxy" → outro), depoimento
- [ ] `layout.tsx` metadata (title/OG/twitter)
- [ ] `llms.txt/route.ts`
- [ ] `(public)/sobre/page.tsx` ("reverse proxy via Cloudflare" → subdomínio)
- [ ] `(public)/pricing/page.tsx` ("Reverse proxy (sem plugin)" → "CNAME + subdomínio")
- [ ] `(public)/status/page.tsx` ("Cloudflare Workers" → "DNS & Subdomínios")
- [ ] `dashboard/page.tsx` passo 3, `welcome-tour.tsx` step 4
- [ ] `settings/site/page.tsx` (remove campo proxy_path)

### FASE 5 — Limpeza técnica ~meio dia
- [ ] Deprecar `src/lib/cloudflare/{api,deploy,worker-template}.ts`
- [ ] `teardown.ts` — remove lógica de Worker, vira removeDomain da Vercel
- [ ] `verify-dns` cron — DNS query / Vercel status em vez de getZone
- [ ] Inngest: remover `workerDeploy`, `workerHealthcheckAll`
- [ ] `vercel.json` — remover/adaptar cron `workers-hourly`
- [ ] `_proxy/[tenantSlug]` — manter como fallback OU remover (decidir)

---

## 6. Inventário completo (auditoria)

### Copy/marketing (~39 ocorrências)
`page.tsx` (FAQ SEO l.183, PLUG-AND-PLAY l.104, features l.45/67, pricing l.1106,
DOR l.511, depoimento l.125, FAQ l.174, hero l.302), `layout.tsx` (l.25/44/53),
`llms.txt` (l.62/66/73), `sobre` (l.51), `pricing` (l.26/115/266), `status` (l.46),
`dashboard` (l.197), `welcome-tour` (l.27).

### Fluxo integração (~40 pontos)
`wizard.tsx` (l.3-16 comentário, 57, 128-129, 141, 160-164, 185-186, 193),
`registrar-tutorials.ts` (os 5 registradores inteiros — todos passos de nameserver),
`registrar-tutorials.tsx` (props l.39-40, bloco l.194-204),
`integration/page.tsx` (l.5-8, 33-38, 152, 157, 165),
`concierge-button.tsx` (l.20-21, 37-42), `concierge-modal.tsx` (l.76, 135, 145-150),
`integration-banner.tsx` (l.38-48), `site/page.tsx` (l.5, 51, 67-68).

### Infra técnica
`cloudflare/api.ts` (REMOVE), `cloudflare/deploy.ts` (REMOVE),
`cloudflare/worker-template.ts` (REMOVE), `_proxy/[tenantSlug]` (manter/remover),
`integration/actions.ts` (REESCREVER 2 actions), `billing/teardown.ts` (REESCREVER),
`cron/verify-dns` (REESCREVER lógica), `onboarding/actions.ts` (proxy_method),
`inngest/functions.ts` (remover 2 fns), `vercel.json` (cron),
schema `sites` (+5 colunas, ~6 legado), tabela `cloudflare_workers` (deprecar).

---

## 7. Riscos & mitigação
- **Vercel domain limits:** Pro permite muitos domínios custom; confirmar teto antes de escalar.
- **Sites já "ativos" no modelo antigo:** hoje 0 clientes reais com Worker ativo (só testes).
  Migration tranquila. Marcar `cloudflare_workers` removed.
- **`tenant_slug` ainda usado:** manter coluna.
- **Resolução org→site:** no subdomínio cada `blog.X` = 1 site específico (melhora a
  resolvibilidade vs hoje que pega "primeiro site publicado da org").
- **Email do cliente:** CNAME de subdomínio NÃO toca MX → email nunca quebra (era o
  maior risco do modelo nameserver). Isso é argumento de venda novo.

---

## 8. O que NÃO muda
- Geração de post (briefing → RAG → multi-pass → imagem) — intacta
- Rotas `blog/[orgSlug]/**` (preview/render) — viram a base do que o middleware serve
- Visibility, metrics, reports, billing, admin, tickets — intactos
- O endpoint `_proxy` pode virar fallback ou ser aposentado

---

## 9. Próximo passo
Lucas revisa este doc. Ao aprovar:
1. Confirmar decisão do §3 (CNAME target — recomendo Opção A branded)
2. Confirmar ordem (recomendo Fase 1→2 primeiro: validar mecanismo na Petderma antes da copy)
3. Eu executo fase a fase, com smoke test E2E em cada marco.
