"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requestPasswordReset } from "./actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      setSent(true);
      toast.success("Email enviado. Veja sua caixa de entrada.");
    }
  }

  if (sent) {
    return (
      <Card className="border-border/60 shadow-none">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">Email enviado</CardTitle>
          <CardDescription>
            Se essa conta existe, em alguns minutos chega um link pra redefinir sua senha.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Não recebeu? Verifique a pasta de spam.
          </p>
          <Button asChild className="w-full" variant="outline">
            <Link href="/login">Voltar pro login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-none">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-semibold tracking-tight">Esqueci a senha</CardTitle>
        <CardDescription>Vamos mandar um link pra você redefinir.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="voce@empresa.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Enviar link de recuperação"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="hover:underline">
              Voltar pro login
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
