import { getCurrentOrg } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteForm } from "./invite-form";
import { formatRelativeTime } from "@/lib/utils";

export default async function TeamPage() {
  const { org, supabase, user } = await getCurrentOrg();

  const { data: memberships } = await supabase
    .from("org_memberships")
    .select("user_id, role, created_at")
    .eq("organization_id", org.id);

  const { data: invitations } = await supabase
    .from("team_invitations")
    .select("id, email, role, created_at, expires_at, accepted_at, cancelled_at")
    .eq("organization_id", org.id)
    .is("accepted_at", null)
    .is("cancelled_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Convidar pessoa</CardTitle>
          <CardDescription>Mande convite por email pra membros da equipe</CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Membros ({(memberships ?? []).length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-md border">
            <div>
              <div className="font-medium">{user.email}</div>
              <div className="text-xs text-muted-foreground">Você</div>
            </div>
            <Badge variant="default">Owner</Badge>
          </div>
          {(memberships ?? [])
            .filter((m: any) => m.user_id !== user.id)
            .map((m: any) => (
              <div key={m.user_id} className="flex items-center justify-between p-3 rounded-md border">
                <div>
                  <div className="font-medium text-sm">User {String(m.user_id).slice(0, 8)}...</div>
                  <div className="text-xs text-muted-foreground">
                    Desde {formatRelativeTime(m.created_at)}
                  </div>
                </div>
                <Badge variant="outline">{m.role}</Badge>
              </div>
            ))}
        </CardContent>
      </Card>

      {invitations && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Convites pendentes ({invitations.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invitations.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-md border">
                <div>
                  <div className="font-medium text-sm">{inv.email}</div>
                  <div className="text-xs text-muted-foreground">
                    Enviado {formatRelativeTime(inv.created_at)} ·{" "}
                    expira em {formatRelativeTime(inv.expires_at)}
                  </div>
                </div>
                <Badge variant="warning">{inv.role}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
