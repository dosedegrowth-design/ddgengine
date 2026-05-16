/**
 * Landing — DDG Engine "Engine BR Disruptivo"
 *
 * Direção: 70% Brutalist + 20% AI Glow + 10% Editorial
 * Paleta: branco + preto + verde lime #C8FF3D
 *
 * Headline disruptiva confronta status quo:
 * "Sua marca já é citada por IA. Você só não sabe por quem."
 *
 * Motion estratégico: count-up nos stats, draw-in no chart,
 * stagger nos cards, scroll progress, word-reveal no hero.
 *
 * Logo placeholder via <BrandMark /> — quando vier o final,
 * troca em /components/brand/brand-mark.tsx.
 */
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Brain, Check, FileText, Globe, MessageCircle, ShieldCheck, Sparkles, Zap } from "lucide-react";

import { BrandMark, BrandMarkInverted } from "@/components/brand/brand-mark";
import { FeatureCard } from "@/components/landing/feature-card";
import { FlowDiagram } from "@/components/landing/flow-diagram";
import { LLMTrustStrip, LLMBadge } from "@/components/landing/llm-badge";
import { MockupDashboard } from "@/components/landing/mockup-dashboard";
import { NumberedStep } from "@/components/landing/numbered-step";
import { StickyStackContainer, StickyStackCard } from "@/components/landing/sticky-stack";
import { WordmarkXXL } from "@/components/landing/wordmark-xxl";
import { AnimatedCounter } from "@/components/landing/motion/animated-counter";
import { AsteriskMark } from "@/components/landing/motion/asterisk-mark";
import { CursorTrail } from "@/components/landing/motion/cursor-trail";
import { FloatingOrbs } from "@/components/landing/motion/floating-orbs";
import { GrainOverlay } from "@/components/landing/motion/grain-overlay";
import { Magnet } from "@/components/landing/motion/magnet";
import { MarqueeRow } from "@/components/landing/motion/marquee-row";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/landing/motion/reveal";
import { ScrollCharRevealDark } from "@/components/landing/motion/scroll-char-reveal";
import { ScrollProgress } from "@/components/landing/motion/scroll-progress";
import { ShinyText } from "@/components/landing/motion/shiny-text";
import { SpotlightCard } from "@/components/landing/motion/spotlight-card";
import { WordReveal } from "@/components/landing/motion/word-reveal";

const STEPS = [
  {
    n: "01",
    badge: "2 minutos",
    title: "Conecta seu site",
    desc: "Cola a URL. A gente faz o resto via Cloudflare. Sem plugin, sem mexer no código, sem migração. Funciona em WordPress, Wix, Shopify, Webflow, custom.",
    icon: Globe,
  },
  {
    n: "02",
    badge: "5 minutos",
    title: "Você sugere os temas",
    desc: "15 perguntas sobre seu negócio + lista de temas/produtos/dores que quer trabalhar. A engine pesquisa keywords, intenção de busca e concorrência pra cada tema. Você no controle do conteúdo — sem terceirizar o que importa.",
    icon: FileText,
  },
  {
    n: "03",
    badge: "Toda semana",
    title: "SEO técnico + escrita",
    desc: "Multi-pass writer faz: pesquisa real, estrutura editorial, escrita, SEO técnico (schema, sitemap, internal links), GEO pra IA, fact-check. Chega pronto no seu WhatsApp pra aprovar.",
    icon: Brain,
  },
  {
    n: "04",
    badge: "24/7",
    title: "Publica e mede tudo",
    desc: "Vai pro seu site na hora. Google ranqueia (impressions, posição, CTR) e 4 IAs (ChatGPT, Perplexity, Claude, Gemini) verificam toda semana onde sua marca aparece. Tudo num painel só.",
    icon: Sparkles,
  },
];

const FEATURES = [
  {
    label: "VOCÊ NO CONTROLE",
    title: "Você sugere os temas. A engine pesquisa fundo.",
    description: "Você diz o que quer trabalhar (lançamento, sazonal, dor de cliente, pivô). A engine pesquisa keywords reais, intenção de busca, perguntas frequentes, concorrência e GEO antes de escrever. Não é blog automático bobo — é SEO profissional.",
    icon: FileText,
  },
  {
    label: "SEO TÉCNICO",
    title: "Trabalho de R$ 5k de agência, automatizado",
    description: "Schema markup, sitemap, canonical, internal links, meta tags, Core Web Vitals, GEO pra IA generativa, fact-check. Tudo que agência cobra caro pra fazer, a engine entrega em cada post. Sem você precisar entender nada disso.",
    icon: ShieldCheck,
  },
  {
    label: "AI VISIBILITY",
    title: "Você vê o que a IA fala de você",
    description: "200 perguntas testadas por semana em ChatGPT, Perplexity, Claude e Gemini. Descobre onde sua marca já aparece — e onde a concorrência tá levando o cliente que era seu.",
    icon: Sparkles,
  },
  {
    label: "MULTI-PASS",
    title: "Conteúdo nível agência, sem agência",
    description: "7 passos editoriais por post: pesquisa real, estrutura, escrita, SEO técnico, fact-check, otimização pra IA generativa, revisão. Não é texto AI bobo — é editorial sério.",
    icon: Brain,
  },
  {
    label: "WHATSAPP FIRST",
    title: "Aprova em 5 segundos, sem login",
    description: "Chega no seu Zap: título, score SEO, score IA, 3 botões (aprovar, editar, descartar). Decide entre reuniões. Modo Auto também — publica sozinho se você confiar.",
    icon: MessageCircle,
  },
  {
    label: "SEM PLUGIN",
    title: "Conecta em 2 min, não migra nada",
    description: "Cloudflare Worker serve o blog em seusite.com.br/blog. Seu site continua igual, sua agência continua mexendo. Você só ganha um blog automático em cima.",
    icon: Globe,
  },
  {
    label: "SEM LOCK-IN",
    title: "O conteúdo é seu. Pra sempre.",
    description: "Importa posts antigos do WordPress, Webflow, Shopify. Exporta tudo a qualquer hora em Markdown ou HTML. Se um dia sair, leva tudo. Cancela sem multa.",
    icon: Zap,
  },
];

