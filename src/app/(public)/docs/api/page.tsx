import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Docs da API" };

export default function ApiDocsPage() {
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

      <main className="container mx-auto max-w-3xl px-6 py-16 space-y-12">
        <header className="space-y-3">
          <Badge variant="outline">v1</Badge>
          <h1 className="text-4xl font-semibold tracking-tight">Documentação da API</h1>
          <p className="text-muted-foreground">
            REST JSON. Bearer auth. Disponível nos planos <Badge variant="outline">Agência</Badge>{" "}
            e <Badge variant="outline">Native</Badge>.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Autenticação</h2>
          <p className="text-muted-foreground">
            Gere uma API key em <Link href="/settings/api-keys" className="underline">Settings → API
            Keys</Link>. Use no header:
          </p>
          <Code>
            {`Authorization: Bearer ddge_live_xxxxxxxxxxxxxxxxxxxxxxxxxx`}
          </Code>
          <p className="text-sm text-muted-foreground">
            Formato: <code className="font-mono bg-muted px-1 rounded">ddge_&lt;env&gt;_&lt;random&gt;</code>.
            Em ambiente de produção: <code className="font-mono bg-muted px-1 rounded">live</code>.
            Em testes: <code className="font-mono bg-muted px-1 rounded">test</code>.
          </p>
          <p className="text-sm text-muted-foreground">
            Scopes disponíveis: <code className="font-mono bg-muted px-1 rounded">read</code>,{" "}
            <code className="font-mono bg-muted px-1 rounded">write</code>,{" "}
            <code className="font-mono bg-muted px-1 rounded">admin</code>.
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold tracking-tight">Endpoints</h2>

          <Endpoint
            method="GET"
            path="/api/v1/sites"
            description="Lista sites da sua organização"
            scope="read"
            example={`curl https://app.conteudai.com.br/api/v1/sites \\
  -H "Authorization: Bearer ddge_live_..."

{
  "data": [
    {
      "id": "uuid",
      "domain": "meusite.com.br",
      "status": "active",
      "stack_detected": "wordpress",
      "audit_score": 82,
      "has_cloudflare": true,
      "vertical": "ecommerce",
      "created_at": "2025-..."
    }
  ]
}`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/posts?site_id=X&status=published&limit=50"
            description="Lista posts (filtros opcionais)"
            scope="read"
            example={`curl "https://app.conteudai.com.br/api/v1/posts?status=published&limit=10" \\
  -H "Authorization: Bearer ddge_live_..."

{
  "data": [
    {
      "id": "uuid",
      "site_id": "uuid",
      "slug": "como-tratar-dermatite",
      "title": "Como tratar dermatite em cães",
      "type": "long_form",
      "status": "published",
      "published_at": "2025-...",
      "cost_usd": 0.087
    }
  ]
}`}
          />

          <Endpoint
            method="POST"
            path="/api/v1/posts"
            description="Dispara geração de post (async, retorna 202)"
            scope="write"
            example={`curl -X POST https://app.conteudai.com.br/api/v1/posts \\
  -H "Authorization: Bearer ddge_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "site_id": "uuid",
    "type": "long_form",
    "topic": "tratamento de dermatite em cães",
    "target_keyword": "dermatite cão",
    "mode": "multi_pass"
  }'

{ "data": { "status": "queued", "message": "Geração enfileirada" } }`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/metrics?site_id=X&days=30"
            description="Métricas diárias do site"
            scope="read"
            example={`curl "https://app.conteudai.com.br/api/v1/metrics?site_id=uuid&days=30" \\
  -H "Authorization: Bearer ddge_live_..."

{
  "data": [
    {
      "date": "2025-05-15",
      "pageviews": 247,
      "sessions": 198,
      "gsc_impressions": 4231,
      "gsc_clicks": 87,
      "ai_citations": 3
    }
  ]
}`}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">Rate limiting</h2>
          <p className="text-muted-foreground">
            Padrão: 60 requisições por minuto por API key. Pra limites maiores, fale com a gente.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">Erros</h2>
          <div className="space-y-2 text-sm">
            <Row code="401" desc="Token ausente ou inválido" />
            <Row code="403" desc="Scope insuficiente ou recurso de outra org" />
            <Row code="404" desc="Recurso não encontrado" />
            <Row code="400" desc="Parâmetros inválidos" />
            <Row code="500" desc="Erro interno (já notificados)" />
          </div>
        </section>

        <section className="text-center pt-8">
          <Button asChild size="lg">
            <Link href="/settings/api-keys">Gerar API Key</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}

function Endpoint({
  method,
  path,
  description,
  scope,
  example,
}: {
  method: string;
  path: string;
  description: string;
  scope: string;
  example: string;
}) {
  const methodColor =
    method === "GET" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400" :
    method === "POST" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
    "bg-muted";
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${methodColor}`}>{method}</span>
          <code className="font-mono text-sm flex-1 break-all">{path}</code>
          <Badge variant="outline" className="text-xs">{scope}</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Code>{example}</Code>
      </CardContent>
    </Card>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="text-xs font-mono bg-muted/40 border rounded-lg p-4 overflow-x-auto">
      <code>{children}</code>
    </pre>
  );
}

function Row({ code, desc }: { code: string; desc: string }) {
  return (
    <div className="flex gap-3 items-start">
      <code className="font-mono font-bold w-12">{code}</code>
      <span className="text-muted-foreground">{desc}</span>
    </div>
  );
}
