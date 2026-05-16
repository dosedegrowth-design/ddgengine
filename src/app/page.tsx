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
import { WordmarkXXL } from "@/components/landing/wordmark-xxl";
import { AnimatedCounter } from "@/components/landing/motion/animated-counter";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/landing/motion/reveal";
import { ScrollProgress } from "@/components/landing/motion/scroll-progress";
import { WordReveal } from "@/components/landing/motion/word-reveal";

const STEPS = [
  {
    n: "01",
    badge: "1 minuto",
    title: "Briefing inteligente",
    desc: "15 perguntas. A IA aprende seu negócio, tom de voz, concorrentes e palavras-chave.",
    icon: FileText,
  },
  {
    n: "02",
    badge: "3 minutos",
    title: "Multi-pass writer",
    desc: "7 passos editoriais: pesquisa, estrutura, escrita, otimização SEO, fact-check e GEO.",
    icon: Brain,
  },
  {
    n: "03",
    badge: "5 segundos",
    title: "Aprova no WhatsApp",
    desc: "Recebe o post pronto no Zap. Aprovar, editar ou descartar em 1 clique.",
    icon: MessageCircle,
  },
  {
    n: "04",
    badge: "24/7",
    title: "Publica e trackeia",
    desc: "Vai pro seu site sem plugin. 4 IAs verificam onde sua marca foi citada.",
    icon: Sparkles,
  },
];

const FEATURES = [
  {
    label: "AI Visibility",
    title: "Cite tracking 4 IAs",
    description: "ChatGPT, Perplexity, Claude e Gemini monitorados 24/7. Saiba exatamente onde sua marca aparece nas respostas.",
    icon: Sparkles,
  },
  {
    label: "Multi-pass",
    title: "7 passos editoriais",
    description: "Pesquisa real, estrutura, escrita, SEO técnico, fact-check, GEO e revisão. Post pronto pra publicar.",
    icon: Brain,
  },
  {
    label: "WhatsApp First",
    title: "Aprovação em 1 clique",
    description: "Sem app. Sem painel. Recebe o post no Zap, lê e aprova. Tempo médio: 5 segundos.",
    icon: MessageCircle,
  },
  {
    label: "Reverse Proxy",
    title: "Sem plugin nenhum",
    description: "Cloudflare Worker serve o blog direto em seusite.com.br/blog. Não migra nada, não instala nada.",
    icon: Globe,
  },
  {
    label: "Brand RAG",
    title: "IA que conhece sua marca",
    description: "Cada post passa pelo seu briefing, voz de marca, casos e diferenciais. Não soa genérico.",
    icon: ShieldCheck,
  },
  {
    label: "Imports + APIs",
    title: "Integra com tudo",
    description: "WordPress, Webflow, Shopify, custom. Importa posts antigos, exporta tudo. Você é dono do conteúdo.",
    icon: Zap,
  },
];

const TESTIMONIALS = [
  {
    quote: "Em 30 dias passei a aparecer no ChatGPT em 12 buscas relacionadas ao meu negócio. Não consegui mensurar isso em lugar nenhum antes.",
    name: "Marina S.",
    role: "Founder, e-commerce de cosméticos",
  },
  {
    quote: "Aprovar post no WhatsApp mudou tudo. Antes eu engavetava o blog. Hoje publico 8 posts/mês sem pensar nisso.",
    name: "Rafael C.",
    role: "Diretor, agência B2B",
  },
  {
    quote: "Pago R$ 297 e recebo o que pagaria R$ 4.000 numa agência. E ainda mede coisa que agência nenhuma media.",
    name: "Carla P.",
    role: "CMO, SaaS jurídico",
  },
];

