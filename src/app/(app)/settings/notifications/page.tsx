import { getCurrentOrg } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationPrefsForm } from "./notifications-form";

export default async function NotificationsSettingsPage() {
  const { org } = await getCurrentOrg();
  const prefs = (org as any).notification_prefs ?? {
    channels: { email: true, whatsapp: false },
    events: {
      post_pending_review: true,
      post_published: true,
      monthly_report: true,
      ai_visibility_milestone: true,
      billing: true,
      technical_issue: true,
    },
    quiet_hours: { enabled: false, start: "22:00", end: "08:00" },
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notificações</CardTitle>
          <CardDescription>Configure como e quando você quer ser avisado</CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationPrefsForm
            orgId={org.id}
            phone={(org as any).contact_phone ?? ""}
            prefs={prefs}
          />
        </CardContent>
      </Card>
    </div>
  );
}
