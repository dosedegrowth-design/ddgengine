"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/auth";
import { generateApiKey, revokeApiKey } from "@/lib/api/keys";

export async function createKey(args: {
  orgId: string;
  name: string;
  scopes: ("read" | "write" | "admin")[];
}) {
  const { org, user } = await getCurrentOrg();
  if (org.id !== args.orgId) return { error: "Org não autorizada" };

  // Restringir por plano
  if (org.plan !== "agency" && org.plan !== "native") {
    return { error: "API keys disponíveis nos planos Agência e Native" };
  }

  try {
    const result = await generateApiKey({
      organizationId: args.orgId,
      name: args.name,
      scopes: args.scopes,
      createdBy: user.id,
    });
    revalidatePath("/settings/api-keys");
    return { success: true, plainKey: result.plainKey, prefix: result.prefix };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao gerar chave" };
  }
}

export async function revokeKey(keyId: string) {
  const { org } = await getCurrentOrg();
  const result = await revokeApiKey(keyId, org.id);
  revalidatePath("/settings/api-keys");
  return result;
}