const TESTIMONIALS = [
  {
    quote: "Em 60 dias eu apareci em 14 buscas relevantes do ChatGPT no meu nicho. Antes eu nem tinha como saber. Hoje vejo cada citação chegando no painel.",
    name: "Marina S.",
    role: "Founder · e-commerce de cosméticos",
    metric: "+14 citações em 60 dias",
  },
  {
    quote: "Eu pagava R$ 3.500/mês pra agência fazer 4 posts. Hoje pago R$ 297 e saem 8 posts + medição de IA que agência nenhuma fazia. Cancelei a agência no segundo mês.",
    name: "Rafael C.",
    role: "Diretor · agência B2B",
    metric: "R$ 3.200/mês economizados",
  },
  {
    quote: "Meu blog tava parado há 8 meses. Em 90 dias publiquei 24 posts aprovando no WhatsApp entre reuniões. Tráfego orgânico dobrou.",
    name: "Carla P.",
    role: "CMO · SaaS jurídico",
    metric: "Tráfego 2x em 90 dias",
  },
];

/**
 * Citações detectadas mockadas — rolam em marquee scroll-driven.
 * Combinam diferentes verticais pra mostrar versatilidade.
 */
const CITATIONS_ROW_1 = [
  { llm: "ChatGPT", brand: "Nuvemshop", query: "melhor plataforma de e-commerce BR" },
  { llm: "Perplexity", brand: "Stone", query: "maquininha sem mensalidade" },
  { llm: "Claude", brand: "Hotmart", query: "como vender curso online" },
  { llm: "Gemini", brand: "Asaas", query: "alternativa ao PagSeguro" },
  { llm: "ChatGPT", brand: "Cobli", query: "rastreamento de frota com IA" },
  { llm: "Perplexity", brand: "Conta Azul", query: "ERP pra pequena empresa" },
];

const CITATIONS_ROW_2 = [
  { llm: "Claude", brand: "Olist", query: "vender em marketplace múltiplo" },
  { llm: "Gemini", brand: "Vindi", query: "cobrança recorrente PIX" },
  { llm: "ChatGPT", brand: "Resultados Digitais", query: "automação de marketing BR" },
  { llm: "Perplexity", brand: "Loft", query: "comprar apto em SP" },
  { llm: "Claude", brand: "Buser", query: "viagem de ônibus barata" },
  { llm: "Gemini", brand: "Quinto Andar", query: "alugar sem fiador" },
];

