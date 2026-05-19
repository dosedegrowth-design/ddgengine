import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Cases" };

// Placeholder cases — preencher com clientes piloto reais conforme vão entrando
const CASES = [
  {
    name: "PetDerma",
    vertical: "Clínica veterinária especializada",
    region: "São Paulo · SP",
    metrics: {
      trafego_30d: "+180%",
      citacoes_ia: "+47/sem",
      posts: "32 publicados",
    },
    quote: "Em 90 dias passamos a aparecer no ChatGPT quando alguém pergunta sobre dermatite em cães em SP.",
    status: "Em andamento",
  },
];

export default function CasesPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">
            Conteudai
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Voltar
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-6 py-16">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Quem já está aparecendo
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Empresas brasileiras que conectaram o Conteudai e começaram a aparecer
            no Google e no ChatGPT enquanto dormem.
          </p>
        </header>

        {CASES.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center text-muted-foreground">
              Cases em construção. Primeiros pilotos rodando no momento.
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {CASES.map((c) => (
              <Card key={c.name}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-xl">{c.name}</CardTitle>
                    <Badge variant="outline">{c.status}</Badge>
                  </div>
                  <CardDescription>
                    {c.vertical} · {c.region}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Tráfego</div>
                      <div className="font-semibold mt-1">{c.metrics.trafego_30d}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Citações IA</div>
                      <div className="font-semibold mt-1">{c.metrics.citacoes_ia}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Posts</div>
                      <div className="font-semibold mt-1">{c.metrics.posts}</div>
                    </div>
                  </div>
                  <blockquote className="text-sm italic border-l-2 pl-3 text-muted-foreground">
                    &ldquo;{c.quote}&rdquo;
                  </blockquote>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <Button asChild size="lg">
            <Link href="/signup">
              Seja o próximo case <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
