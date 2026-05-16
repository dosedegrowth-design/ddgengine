import { getCurrentOrg } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const { user, org } = await getCurrentOrg();
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Seu perfil</CardTitle>
          <CardDescription>Suas informações de acesso</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            email={user.email ?? ""}
            name={(user.user_metadata?.name as string) ?? ""}
            orgName={org.name}
          />
        </CardContent>
      </Card>
    </div>
  );
}