const FAQ = [
  {
    q: "Eu posso escolher os temas dos posts?",
    a: "Sim — você no controle. Toda semana você sugere os temas (lançamento de produto, dor de cliente, sazonal, pivô estratégico) e a engine cuida do trabalho técnico: pesquisa de keywords, intenção de busca, perguntas frequentes, análise de concorrência e estrutura editorial. Se não quiser sugerir, a engine puxa temas baseado no seu setor e oportunidades de SEO detectadas.",
  },
  {
    q: "É só blog automático ou tem SEO sério mesmo?",
    a: "SEO sério. Cada post passa por 7 passos editoriais: pesquisa real de keywords (não só ChatGPT cuspindo texto), estrutura H1/H2/H3 otimizada, schema markup JSON-LD, sitemap atualizado, canonical correto, internal links inteligentes, meta tags, Core Web Vitals, GEO (otimização pra IA generativa) e fact-check. É o trabalho que agência de SEO cobra R$ 3-5k/mês — automatizado.",
  },
  {
    q: "Eu já tenho redator (ou agência). Substitui?",
    a: "Pode substituir, pode complementar — você escolhe. Quem usa pra trocar: economiza R$ 2-4 mil/mês e ainda ganha o tracking de IA que agência nenhuma faz. Quem usa pra complementar: deixa a engine cuidar do volume (8 posts/mês) e a agência foca em campanhas, posts âncora ou conteúdo estratégico.",
  },
  {
    q: "Funciona no meu site (WordPress, Wix, Shopify, custom)?",
    a: "Sim, em qualquer site. Diferente de outras ferramentas, não exigimos plugin nem migração. Conecta via Cloudflare (grátis) e o blog aparece em seusite.com.br/blog em 2 minutos. Seu site continua igual — você só ganha um blog em cima.",
  },
  {
    q: "Quanto tempo até ver resultado em faturamento?",
    a: "Visibility em IA: primeiras citações aparecem em 30-60 dias de publicação consistente. SEO Google: 90-180 dias pras primeiras keywords ranqueando, 6-12 meses pra acelerar de verdade. Tráfego orgânico vira lead vira venda — não é magia, é matemática composta. Não vendemos atalho.",
  },
  {
    q: "Vai prejudicar meu SEO atual?",
    a: "Pelo contrário. Usamos subdiretório (seusite.com.br/blog, não subdomínio blog.seusite.com.br), que concentra autoridade SEO no seu domínio principal. Casos reais mostram +30-50% de tráfego ao migrar pra esse modelo. Você ganha autoridade, não divide.",
  },
  {
    q: "Como funciona a aprovação por WhatsApp?",
    a: "Post pronto: você recebe mensagem no Zap com título, score SEO, score IA generativa e 3 botões — Aprovar, Editar ou Descartar. Um clique e publica. Tempo médio: 5 segundos. Sem login, sem app, sem painel pra abrir.",
  },
  {
    q: "E se eu não quiser revisar nada?",
    a: "Modo Auto publica direto sem você ver. 8 quality gates automáticos garantem que o post passa nos critérios (originalidade, gramática, SEO, fact-check). Você só recebe notificação quando já tá no ar. Ideal pra quem quer fluxo sem fricção.",
  },
  {
    q: "Por que R$ 297 e não R$ 1.000 como concorrentes?",
    a: "Porque a engine é nossa (sem revenda de API), porque você roda em Cloudflare (custo quase zero) e porque a Dose de Growth é dos founders — não pagamos VC, não pagamos sales team. Você paga o produto, não o overhead.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, sem multa, sem ligação, sem retenção. Cancela direto no painel. Os posts publicados ficam no seu site — você é dono do conteúdo, sempre. Quer migrar pra outra ferramenta? A gente exporta tudo em Markdown ou HTML pra você levar.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-ddg-paper text-ddg-ink antialiased flex flex-col">
      <ScrollProgress />

      {/* ===== NAV ===== */}
      <header className="sticky top-0 z-50 w-full border-b-2 border-ddg-ink bg-ddg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-ddg-paper/80">
        <div className="container mx-auto max-w-7xl px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" aria-label="Início">
            <BrandMark size="md" asLink />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="#como-funciona" className="hover:text-ddg-lime-deep transition-colors">Como funciona</Link>
            <Link href="#features" className="hover:text-ddg-lime-deep transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-ddg-lime-deep transition-colors">Preço</Link>
            <Link href="#faq" className="hover:text-ddg-lime-deep transition-colors">FAQ</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:inline-flex text-sm font-medium hover:underline underline-offset-4"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="ddg-cta-lime inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm"
            >
              Começar grátis
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ===== HERO ===== */}
        <section className="relative overflow-hidden bg-ddg-paper min-h-[88vh] flex items-center">
          {/* Background layers */}
          <FloatingOrbs variant="light" />
          <div className="absolute inset-0 ddg-grid-light opacity-40 pointer-events-none" aria-hidden />
          <GrainOverlay opacity={0.08} />
          <CursorTrail />

          <div className="container relative z-10 mx-auto max-w-7xl px-4 lg:px-8 pt-16 md:pt-24 pb-20 md:pb-32">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
              {/* Esquerda — copy */}
              <div className="lg:col-span-7 space-y-7">
                <Reveal variant="up" delay={0}>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ddg-ink text-ddg-paper">
                    <span className="h-2 w-2 rounded-full bg-ddg-lime ddg-pulse" />
                    <span className="text-[11px] font-mono uppercase tracking-widest">
                      Posicionamento orgânico · Google + IA
                    </span>
                  </div>
                </Reveal>

                <h1 className="ddg-display text-5xl md:text-7xl lg:text-[5.5rem] leading-[0.95]">
                  <WordReveal
                    text="Você sugere o tema."
                    delay={0.15}
                    stagger={0.05}
                  />
                  <br />
                  <span className="text-ddg-muted">
                    <WordReveal
                      text="A engine faz o SEO."
                      delay={0.55}
                      stagger={0.05}
                    />
                  </span>
                  <br />
                  <WordReveal
                    text="Google e IA fazem"
                    delay={1.0}
                    stagger={0.05}
                  />{" "}
                  <span className="relative inline-block">
                    <WordReveal text="o resto" delay={1.35} stagger={0.05} highlight={["o", "resto"]} />
                    <AsteriskMark className="text-ddg-lime-deep" />
                  </span>
                  <span className="text-ddg-muted">.</span>
                </h1>

                <Reveal variant="up" delay={1.6}>
                  <p className="text-lg md:text-xl text-ddg-muted max-w-2xl leading-relaxed">
                    Trabalho de <span className="text-ddg-ink font-semibold">SEO técnico profundo</span> que agência cobraria R$ 5 mil — automatizado. Você sugere os temas que importam, a engine pesquisa keywords, escreve, otimiza, publica e <span className="text-ddg-ink font-semibold">mede sua marca no Google E em 4 IAs</span> (ChatGPT, Perplexity, Claude, Gemini). Por <span className="text-ddg-lime-deep font-bold">R$ 297/mês</span>.
                  </p>
                </Reveal>

                <Reveal variant="up" delay={1.7}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
                    <Magnet strength={0.25}>
                      <Link
                        href="/signup"
                        className="ddg-cta-lime inline-flex items-center gap-2 rounded-md px-6 py-3.5 text-base"
                      >
                        Diagnóstico grátis da minha marca
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Magnet>
                    <Magnet strength={0.2}>
                      <Link
                        href="#como-funciona"
                        className="ddg-cta-ghost inline-flex items-center gap-2 rounded-md px-6 py-3.5 text-base"
                      >
                        Ver na prática
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </Magnet>
                  </div>
                </Reveal>

                <Reveal variant="up" delay={1.9}>
                  <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-mono text-ddg-muted uppercase tracking-widest">
                    <span>14 dias grátis</span>
                    <span className="text-ddg-lime-deep">●</span>
                    <span>Sem cartão</span>
                    <span className="text-ddg-lime-deep">●</span>
                    <span>Cancela em 1 clique</span>
                    <span className="text-ddg-lime-deep">●</span>
                    <span>Garantia 90 dias</span>
                  </div>
                </Reveal>

                <Reveal variant="up" delay={2.1}>
                  <p className="text-[10px] font-mono text-ddg-muted/60 italic">
                    * Você no controle dos temas. A engine no controle do trabalho técnico.
                  </p>
                </Reveal>
              </div>

              {/* Direita — mockup dashboard */}
              <Reveal variant="right" delay={0.3} duration={0.8} className="lg:col-span-5">
                <MockupDashboard />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ===== TRUST STRIP + MARQUEE CITATIONS ===== */}
        <section className="border-y-2 border-ddg-ink bg-ddg-cream overflow-hidden">
          <div className="py-6 md:py-8">
            <Reveal variant="fade">
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 px-4 mb-6 md:mb-8">
                <div className="ddg-bracket whitespace-nowrap">Sua concorrência já tá aparecendo aqui</div>
                <LLMTrustStrip variant="light" />
              </div>
            </Reveal>

            {/* Marquee row 1 — rolando pra esquerda */}
            <MarqueeRow direction="left" speed={300} className="mb-3">
              {CITATIONS_ROW_1.map((c, i) => (
                <CitationChip key={`r1-${i}`} {...c} />
              ))}
            </MarqueeRow>

            {/* Marquee row 2 — rolando pra direita */}
            <MarqueeRow direction="right" speed={300}>
              {CITATIONS_ROW_2.map((c, i) => (
                <CitationChip key={`r2-${i}`} {...c} />
              ))}
            </MarqueeRow>
          </div>
        </section>

        {/* ===== PROBLEMA — DARK STATS ===== */}
        <section className="relative bg-ddg-ink text-ddg-paper overflow-hidden">
          <div className="absolute inset-0 ddg-grid-dark pointer-events-none" aria-hidden />
          <div className="container relative mx-auto max-w-7xl px-4 lg:px-8 py-24 md:py-32">
            <div className="max-w-3xl mb-10 md:mb-14">
              <Reveal>
                <div className="ddg-bracket text-ddg-lime mb-5">A DOR REAL</div>
              </Reveal>
              <Reveal delay={0.1}>
                <h2 className="ddg-display text-4xl md:text-6xl text-balance">
                  Aparecer no Google sempre exigiu agência cara.
                  <span className="block text-ddg-muted mt-2">Aparecer em IA, ninguém te ensinou.</span>
                </h2>
              </Reveal>
            </div>

            {/* Parágrafo com scroll char reveal */}
            <div className="max-w-3xl mb-14 md:mb-20">
              <ScrollCharRevealDark
                text="Por anos você precisou de agência pra fazer SEO sério: pesquisa de keywords, estrutura editorial, schema, GEO, internal links, otimização técnica. Custava R$ 3-5 mil por mês — e ainda assim, ninguém te ensinou a aparecer no ChatGPT. Agora seu cliente abre a IA antes do Google. Sem estar nos dois, você desapareceu — e quem aparecer leva o cliente que era seu."
                className="text-xl md:text-2xl leading-relaxed font-medium"
                highlightWords={["desapareceu", "leva"]}
              />
            </div>

            <StaggerGroup className="grid md:grid-cols-3 gap-10 md:gap-16">
              <StaggerItem>
                <div className="space-y-3">
                  <div
                    className="ddg-stat text-7xl md:text-8xl"
                    style={{ fontFamily: 'ui-serif, "Times New Roman", serif' }}
                  >
                    <ShinyText variant="lime" duration={4}>
                      <AnimatedCounter to={73} suffix="%" duration={2} />
                    </ShinyText>
                  </div>
                  <div className="text-sm uppercase tracking-widest font-bold text-ddg-paper/80">
                    Das buscas B2B
                  </div>
                  <p className="text-sm text-ddg-paper/50 leading-relaxed max-w-xs">
                    Já começam num LLM (ChatGPT, Perplexity, Claude). E não no Google.
                  </p>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div className="space-y-3">
                  <div
                    className="ddg-stat text-7xl md:text-8xl text-ddg-lime drop-shadow-[0_0_24px_rgba(200,255,61,0.35)]"
                    style={{ fontFamily: 'ui-serif, "Times New Roman", serif' }}
                  >
                    <AnimatedCounter to={0} duration={1.6} />
                  </div>
                  <div className="text-sm uppercase tracking-widest font-bold text-ddg-paper/80">
                    Ferramentas BR
                  </div>
                  <p className="text-sm text-ddg-paper/50 leading-relaxed max-w-xs">
                    Que medem onde sua marca aparece nas respostas das IAs. Até agora.
                  </p>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div className="space-y-3">
                  <div
                    className="ddg-stat text-7xl md:text-8xl text-ddg-paper"
                    style={{ fontFamily: 'ui-serif, "Times New Roman", serif' }}
                  >
                    <span className="text-ddg-paper/60 text-5xl md:text-6xl align-top">R$</span>
                    <AnimatedCounter to={3500} duration={1.8} />
                  </div>
                  <div className="text-sm uppercase tracking-widest font-bold text-ddg-paper/80">
                    Por mês com agência
                  </div>
                  <p className="text-sm text-ddg-paper/50 leading-relaxed max-w-xs">
                    O que uma agência média cobra pra fazer <strong className="text-ddg-paper">4 posts</strong>. A gente entrega <strong className="text-ddg-lime">8 + tracking de IA</strong> por R$ 297.
                  </p>
                </div>
              </StaggerItem>
            </StaggerGroup>
          </div>
        </section>

        {/* ===== COMO FUNCIONA — NUMBERED STEPS ===== */}
        <section id="como-funciona" className="bg-ddg-paper">
          <div className="container mx-auto max-w-7xl px-4 lg:px-8 py-24 md:py-32">
            <div className="max-w-3xl mb-14 md:mb-20">
              <Reveal>
                <div className="ddg-bracket mb-5">COMO FUNCIONA</div>
              </Reveal>
              <Reveal delay={0.1}>
                <h2 className="ddg-display text-4xl md:text-6xl text-balance">
                  Você configura 1 vez.<br />
                  <span className="text-ddg-muted">Rodando</span>{" "}
                  <span className="ddg-pill-lime">toda semana.</span>
                </h2>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="text-lg text-ddg-muted mt-5 max-w-2xl leading-relaxed">
                  7 minutos pra deixar tudo rodando. Depois é piloto automático: a engine pesquisa, escreve, otimiza pra Google E pra IA, te avisa no Zap pra aprovar, publica e mede.
                </p>
              </Reveal>
            </div>

            <StaggerGroup className="grid md:grid-cols-2 lg:grid-cols-4 gap-5" stagger={0.1}>
              {STEPS.map((s) => (
                <StaggerItem key={s.n}>
                  <NumberedStep
                    number={s.n}
                    title={s.title}
                    description={s.desc}
                    badge={s.badge}
                    icon={s.icon}
                  />
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>

        {/* ===== FLOW DIAGRAM ===== */}
        <section className="bg-ddg-cream border-y-2 border-ddg-ink">
          <div className="container mx-auto max-w-7xl px-4 lg:px-8 py-20 md:py-28">
            <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
              <Reveal>
                <div className="ddg-bracket mb-4">O PIPELINE</div>
              </Reveal>
              <Reveal delay={0.1}>
                <h2 className="ddg-display text-3xl md:text-5xl">
                  Você responde 15 perguntas. <br className="md:hidden" />
                  <span className="text-ddg-lime-deep">A IA cuida do resto.</span>
                </h2>
              </Reveal>
            </div>
            <Reveal delay={0.2} variant="scale">
              <FlowDiagram />
            </Reveal>
          </div>
        </section>

        {/* ===== STICKY STACK — 3 jeitos antigos vs DDG ===== */}
        <section className="relative bg-ddg-paper">
          <div className="container mx-auto max-w-7xl px-4 lg:px-8 py-24 md:py-32">
            <div className="max-w-3xl mx-auto text-center mb-14 md:mb-20">
              <Reveal>
                <div className="ddg-bracket mb-5">O QUE VOCÊ TÁ FAZENDO HOJE</div>
              </Reveal>
              <Reveal delay={0.1}>
                <h2 className="ddg-display text-4xl md:text-6xl text-balance">
                  3 jeitos antigos.<br />
                  <span className="text-ddg-muted">1 que finalmente</span>{" "}
                  <span className="ddg-pill-lime">faz sentido.</span>
                </h2>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="text-lg text-ddg-muted mt-5">
                  Role pra ver cada caminho. O último resolve sem você precisar abrir mão de mais nada.
                </p>
              </Reveal>
            </div>

            <StickyStackContainer>
              <div className="space-y-5">
                <StickyStackCard
                  index={0}
                  total={4}
                  variant="old"
                  badge="Some quando desliga"
                  title="Tráfego pago: aluguel sem nunca virar dono."
                  description="Liga R$ 5 mil no Meta Ads e Google Ads → entram leads. Desliga → para tudo. Custo só sobe (CPM aumentou 38% em 2025). Você nunca compra audiência — sempre aluga."
                  price="R$ 5.000+"
                  priceLabel="Investimento mensal típico"
                  cons={[
                    "ROAS caindo todo mês (concorrência leiloando)",
                    "Some no segundo que você pausa",
                    "Não constrói SEO nem marca",
                    "Não aparece em IAs generativas",
                  ]}
                />

                <StickyStackCard
                  index={1}
                  total={4}
                  variant="old"
                  badge="Demora 12 meses pra render"
                  title="Agência de SEO: cara, lenta, opaca."
                  description="Contrata uma agência por R$ 3.500/mês. Recebe 4 posts mornos + relatório PDF que ninguém entende. SEO leva 6-12 meses. Você paga 12 vezes antes de ver resultado real."
                  price="R$ 3.500"
                  priceLabel="Mensalidade média"
                  cons={[
                    "4 posts/mês — pouco volume pra ranquear",
                    "Sem padrão editorial real (rotativo de redator)",
                    "Não mede visibility em IAs (nem sabem o que é)",
                    "Contrato 12 meses, cancelamento com multa",
                  ]}
                />

                <StickyStackCard
                  index={2}
                  total={4}
                  variant="old"
                  badge="R$ 10k/mês só de salário"
                  title="Time interno: contratação que vira herança."
                  description="1 redator (R$ 4k) + 1 SEO especialista (R$ 6k) + ferramentas (Semrush R$ 700, Ahrefs R$ 1.500). 6 meses pra contratar, treinar e entregar volume. Custo fixo independente de resultado."
                  price="R$ 10.000+"
                  priceLabel="Custo mensal real"
                  cons={[
                    "Difícil contratar redator técnico bom",
                    "Treinamento de 3-6 meses até produzir",
                    "Encargos, férias, 13º, rescisão",
                    "Não escala — limitado a 8 posts/mês por pessoa",
                  ]}
                />

                <StickyStackCard
                  index={3}
                  total={4}
                  variant="new"
                  badge="A virada"
                  title="DDG Engine: você decide os temas. A engine entrega o resto."
                  description="Configura em 7 minutos. Toda semana você sugere temas que importam pro seu negócio — a engine pesquisa keywords, escreve, otimiza tecnicamente, publica no Google E mede sua marca em 4 IAs. Sem agência. Sem contratação. Você no controle do que conta, automação no que cansa."
                  price="R$ 297"
                  priceLabel="Plano único mensal"
                  pros={[
                    "Você sugere os temas — engine pesquisa keywords + concorrência + intenção",
                    "SEO técnico completo: schema, sitemap, canonical, internal links, GEO",
                    "8 artigos longos + 16 perguntas-respostas/mês (vs 4 da agência)",
                    "Tracking 24/7 no Google E em ChatGPT, Perplexity, Claude, Gemini",
                    "Aprovação WhatsApp em 5s ou modo Auto",
                    "Garantia 90 dias: impressions não cresceram? Devolvemos 100%",
                  ]}
                />
              </div>
            </StickyStackContainer>
          </div>
        </section>

        {/* ===== FEATURES MOSAIC ===== */}
        <section id="features" className="bg-ddg-paper">
          <div className="container mx-auto max-w-7xl px-4 lg:px-8 py-24 md:py-32">
            <div className="max-w-3xl mb-14 md:mb-20">
              <Reveal>
                <div className="ddg-bracket mb-5">O QUE VOCÊ GANHA</div>
              </Reveal>
              <Reveal delay={0.1}>
                <h2 className="ddg-display text-4xl md:text-6xl text-balance">
                  Você decide o que importa.<br />
                  <span className="text-ddg-muted">A engine faz o trabalho pesado.</span>
                </h2>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="text-lg text-ddg-muted mt-4 max-w-2xl">
                  7 capacidades que <strong className="text-ddg-ink">nenhum outro produto BR entrega junto</strong>. Trabalho de SEO sério + escrita editorial + tracking Google E IA. Você no controle dos temas, a engine no controle do trabalho técnico.
                </p>
              </Reveal>
            </div>

            <StaggerGroup className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" stagger={0.08}>
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <StaggerItem key={f.title}>
                    <SpotlightCard className="rounded-xl h-full">
                      <FeatureCard
                        label={f.label}
                        title={f.title}
                        description={f.description}
                        visual={
                          <Icon className="w-14 h-14 text-ddg-ink opacity-30 group-hover:opacity-100 group-hover:text-ddg-lime-deep transition-all duration-300 group-hover:scale-110" />
                        }
                      />
                    </SpotlightCard>
                  </StaggerItem>
                );
              })}
            </StaggerGroup>
          </div>
        </section>

        {/* ===== TESTIMONIALS — DARK ===== */}
        <section className="bg-ddg-ink text-ddg-paper border-y-2 border-ddg-ink">
          <div className="container mx-auto max-w-7xl px-4 lg:px-8 py-24 md:py-32">
            <div className="max-w-3xl mb-12 md:mb-16">
              <Reveal>
                <div className="ddg-bracket text-ddg-lime mb-5">QUEM JÁ TÁ USANDO</div>
              </Reveal>
              <Reveal delay={0.1}>
                <h2 className="ddg-display text-3xl md:text-5xl">
                  Número no painel,<br />
                  <span className="text-ddg-paper/40">não adjetivo no depoimento.</span>
                </h2>
              </Reveal>
            </div>

            <StaggerGroup className="grid md:grid-cols-3 gap-5" stagger={0.12}>
              {TESTIMONIALS.map((t, i) => (
                <StaggerItem key={i}>
                  <div className="p-7 rounded-xl border border-white/10 bg-white/[0.03] h-full flex flex-col">
                    <div className="ddg-pill-lime text-xs mb-5 inline-block">
                      {t.metric}
                    </div>
                    <div className="text-3xl text-ddg-lime mb-3 font-serif leading-none">&ldquo;</div>
                    <p className="text-base md:text-lg text-ddg-paper/90 leading-relaxed flex-1">
                      {t.quote}
                    </p>
                    <div className="mt-6 pt-5 border-t border-white/10">
                      <div className="font-bold text-sm">{t.name}</div>
                      <div className="text-xs text-ddg-paper/50 mt-0.5">{t.role}</div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>

        {/* ===== PRICING — 2-TIER BRUTAL ===== */}
        <section id="pricing" className="bg-ddg-paper">
          <div className="container mx-auto max-w-7xl px-4 lg:px-8 py-24 md:py-32">
            <div className="max-w-3xl mx-auto text-center mb-14 md:mb-20">
              <Reveal>
                <div className="ddg-bracket mb-5">PREÇO TRANSPARENTE</div>
              </Reveal>
              <Reveal delay={0.1}>
                <h2 className="ddg-display text-4xl md:text-6xl text-balance">
                  R$ 9,90 por dia<br />
                  <span className="text-ddg-muted">pra ter</span>{" "}
                  <span className="ddg-pill-lime">agência inteira.</span>
                </h2>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="text-lg text-ddg-muted mt-5 max-w-2xl mx-auto">
                  SEO técnico profundo + escrita editorial + tracking Google + tracking 4 IAs. Tudo por menos do que uma hora do estagiário de marketing.
                </p>
              </Reveal>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Free Trial */}
              <Reveal variant="left">
                <div className="p-8 md:p-10 rounded-2xl border-2 border-ddg-ink bg-ddg-paper h-full flex flex-col">
                  <div className="ddg-bracket mb-4">PRA TESTAR</div>
                  <div className="text-4xl font-black mb-1">Grátis</div>
                  <div className="text-ddg-muted text-sm mb-6">14 dias completos · sem cartão</div>
                  <div className="text-sm text-ddg-muted mb-5 leading-relaxed">
                    Pra você ver o output real antes de pagar. Roda igual ao Pro, com volume reduzido.
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {[
                      "Briefing completo + brand RAG configurado",
                      "Até 4 posts gerados (você vê o nível)",
                      "Diagnóstico de visibility em IA (50 prompts)",
                      "1 site conectado via Cloudflare",
                      "Suporte por email",
                    ].map((it) => (
                      <li key={it} className="flex items-start gap-3 text-sm">
                        <Check className="w-4 h-4 text-ddg-lime-deep mt-0.5 shrink-0" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className="ddg-cta-ghost inline-flex items-center justify-center gap-2 rounded-md px-6 py-3.5 text-base w-full"
                  >
                    Começar trial grátis
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </Reveal>

              {/* Pro */}
              <Reveal variant="right" delay={0.15}>
                <div className="relative p-8 md:p-10 rounded-2xl border-2 border-ddg-ink bg-ddg-ink text-ddg-paper h-full flex flex-col shadow-[10px_10px_0_var(--ddg-lime)]">
                  <div className="absolute -top-3 right-6 ddg-pill-lime text-xs">
                    MAIS ESCOLHIDO
                  </div>
                  <div className="ddg-bracket text-ddg-lime mb-4">PRA RODAR</div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-bold text-ddg-paper/60">R$</span>
                    <AnimatedCounter
                      to={297}
                      duration={1.4}
                      className="text-5xl md:text-6xl font-black tabular-nums text-ddg-paper"
                    />
                    <span className="text-ddg-paper/60 text-sm">/mês</span>
                  </div>
                  <div className="text-ddg-paper/60 text-sm mb-5">PIX ou cartão · cancela quando quiser</div>

                  {/* Âncora de comparação */}
                  <div className="rounded-lg border border-ddg-lime/30 bg-ddg-lime/5 p-3 mb-6">
                    <div className="text-[10px] font-mono text-ddg-lime uppercase tracking-widest mb-1.5">Comparado a</div>
                    <div className="space-y-1 text-xs text-ddg-paper/70">
                      <div className="flex justify-between"><span>Agência média (4 posts/mês)</span><span className="line-through opacity-60">R$ 3.500</span></div>
                      <div className="flex justify-between"><span>Redator freelancer (4 posts)</span><span className="line-through opacity-60">R$ 1.600</span></div>
                      <div className="flex justify-between text-ddg-lime font-bold"><span>DDG Engine (8 posts + tracking)</span><span>R$ 297</span></div>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {[
                      "Você sugere os temas — engine pesquisa keywords + concorrência",
                      "SEO técnico completo: schema, sitemap, canonical, internal links, GEO",
                      "8 artigos longos + 16 perguntas-respostas/mês",
                      "Multi-pass writer: 7 passos editoriais por post",
                      "Tracking 24/7 no Google + ChatGPT, Perplexity, Claude e Gemini",
                      "200 perguntas testadas em IAs por semana (relatório toda 6ª)",
                      "Aprovação WhatsApp em 5s ou modo Auto",
                      "Brand RAG: IA aprende sua voz, casos, diferenciais",
                      "Reverse proxy Cloudflare incluído (sem plugin)",
                      "Suporte WhatsApp humano (não bot)",
                    ].map((it) => (
                      <li key={it} className="flex items-start gap-3 text-sm text-ddg-paper/90">
                        <Check className="w-4 h-4 text-ddg-lime mt-0.5 shrink-0" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                  <Magnet strength={0.18} className="w-full">
                    <Link
                      href="/signup"
                      className="ddg-cta-lime inline-flex items-center justify-center gap-2 rounded-md px-6 py-3.5 text-base w-full"
                    >
                      Começar grátis 14 dias
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Magnet>
                  <p className="text-center text-xs text-ddg-paper/40 mt-3">
                    Depois do trial: R$ 297/mês. Cancela em 1 clique.
                  </p>
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.3}>
              <div className="text-center mt-10 space-y-2">
                <p className="text-sm text-ddg-muted">
                  Múltiplos sites, time grande ou rede de franquias?{" "}
                  <Link href="/contato" className="font-medium text-ddg-ink underline underline-offset-4 hover:text-ddg-lime-deep">
                    Plano Multi sob medida →
                  </Link>
                </p>
                <p className="text-xs text-ddg-muted/70">
                  Garantia: se em 90 dias suas impressions no Google não cresceram, devolvemos 100%.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section id="faq" className="bg-ddg-cream border-t-2 border-ddg-ink">
          <div className="container mx-auto max-w-3xl px-4 lg:px-8 py-24 md:py-32">
            <div className="text-center mb-12">
              <Reveal>
                <div className="ddg-bracket mb-4">DÚVIDAS FREQUENTES</div>
              </Reveal>
              <Reveal delay={0.1}>
                <h2 className="ddg-display text-4xl md:text-5xl">
                  Antes de comprar,<br />
                  <span className="text-ddg-muted">você quer saber.</span>
                </h2>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="text-base text-ddg-muted mt-5 max-w-xl mx-auto">
                  As 8 perguntas que mais aparecem antes do trial. Se faltou alguma, manda no WhatsApp — a gente responde de verdade.
                </p>
              </Reveal>
            </div>
            <StaggerGroup className="space-y-3" stagger={0.06}>
              {FAQ.map(({ q, a }) => (
                <StaggerItem key={q}>
                  <details className="group border-2 border-ddg-ink rounded-xl bg-ddg-paper overflow-hidden">
                    <summary className="cursor-pointer p-5 font-bold flex items-center justify-between hover:bg-ddg-cream list-none transition-colors">
                      <span className="pr-4">{q}</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-open:rotate-90 shrink-0 text-ddg-lime-deep" />
                    </summary>
                    <div className="px-5 pb-5 text-ddg-muted leading-relaxed border-t border-ddg-stone pt-4">
                      {a}
                    </div>
                  </details>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>

        {/* ===== CTA FINAL ===== */}
        <section className="bg-ddg-ink text-ddg-paper relative overflow-hidden">
          <div className="absolute inset-0 ddg-grid-dark pointer-events-none" aria-hidden />
          <div className="container relative mx-auto max-w-5xl px-4 lg:px-8 py-24 md:py-36 text-center">
            <Reveal>
              <div className="ddg-bracket text-ddg-lime mb-6">PRÓXIMO PASSO</div>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="ddg-display text-5xl md:text-7xl lg:text-8xl text-balance">
                7 minutos pra configurar.{" "}
                <span className="block text-ddg-paper/50 mt-2">12 meses pra colher.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.25}>
              <p className="text-lg md:text-xl text-ddg-paper/60 max-w-2xl mx-auto mt-7">
                Cada semana sem publicar é cliente seu virando cliente da concorrência. Comece hoje grátis — sem cartão, sem plugin, sem dor de cabeça.
              </p>
            </Reveal>
            <Reveal delay={0.4}>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Magnet strength={0.3}>
                  <Link
                    href="/signup"
                    className="ddg-cta-lime inline-flex items-center gap-2 rounded-md px-8 py-4 text-lg"
                  >
                    Começar agora
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Magnet>
                <div className="flex items-center gap-3 text-sm font-mono text-ddg-paper/40 uppercase tracking-widest">
                  <LLMBadge name="ChatGPT" status="live" variant="dark" />
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ===== FOOTER — WORDMARK XXL ===== */}
      <footer className="bg-ddg-paper border-t-2 border-ddg-ink">
        <div className="container mx-auto max-w-7xl px-4 lg:px-8 pt-16 pb-6">
          <div className="grid md:grid-cols-4 gap-10 mb-16">
            <div className="md:col-span-2">
              <BrandMark size="lg" />
              <p className="text-sm text-ddg-muted leading-relaxed mt-4 max-w-sm">
                A engine BR de blog automático + visibility em IA generativa. Pra quem quer ser a resposta — não só ranquear no Google.
              </p>
            </div>
            <div>
              <div className="ddg-bracket mb-4">PRODUTO</div>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="#como-funciona" className="hover:text-ddg-lime-deep transition-colors">Como funciona</Link></li>
                <li><Link href="#features" className="hover:text-ddg-lime-deep transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-ddg-lime-deep transition-colors">Preço</Link></li>
                <li><Link href="#faq" className="hover:text-ddg-lime-deep transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <div className="ddg-bracket mb-4">EMPRESA</div>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/termos" className="hover:text-ddg-lime-deep transition-colors">Termos</Link></li>
                <li><Link href="/privacidade" className="hover:text-ddg-lime-deep transition-colors">Privacidade</Link></li>
                <li><Link href="/contato" className="hover:text-ddg-lime-deep transition-colors">Contato</Link></li>
                <li><Link href="/login" className="hover:text-ddg-lime-deep transition-colors">Entrar</Link></li>
              </ul>
            </div>
          </div>

          {/* Wordmark XXL */}
          <div className="overflow-hidden">
            <Reveal variant="up" duration={1}>
              <WordmarkXXL />
            </Reveal>
          </div>

          <div className="mt-8 pt-6 border-t border-ddg-stone flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="text-xs font-mono text-ddg-muted uppercase tracking-widest">
              © {new Date().getFullYear()} Dose de Growth · Feito no Brasil
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-ddg-muted uppercase tracking-widest">
              <span>PIX</span>
              <span className="text-ddg-lime-deep">●</span>
              <span>LGPD</span>
              <span className="text-ddg-lime-deep">●</span>
              <span>pt-BR</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Hidden — keep BrandMarkInverted in bundle pra futuras dark sections */}
      <div className="sr-only">
        <BrandMarkInverted />
      </div>
    </div>
  );
}

/**
 * CitationChip — pill usado no marquee de citações detectadas.
 * Mostra LLM + marca citada + query.
 */
function CitationChip({
  llm,
  brand,
  query,
}: {
  llm: string;
  brand: string;
  query: string;
}) {
  return (
    <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full border-2 border-ddg-ink bg-ddg-paper shrink-0">
      <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-ddg-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-ddg-lime ddg-pulse" />
        {llm}
      </span>
      <span className="text-xs text-ddg-muted">citou</span>
      <span className="font-black text-sm text-ddg-ink">{brand}</span>
      <span className="text-xs text-ddg-muted">em</span>
      <span className="text-xs italic text-ddg-ink/80 max-w-[260px] truncate">
        &ldquo;{query}&rdquo;
      </span>
    </div>
  );
}