const FAQ = [
  {
    q: "Funciona no meu site (WordPress, Wix, Shopify, custom)?",
    a: "Sim, em qualquer site. Diferente de outras ferramentas, não exigimos plugin. Conecte seu domínio via Cloudflare (grátis) e o blog aparece em seusite.com.br/blog automaticamente.",
  },
  {
    q: "Vai prejudicar meu SEO atual?",
    a: "Pelo contrário. Usamos subdiretório (blog.seusite.com.br é evitado), que transfere autoridade SEO pro seu domínio principal. Casos reais mostram +40% de tráfego ao migrar pra esse modelo.",
  },
  {
    q: "Quanto tempo até ver resultado?",
    a: "SEO leva tempo. Mês 1-2 é foundation. Mês 3-6 começam as primeiras keywords. Mês 6-12 acelera. Visibility em LLMs costuma aparecer já no primeiro mês de publicação consistente.",
  },
  {
    q: "Como funciona a aprovação por WhatsApp?",
    a: "Post pronto: você recebe mensagem no Zap com título, score SEO e 3 botões: Aprovar, Editar, Descartar. Um clique e publica. Tempo médio total: 5 segundos.",
  },
  {
    q: "E se eu não quiser revisar nada?",
    a: "Modo Auto publica direto. 8 quality gates automáticos garantem qualidade. Você só recebe notificação quando publica.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, sem multa, sem burocracia. Os posts publicados ficam no seu site — você é dono do conteúdo, sempre.",
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
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 ddg-grid-light opacity-60 pointer-events-none" aria-hidden />
          <div className="container relative mx-auto max-w-7xl px-4 lg:px-8 pt-16 md:pt-24 pb-20 md:pb-32">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
              {/* Esquerda — copy */}
              <div className="lg:col-span-7 space-y-7">
                <Reveal variant="up" delay={0}>
                  <div className="ddg-bracket inline-block">BR · 2026 · AI VISIBILITY ENGINE</div>
                </Reveal>

                <h1 className="ddg-display text-5xl md:text-7xl lg:text-[5.5rem] leading-[0.95]">
                  <WordReveal
                    text="Sua marca já é citada por IA."
                    delay={0.15}
                    stagger={0.06}
                  />
                  <br />
                  <span className="text-ddg-muted">
                    <WordReveal
                      text="Você só não sabe"
                      delay={0.6}
                      stagger={0.06}
                    />
                  </span>{" "}
                  <span className="relative inline-block">
                    <WordReveal text="por quem." delay={0.9} stagger={0.06} highlight={["por", "quem."]} />
                  </span>
                </h1>

                <Reveal variant="up" delay={1.2}>
                  <p className="text-lg md:text-xl text-ddg-muted max-w-2xl leading-relaxed">
                    <BrandMark size="sm" className="!gap-1" /> escreve, publica e mostra exatamente onde sua marca aparece no <span className="text-ddg-ink font-semibold">ChatGPT, Perplexity, Claude e Gemini</span>.
                  </p>
                </Reveal>

                <Reveal variant="up" delay={1.4}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
                    <Link
                      href="/signup"
                      className="ddg-cta-lime inline-flex items-center gap-2 rounded-md px-6 py-3.5 text-base"
                    >
                      Ver minha visibility grátis
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      href="#como-funciona"
                      className="ddg-cta-ghost inline-flex items-center gap-2 rounded-md px-6 py-3.5 text-base"
                    >
                      Como funciona
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </Reveal>

                <Reveal variant="up" delay={1.6}>
                  <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-mono text-ddg-muted uppercase tracking-widest">
                    <span>Sem cartão</span>
                    <span className="text-ddg-lime-deep">●</span>
                    <span>Sem plugin</span>
                    <span className="text-ddg-lime-deep">●</span>
                    <span>14 dias grátis</span>
                  </div>
                </Reveal>
              </div>

              {/* Direita — mockup dashboard */}
              <Reveal variant="right" delay={0.3} duration={0.8} className="lg:col-span-5">
                <MockupDashboard />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ===== TRUST STRIP ===== */}
        <section className="border-y-2 border-ddg-ink bg-ddg-cream">
          <div className="container mx-auto max-w-7xl px-4 lg:px-8 py-8">
            <Reveal variant="fade">
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
                <div className="ddg-bracket whitespace-nowrap">Monitoramos sua marca em</div>
                <LLMTrustStrip variant="light" />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== PROBLEMA — DARK STATS ===== */}
        <section className="relative bg-ddg-ink text-ddg-paper overflow-hidden">
          <div className="absolute inset-0 ddg-grid-dark pointer-events-none" aria-hidden />
          <div className="container relative mx-auto max-w-7xl px-4 lg:px-8 py-24 md:py-32">
            <div className="max-w-3xl mb-14 md:mb-20">
              <Reveal>
                <div className="ddg-bracket text-ddg-lime mb-5">O CENÁRIO</div>
              </Reveal>
              <Reveal delay={0.1}>
                <h2 className="ddg-display text-4xl md:text-6xl text-balance">
                  O Google parou de ser o único caminho.
                  <span className="block text-ddg-muted mt-2">Você ainda otimiza só pra ele?</span>
                </h2>
              </Reveal>
            </div>

            <StaggerGroup className="grid md:grid-cols-3 gap-10 md:gap-16">
              <StaggerItem>
                <div className="space-y-3">
                  <div
                    className="ddg-stat text-7xl md:text-8xl text-ddg-paper"
                    style={{ fontFamily: 'ui-serif, "Times New Roman", serif' }}
                  >
                    <AnimatedCounter to={73} suffix="%" duration={2} />
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
                    <AnimatedCounter to={4} duration={1.4} />
                    <span className="text-ddg-lime">x</span>
                  </div>
                  <div className="text-sm uppercase tracking-widest font-bold text-ddg-paper/80">
                    Mais alcance
                  </div>
                  <p className="text-sm text-ddg-paper/50 leading-relaxed max-w-xs">
                    Quando sua marca aparece em <strong className="text-ddg-paper">4 IAs</strong> ao invés de só ranquear no Google.
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
                  4 passos.<br />
                  <span className="text-ddg-muted">Você não precisa</span>{" "}
                  <span className="ddg-pill-lime">pensar.</span>
                </h2>
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
                  Briefing entra. <br className="md:hidden" />
                  <span className="text-ddg-lime-deep">Conteúdo + dado</span> saem.
                </h2>
              </Reveal>
            </div>
            <Reveal delay={0.2} variant="scale">
              <FlowDiagram />
            </Reveal>
          </div>
        </section>

        {/* ===== FEATURES MOSAIC ===== */}
        <section id="features" className="bg-ddg-paper">
          <div className="container mx-auto max-w-7xl px-4 lg:px-8 py-24 md:py-32">
            <div className="max-w-3xl mb-14 md:mb-20">
              <Reveal>
                <div className="ddg-bracket mb-5">FEATURES</div>
              </Reveal>
              <Reveal delay={0.1}>
                <h2 className="ddg-display text-4xl md:text-6xl text-balance">
                  O que ninguém faz junto.
                </h2>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="text-lg text-ddg-muted mt-4 max-w-2xl">
                  6 capacidades que combinadas fazem você aparecer onde o seu cliente busca <strong className="text-ddg-ink">hoje</strong> — não só onde buscava ano passado.
                </p>
              </Reveal>
            </div>

            <StaggerGroup className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" stagger={0.08}>
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <StaggerItem key={f.title}>
                    <FeatureCard
                      label={f.label}
                      title={f.title}
                      description={f.description}
                      visual={
                        <Icon className="w-14 h-14 text-ddg-ink opacity-30 group-hover:opacity-100 group-hover:text-ddg-lime-deep transition-all duration-300 group-hover:scale-110" />
                      }
                    />
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
                <div className="ddg-bracket text-ddg-lime mb-5">QUEM USA</div>
              </Reveal>
              <Reveal delay={0.1}>
                <h2 className="ddg-display text-3xl md:text-5xl">
                  Resultado real,<br />
                  <span className="text-ddg-paper/40">não promessa de venda.</span>
                </h2>
              </Reveal>
            </div>

            <StaggerGroup className="grid md:grid-cols-3 gap-5" stagger={0.12}>
              {TESTIMONIALS.map((t, i) => (
                <StaggerItem key={i}>
                  <div className="p-7 rounded-xl border border-white/10 bg-white/[0.03] h-full flex flex-col">
                    <div className="text-3xl text-ddg-lime mb-4 font-serif leading-none">&ldquo;</div>
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
                  Sem letra miúda.<br />
                  <span className="text-ddg-muted">Sem comparação infinita.</span>
                </h2>
              </Reveal>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Free Trial */}
              <Reveal variant="left">
                <div className="p-8 md:p-10 rounded-2xl border-2 border-ddg-ink bg-ddg-paper h-full flex flex-col">
                  <div className="ddg-bracket mb-4">TRIAL</div>
                  <div className="text-3xl font-black mb-2">Grátis</div>
                  <div className="text-ddg-muted text-sm mb-6">14 dias completos · sem cartão</div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {[
                      "Briefing completo + brand RAG",
                      "Até 4 posts gerados",
                      "Visibility básico (50 prompts)",
                      "1 site conectado",
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
                    Começar trial
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
                  <div className="ddg-bracket text-ddg-lime mb-4">PRO</div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-bold text-ddg-paper/60">R$</span>
                    <AnimatedCounter
                      to={297}
                      duration={1.4}
                      className="text-5xl md:text-6xl font-black tabular-nums text-ddg-paper"
                    />
                    <span className="text-ddg-paper/60 text-sm">/mês</span>
                  </div>
                  <div className="text-ddg-paper/60 text-sm mb-6">Quem quer aparecer onde o cliente busca hoje</div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {[
                      "8 artigos + 16 perguntas-respostas/mês",
                      "Visibility completo (200 prompts × 4 IAs)",
                      "Aprovação WhatsApp ou modo Auto",
                      "Multi-pass writer (7 passos)",
                      "Reverse proxy Cloudflare incluído",
                      "1 site · suporte WhatsApp",
                    ].map((it) => (
                      <li key={it} className="flex items-start gap-3 text-sm text-ddg-paper/90">
                        <Check className="w-4 h-4 text-ddg-lime mt-0.5 shrink-0" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className="ddg-cta-lime inline-flex items-center justify-center gap-2 rounded-md px-6 py-3.5 text-base w-full"
                  >
                    Começar grátis 14 dias
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.3}>
              <p className="text-center text-sm text-ddg-muted mt-10">
                Precisa de múltiplos sites ou volume maior?{" "}
                <Link href="/contato" className="font-medium text-ddg-ink underline underline-offset-4 hover:text-ddg-lime-deep">
                  Falar com vendas →
                </Link>
              </p>
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
                  O que você já quis perguntar.
                </h2>
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
                Veja sua visibility{" "}
                <span className="ddg-pill-lime inline-block">em IA</span>{" "}
                <span className="block text-ddg-paper/50 mt-2">hoje. Grátis.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.25}>
              <p className="text-lg md:text-xl text-ddg-paper/60 max-w-2xl mx-auto mt-7">
                14 dias completos. Sem cartão. Sem plugin. Sem dor de cabeça.
              </p>
            </Reveal>
            <Reveal delay={0.4}>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="ddg-cta-lime inline-flex items-center gap-2 rounded-md px-8 py-4 text-lg"
                >
                  Começar agora
                  <ArrowRight className="w-5 h-5" />
                </Link>
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
                A engine BR que publica seu conteúdo e mede sua marca em ChatGPT, Perplexity, Claude e Gemini.
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
