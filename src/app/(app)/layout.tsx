import { getCurrentOrg } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { org, user } = await getCurrentOrg();

  return (
    <div className="flex min-h-screen">
      <Sidebar orgName={org.name} plan={org.plan} userEmail={user.email ?? ""} />
      <main className="flex-1 min-w-0 pb-16 md:pb-0">{children}</main>
      <MobileNav />
    </div>
  );
}
