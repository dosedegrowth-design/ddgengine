import { getCurrentOrg } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { org, user } = await getCurrentOrg();

  return (
    <div className="flex min-h-screen">
      <Sidebar orgName={org.name} plan={org.plan} userEmail={user.email ?? ""} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
