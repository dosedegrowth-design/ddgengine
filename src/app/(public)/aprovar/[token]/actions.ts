"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { verifyApprovalToken } from "@/lib/whatsapp/notifications";

export async function approveByToken(token: string) {
  const postId = verifyApprovalToken(token);
  if (!postId) return { error: "Link inválido ou expirado" };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("posts")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      approval_method: "public_link",
    })
    .eq("id", postId);
  if (error) return { error: error.message };

  return { success: true };
}

export async function rejectByToken(token: string) {
  const postId = verifyApprovalToken(token);
  if (!postId) return { error: "Link inválido ou expirado" };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("posts")
    .update({ status: "archived", approval_method: "public_link" })
    .eq("id", postId);
  if (error) return { error: error.message };

  return { success: true };
}
