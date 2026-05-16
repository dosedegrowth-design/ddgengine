import { getCurrentOrg } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function TeamPage() {
  const { org, supabase, user } = await getCurrentOrg();

  const { data: memberships } = await supabase
    .from("org_memberships")
    .select("user_id, role, created_at")
    .eq("organization_id", org.id);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
          <CardDescription>Pessoas com acesso a {org.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
                  <div className="font-medium text-sm">{m.user_id}</div>
                  <div className="text-xs text-muted-foreground">
                    Desde {new Date(m.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <Badge variant="outline">{m.role}</Badge>
              </div>
            ))}
          <p className="text-xs text-muted-foreground pt-2">
            Convite por email: em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
