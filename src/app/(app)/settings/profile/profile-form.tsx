"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "./actions";

interface Props {
  email: string;
  name: string;
  orgName: string;
}

export function ProfileForm({ email, name, orgName }: Props) {
  const [n, setN] = useState(name);
  const [org, setOrg] = useState(orgName);
  const [loading, setLoading] = useState(false);

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const result = await updateProfile({ name: n, orgName: org });
    setLoading(false);
    if ("error" in result && result.error) toast.error(result.error);
    else toast.success("Perfil atualizado");
  }

  return (
    <form onSubmit={handle} className="space-y-4 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} disabled />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Seu nome</Label>
        <Input id="name" value={n} onChange={(e) => setN(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="org">Nome da organização</Label>
        <Input id="org" value={org} onChange={(e) => setOrg(e.target.value)} />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
