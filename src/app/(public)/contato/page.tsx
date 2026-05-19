import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Contato" };

export default function ContatoPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto max-w-4xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">
            Conteudai
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Voltar
          </Link>
        </div>
      </header>
      <main className="container mx-auto max-w-3xl px-6 py-16 space-y-8">
        <header className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight">Fale com a gente</h1>
          <p className="text-muted-foreground mt-2">
            Suporte rápido, em português, de gente brasileira.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <Mail className="w-6 h-6 mb-2" />
              <CardTitle className="text-base">Email</CardTitle>
              <CardDescription>Para dúvidas, suporte e parcerias</CardDescription>
            </CardHeader>
            <CardContent>
              <a href="mailto:contato@conteudai.com.br" className="font-mono text-sm hover:underline">
                contato@conteudai.com.br
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <MessageCircle className="w-6 h-6 mb-2" />
              <CardTitle className="text-base">WhatsApp</CardTitle>
              <CardDescription>Suporte rápido pra clientes Pro+</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="font-mono text-sm">+55 (11) ... (em breve)</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Phone className="w-6 h-6 mb-2" />
              <CardTitle className="text-base">DPO / LGPD</CardTitle>
              <CardDescription>Encarregado de proteção de dados</CardDescription>
            </CardHeader>
            <CardContent>
              <a href="mailto:dpo@conteudai.com.br" className="font-mono text-sm hover:underline">
                dpo@conteudai.com.br
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por trás</CardTitle>
              <CardDescription>Operado pela Dose de Growth</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Agência brasileira que constrói automação e IA pra PMEs desde 2024.
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
