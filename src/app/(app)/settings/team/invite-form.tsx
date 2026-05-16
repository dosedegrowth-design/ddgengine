"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendTeamInvite } from "./actions";

export function InviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [pending, start] = useTransition();

  function submit() {
    if (!email.trim()) return toast.error("Email obrigatório");
    start(async () => {
      const r = await sendTeamInvite({ email: email.trim(), role });
      if ("error" in r && r.error) toast.error(r.error);
      else {
        toast.success("Convite enviado por email");
        setEmail("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-[1fr_140px_auto] gap-2 items-end">
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colega@empresa.com.br"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label>Permissão</Label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            disabled={pending}
          >
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <Button onClick={submit} disabled={pending || !email.trim()}>
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          Enviar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Convite expira em 7 dias. Owner sempre é você (não pode ser transferido por aqui).
      </p>
    </div>
  );
}
