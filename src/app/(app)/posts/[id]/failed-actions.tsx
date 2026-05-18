"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { deletePostAction } from "@/app/(app)/posts/actions";

export function DeleteFailedPostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function handleDelete() {
    if (!confirm("Apagar esse post falhou? Não dá pra desfazer.")) return;
    start(async () => {
      const r = await deletePostAction(postId);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Post apagado.");
      router.push("/posts");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ddg-ink text-ddg-paper text-sm font-bold hover:bg-ddg-graphite transition-colors disabled:opacity-50"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" /> Apagando…
        </>
      ) : (
        <>
          <Trash2 className="w-4 h-4" /> Apagar
        </>
      )}
    </button>
  );
}
