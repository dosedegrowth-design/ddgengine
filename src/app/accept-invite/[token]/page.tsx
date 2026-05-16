import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { createServiceClient, createClient } from "@/lib/supabase/server";
import { acceptInvitation } from "@/lib/team/invitations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AcceptInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;

  const adminSupabase = createServiceClient();
  const { data: invite } = await adminSupabase
    .from("team_invitations")
    .select("*, organizations(name, slug)")
    .eq("token", token)
    .maybeSingle();

  if (!invite) notFound();
  if (invite.accepted_at) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <Check className="w-10 h-10 mx-auto text-emerald-500" />
            <CardTitle>Convite já aceito</CardTitle>
            <CardDescription>Você já faz parte desta organização</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard">Ir pro painel</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (invite.cancelled_at || new Date(invite.expires_at as string) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>Convite expirado</CardTitle>
            <CardDescription>Peça pra pessoa enviar um novo</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/">Voltar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verifica sessão
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/signup?invite=${token}&email=${encodeURIComponent(invite.email as string)}`);
  }

  // Se email não bate, avisa
  if (user.email?.toLowerCase() !== (invite.email as string).toLowerCase()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>Email não bate</CardTitle>
            <CardDescription>
              Este convite foi enviado pra <strong>{invite.email}</strong>, mas você está logado
              como <strong>{user.email}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/logout">Sair e tentar de novo</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Aceita e redireciona
  const result = await acceptInvitation(token, user.id);
  if ("error" in result && result.error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>Erro ao aceitar</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  redirect("/dashboard?welcome=team");
}
