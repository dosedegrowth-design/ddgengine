"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/auth";
import { createInvitation, cancelInvitation } from "@/lib/team/invitations";

export async function sendTeamInvite(args: { email: string; role: "admin" | "editor" | "viewer" }) {
  const { user, org } = await getCurrentOrg();

  const result = await createInvitation({
    organizationId: org.id,
    email: args.email,
    role: args.role,
    invitedBy: user.id,
    inviterName: (user.user_metadata?.name as string) || user.email!,
    orgName: org.name,
  });

  if ("error" in result && result.error) return { error: result.error };
  revalidatePath("/settings/team");
  return { success: true };
}

export async function cancelInvite(invitationId: string) {
  const { org } = await getCurrentOrg();
  const result = await cancelInvitation(invitationId, org.id);
  revalidatePath("/settings/team");
  return result;
}
