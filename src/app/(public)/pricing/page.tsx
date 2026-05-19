import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Planos e preços" };

const PLANS = [
  {
    name: "Starter",
    price: 97,
    desc: "Pra começar a aparecer",
    posts: "4 artigos + 8 FAQs/mês",
    visibility: "Tracking básico (50 prompts × 2 IAs/sem)",
    sites: "1 site",
    approval: "Auto-publish",
    support: "Email",
    features: [
      "12 conteúdos/mês",
      "Brand RAG (voz da marca)",
      "8 quality gates automáticos",
      "Schema markup + FAQ",
      "Sitemap + llm.txt",
      "AI Visibility básico",
      "Reverse proxy (sem plugin)",
    ],
    cta: "Começar grátis",
  },
  {
    name: "Light",
    price: 197,
    desc: "Evolução natural",
    posts: "6 artigos + 12 FAQs/mês",
    visibility: "Tracking médio (100 prompts × 3 IAs/sem)",
    sites: "1 site",
    approval: "Auto-publish",
    support: "Email",
    features: [
      "18 conteúdos/mês",
      "Tudo do Starter +",
      "Tracking incluindo Claude",
      "Auditoria semanal automática",
    ],
    cta: "Começar grátis",
  },
  {
    name: "Pro",
    price: 297,
    desc: "Mais escolhido",
    highlight: true,
    posts: "8 artigos + 16 FAQs/mês",
    visibility: "Tracking completo (200 prompts × 4 IAs/sem)",
    sites: "1 site",
    approval: "Auto OU WhatsApp",
    support: "WhatsApp",
    features: [
      "24 conteúdos/mês",
      "Tudo do Light +",
      "Aprovação por WhatsApp 1-clique",
      "AI Visibility com 4 LLMs",
      "Relatório mensal automatizado",
      "Suporte por WhatsApp",
    ],
    cta: "Começar grátis",
  },
  {
    name: "Multi",
    price: 897,
    desc: "Redes e franquias",
    posts: "16 artigos + 32 FAQs/mês × 3 sites",
    visibility: "Tracking completo × 3",
    sites: "Até 3 sites",
    approval: "Auto + WhatsApp",
    support: "WhatsApp prioritário",
    features: [
      "72 conteúdos totais",
      "Tudo do Pro × 3 sites",
      "Brand RAG independente por marca",
      "Suporte prioritário",
      "Onboarding assistido",
    ],
    cta: "Começar grátis",
  },
  {
    name: "Agência",
    price: 1997,
    desc: "Pra agências de marketing",
    posts: "Ilimitado em 30 sites",
    visibility: "Tracking configurável por cliente",
    sites: "Até 30 sites",
    approval: "All",
    support: "Slack dedicado + API",
    features: [
      "30 sites incluídos",
      "White-label completo",
      "API pública pra integração",
      "Brand voice individual por cliente",
      "Revenue share automático",
      "Dashboard multi-tenant",
    ],
    cta: "Falar com vendas",
  },
];

const COMPARISON_ROWS = [
  { label: "Artigos longos/mês", values: ["4", "6", "8", "16×3", "Ilimitado"] },
  { label: "FAQs/mês", values: ["8", "12", "16", "32×3", "Ilimitado"] },
  { label: "Sites incluídos", values: ["1", "1", "1", "3", "30"] },
  { label: "AI Visibility — IAs monitoradas", values: ["2", "3", "4", "4×3", "Configurável"] },
  { label: "Aprovação WhatsApp", values: ["—", "—", "✓", "✓", "✓"] },
  { label: "Brand RAG", values: ["Básico", "Médio", "Completo", "Completo×3", "Por site"] },
  { label: "Relatório mensal PDF", values: ["—", "✓", "✓", "✓", "✓"] },
  { label: "GSC + GA4 integration", values: ["✓", "✓", "✓", "✓", "✓"] },
  { label: "Reverse proxy (sem plugin)", values: ["✓", "✓", "✓", "✓", "✓"] },
  { label: "White-label", values: ["—", "—", "—", "—", "✓"] },
  { label: "API pública", values: ["—", "—", "—", "—", "✓"] },
  { label: "Suporte", values: ["Email", "Email", "WhatsApp", "Prioritário", "Slack dedicado"] },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">
            Conteudai
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/sobre" className="text-muted-foreground hover:text-foreground">
              Sobre
            </Link>
            <Link href="/cases" className="text-muted-foreground hover:text-foreground">
              Cases
            </Link>
            <Button asChild size="sm">
              <Link href="/signup">Começar grátis</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-6 py-16 space-y-16">
        <section className="text-center max-w-2xl mx-auto space-y-4">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Preço transparente. Sem letras miúdas.
          </h1>
          <p className="text-lg text-muted-foreground">
            Comece com R$ 97. Cresça quando fizer sentido. Cancele quando quiser. 14 dias grátis pra testar.
          </p>
        </section>

        {/* Cards */}
        <section className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={plan.highlight ? "border-foreground/40 shadow-lg relative" : ""}
            >
              {plan.highlight && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  Mais escolhido
                </Badge>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.desc}</CardDescription>
                <div className="pt-3">
                  <span className="text-3xl font-semibold">R$ {plan.price}</span>
                  <span className="text-muted-foreground text-sm">/mês</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="font-medium">{plan.posts}</p>
                <ul className="space-y-1.5 text-muted-foreground">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="w-full mt-4"
                  variant={plan.highlight ? "default" : "outline"}
                >
                  <Link href="/signup">{plan.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Comparativo */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-6 text-center">
            Comparativo completo
          </h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left p-3 font-medium">Recurso</th>
                  {PLANS.map((p) => (
                    <th key={p.name} className="text-center p-3 font-medium">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                    <td className="p-3 text-muted-foreground">{row.label}</td>
                    {row.values.map((v, idx) => (
                      <td key={idx} className="p-3 text-center">
                        {v === "✓" ? (
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                        ) : v === "—" ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          v
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Annual */}
        <section className="bg-muted/30 rounded-xl p-8 text-center space-y-3 border">
          <Badge variant="secondary">Plano anual</Badge>
          <h3 className="text-2xl font-semibold tracking-tight">
            Anual com 20% de desconto
          </h3>
          <p className="text-muted-foreground">
            Pague 12 meses adiantado e economize. Pro fica R$ 237/mês.
          </p>
        </section>

        {/* Garantia */}
        <section className="text-center max-w-2xl mx-auto space-y-3">
          <h3 className="text-2xl font-semibold tracking-tight">
            Garantia de 90 dias
          </h3>
          <p className="text-muted-foreground">
            Se em 90 dias suas impressões no Google Search Console não crescerem, devolvemos 100%
            do valor pago. Tão simples quanto.
          </p>
        </section>

        {/* CTA final */}
        <section className="text-center">
          <Button asChild size="xl">
            <Link href="/signup">
              Começar grátis (14 dias) <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground mt-3">
            Sem plugin · Cancele quando quiser
          </p>
        </section>
      </main>
    </div>
  );
}
