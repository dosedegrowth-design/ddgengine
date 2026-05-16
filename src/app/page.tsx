import Link from "next/link";
import { ArrowRight, Bot, Check, Globe, MessageCircle, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DIFERENCIAIS = [
  {
    icon: Globe,
    title: "Funciona em qualquer site",
    desc: "WordPress, Wix, Webflow, Shopify, custom. Sem plugin, sem migração. Conecta via DNS em 2 minutos.",
  },
  {
    icon: MessageCircle,
    title: "Aprovação por WhatsApp",
    desc: "Recebe o post pronto no WhatsApp e aprova com 1 clique. Sem app, sem painel, sem fricção.",
  },
  {
    icon: Sparkles,
    title: "Mede sua presença em IA",
    desc: "Veja em números quantas vezes sua marca foi citada no ChatGPT, Perplexity, Claude e Gemini.",
  },
  {
    icon: Bot,
    title: "Briefing inteligente",
    desc: "15 perguntas em 5 minutos. A IA aprende seu negócio, tom de voz, concorrentes — e nunca mais erra.",
  },
  {
    icon: ShieldCheck,
    title: "Auditoria antes de cobrar",
    desc: "Análise técnica completa do seu site no cadastro. Você sabe o que esperar antes de pagar.",
  },
  {
    icon: Zap,
    title: "100% brasileiro",
    desc: "PIX, suporte em português, LGPD compliant. Feito pra quem entende o mercado daqui.",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: 97,
    desc: "Pra começar a ver funcionando",
    posts: "4 artigos + 8 perguntas-respostas",
    features: [
      "Auto-publicação",
      "AI Visibility básico (50 prompts/sem)",
      "1 site",
      "Suporte por email",
    ],
    cta: "Começar grátis",
    highlight: false,
  },
  {
    name: "Light",
    price: 197,
    desc: "Mais volume, mesmo modelo",
    posts: "6 artigos + 12 perguntas-respostas",
    features: [
      "Auto-publicação",
      "AI Visibility médio (100 prompts/sem)",
      "1 site",
      "Suporte por email",
    ],
    cta: "Começar grátis",
    highlight: false,
  },
  {
    name: "Pro",
    price: 297,
    desc: "O sweet spot pra maioria",
    posts: "8 artigos + 16 perguntas-respostas",
    features: [
      "Auto OU aprovação WhatsApp",
      "AI Visibility completo (200 × 4 IAs)",
      "1 site",
      "Suporte WhatsApp",
    ],
    cta: "Começar grátis",
    highlight: true,
  },
  {
    name: "Multi",
    price: 897,
    desc: "Redes e franquias",
    posts: "16 artigos + 32 perguntas (por site × 3)",
    features: [
      "Tudo do Pro × 3 sites",
      "Brand RAG avançado",
      "Prioridade na fila",
      "Suporte prioritário",
    ],
    cta: "Falar com vendas",
    highlight: false,
  },
];

const FAQ = [
  {
    q: "Funciona no meu site (WordPress, Wix, etc)?",
    a: "Sim, funciona em qualquer site. Diferente de outras ferramentas, não exigimos instalação de plugin. Conecte seu domínio via Cloudflare (grátis) e o blog aparece em seusite.com.br/blog automaticamente.",
  },
  {
    q: "Vai prejudicar meu SEO atual?",
    a: "Pelo contrário. Usamos a técnica de subdiretório (blog.seusite.com.br é evitado), que transfere autoridade SEO pro seu domínio principal. Casos reais mostram +40% de tráfego ao migrar pra esse modelo.",
  },
  {
    q: "Quanto tempo até ver resultado?",
    a: "SEO leva tempo. Mês 1-2 é foundation. Mês 3-6 começam as primeiras keywords ranqueando. Mês 6-12 acelera. Oferecemos garantia: se em 90 dias suas impressions no Google não cresceram, devolvemos 100%.",
  },
  {
    q: "Como funciona a aprovação por WhatsApp?",
    a: "Quando o post está pronto, você recebe uma mensagem no WhatsApp com título, score SEO e 3 botões: Aprovar, Editar ou Descartar. Um clique e publica. Tempo total de aprovação: 5 segundos.",
  },
  {
    q: "E se eu não quiser revisar nada?",
    a: "Modo Auto publica direto sem você olhar. 8 quality gates automáticos garantem qualidade. Você só recebe notificação quando publica.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, sem multa, sem burocracia. Os posts publicados ficam no seu site — você é dono do conteúdo, sempre.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight text-lg">
            DDG Engine
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <Link href="#como-funciona" className="text-muted-foreground hover:text-foreground transition-colors">
              Como funciona
            </Link>
            <Link href="#diferenciais" className="text-muted-foreground hover:text-foreground transition-colors">
              Diferenciais
            </Link>
            <Link href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Planos
            </Link>
            <Link href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="container mx-auto max-w-6xl px-4 py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Badge variant="secondary" className="inline-flex">
              <Sparkles className="w-3 h-3 mr-1" />
              A primeira plataforma brasileira de visibilidade em IA
            </Badge>
            <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-balance leading-[1.05]">
              Seu site responde perguntas enquanto você dorme.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground text-balance leading-relaxed">
              Conecte seu site, preencha um briefing de 7 minutos.
              A IA escreve, otimiza e publica conteúdo no seu domínio.
              Aparece no Google <span className="text-foreground font-medium">e no ChatGPT</span>.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Button asChild size="xl">
                <Link href="/signup">
                  Começar grátis (14 dias)
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link href="#como-funciona">Ver como funciona</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Sem cartão. Sem plugin. Sem código. Em 7 minutos rodando.
            </p>
          </div>
        </section>

        {/* Problema */}
        <section className="bg-muted/30 border-y">
          <div className="container mx-auto max-w-6xl px-4 py-20">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
                Quando alguém pergunta no ChatGPT sobre o seu setor, seu nome aparece?
              </h2>
              <p className="text-muted-foreground text-lg">
                70% das buscas por IA já são no ChatGPT. Se sua marca não aparece nas respostas, você é invisível.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { t: "Não tem tempo", d: "Você sabe que precisa de blog. Mas escrever 1 post por semana leva 3 horas. Você não tem 12h/mês." },
                { t: "Não sabe SEO", d: "Sitemap, schema, canonical, internal links, Core Web Vitals — coisas que ninguém te ensinou." },
                { t: "Não sabe se aparece", d: "Quando alguém pergunta pra IA, sua marca tá citada? Você não tem como saber. Sem dado." },
              ].map(({ t, d }) => (
                <Card key={t} className="border-border/60">
                  <CardHeader>
                    <CardTitle className="text-lg">{t}</CardTitle>
                    <CardDescription className="leading-relaxed">{d}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="container mx-auto max-w-6xl px-4 py-20">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <Badge variant="outline" className="mb-4">
              Em 7 minutos
            </Badge>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              Conecta. Configura. Aparece.
            </h2>
            <p className="text-muted-foreground text-lg">
              Sem plugin pra instalar. Sem código. Sem migração.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                n: "1",
                t: "Conecte seu site",
                d: "Cola a URL. A gente detecta sua stack, audita seu SEO atual, e gera um Cloudflare Worker que serve o blog em seusite.com.br/blog. Sem plugin.",
                time: "2 min",
              },
              {
                n: "2",
                t: "Preenche o briefing",
                d: "15 perguntas estruturadas: o que sua empresa faz, voz da marca, concorrentes, palavras-chave. A IA aprende.",
                time: "5 min",
              },
              {
                n: "3",
                t: "A IA cuida do resto",
                d: "Toda semana: pesquisa, escreve, otimiza pra Google E pra ChatGPT, publica, mede. Você só vê os resultados.",
                time: "0 min",
              },
            ].map(({ n, t, d, time }) => (
              <div key={n} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                    {n}
                  </div>
                  <Badge variant="secondary" className="ml-auto">{time}</Badge>
                </div>
                <h3 className="text-xl font-semibold tracking-tight">{t}</h3>
                <p className="text-muted-foreground leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Diferenciais */}
        <section id="diferenciais" className="bg-muted/30 border-y">
          <div className="container mx-auto max-w-6xl px-4 py-20">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
                O que ninguém faz junto.
              </h2>
              <p className="text-muted-foreground text-lg">
                A combinação que importa — não apenas mais uma feature.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {DIFERENCIAIS.map(({ icon: Icon, title, desc }) => (
                <Card key={title} className="border-border/60">
                  <CardHeader>
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription className="leading-relaxed">{desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="container mx-auto max-w-6xl px-4 py-20">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              Preço transparente. Margem honesta.
            </h2>
            <p className="text-muted-foreground text-lg">
              Comece com R$ 97. Cresça quando fizer sentido.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.highlight
                    ? "border-foreground/40 shadow-lg relative"
                    : "border-border/60"
                }
              >
                {plan.highlight && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Mais escolhido
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.desc}</CardDescription>
                  <div className="pt-4">
                    <span className="text-4xl font-semibold">R$ {plan.price}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm font-medium">{plan.posts}</p>
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full" variant={plan.highlight ? "default" : "outline"}>
                    <Link href="/signup">{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            Todos os planos: 14 dias grátis · Sem cartão · Cancele quando quiser
          </p>
        </section>

        {/* FAQ */}
        <section id="faq" className="bg-muted/30 border-y">
          <div className="container mx-auto max-w-3xl px-4 py-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
                Perguntas frequentes
              </h2>
            </div>
            <div className="space-y-4">
              {FAQ.map(({ q, a }) => (
                <details key={q} className="group border rounded-lg bg-card">
                  <summary className="cursor-pointer p-5 font-medium flex items-center justify-between hover:bg-accent/30 rounded-lg list-none">
                    <span>{q}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="px-5 pb-5 text-muted-foreground leading-relaxed">
                    {a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="container mx-auto max-w-6xl px-4 py-20">
          <Card className="border-foreground/20 bg-gradient-to-br from-card to-muted/40">
            <CardContent className="p-12 md:p-16 text-center space-y-6">
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-balance">
                Em 7 minutos seu blog tá rodando.
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                14 dias grátis. Sem cartão. Sem plugin. Sem dor de cabeça.
              </p>
              <Button asChild size="xl">
                <Link href="/signup">
                  Começar agora <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto max-w-6xl px-4 py-10 grid md:grid-cols-4 gap-8">
          <div>
            <div className="font-semibold tracking-tight mb-2">DDG Engine</div>
            <p className="text-sm text-muted-foreground">
              Visibilidade automática no Google e ChatGPT.
            </p>
          </div>
          <div>
            <div className="text-sm font-medium mb-3">Produto</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#como-funciona" className="hover:text-foreground">Como funciona</Link></li>
              <li><Link href="#diferenciais" className="hover:text-foreground">Diferenciais</Link></li>
              <li><Link href="#pricing" className="hover:text-foreground">Planos</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-medium mb-3">Empresa</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/termos" className="hover:text-foreground">Termos</Link></li>
              <li><Link href="/privacidade" className="hover:text-foreground">Privacidade</Link></li>
              <li><Link href="/contato" className="hover:text-foreground">Contato</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-medium mb-3">Dose de Growth</div>
            <p className="text-sm text-muted-foreground">
              Feito no Brasil. PIX, suporte em pt-BR, LGPD compliant.
            </p>
          </div>
        </div>
        <div className="border-t">
          <div className="container mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} DDG Engine · Dose de Growth
          </div>
        </div>
      </footer>
    </div>
  );
}
