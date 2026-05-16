"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { subscribeNewsletter } from "@/app/blog/[orgSlug]/actions";

interface Props {
  orgSlug: string;
  orgName: string;
}

export function NewsletterForm({ orgSlug, orgName }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const r = await subscribeNewsletter({ orgSlug, email });
    setLoading(false);
    if ("error" in r && r.error) toast.error(r.error);
    else {
      setDone(true);
      toast.success("Inscrito! Confirmação no email.");
    }
  }

  if (done) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-6 text-center">
          <Mail className="w-8 h-8 mx-auto text-emerald-600 dark:text-emerald-400 mb-2" />
          <div className="font-medium">Inscrito!</div>
          <p className="text-sm text-muted-foreground mt-1">
            Você receberá os próximos posts de {orgName} no email.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Receba os próximos posts</CardTitle>
        <CardDescription>
          Sem spam. Você cancela quando quiser.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handle} className="flex gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !email.includes("@")}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Inscrever"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
