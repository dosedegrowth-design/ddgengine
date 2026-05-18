"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload, ImageIcon } from "lucide-react";
import { uploadCustomHeroImage } from "./image-actions";

interface Props {
  postId: string;
  initialUrl: string | null;
  postTitle: string | null;
}

export function HeroImagePicker({ postId, initialUrl, postTitle }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl);

  function pickFile() {
    if (pending) return;
    inputRef.current?.click();
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validações client-side (UX rápido — server valida de novo)
    if (!/^image\/(webp|png|jpe?g)$/.test(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 10MB.");
      return;
    }

    // Preview otimista
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    const fd = new FormData();
    fd.append("image", file);

    start(async () => {
      toast.info("Enviando imagem…");
      const r = await uploadCustomHeroImage(postId, fd);
      if ("error" in r && r.error) {
        toast.error(r.error);
        setPreviewUrl(initialUrl); // volta ao anterior
        return;
      }
      toast.success("Imagem atualizada!");
      // URL no Supabase (mais estável que blob: do preview)
      if ("url" in r) setPreviewUrl(r.url);
      router.refresh();
    });

    // Reset input pra permitir re-selecionar o mesmo arquivo
    if (e.target) e.target.value = "";
  }

  return (
    <div className="relative rounded-2xl border-2 border-ddg-ink overflow-hidden bg-ddg-stone">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={postTitle ?? "Imagem do post"}
          className="w-full h-auto block"
          loading="lazy"
        />
      ) : (
        <div className="aspect-[3/2] w-full bg-ddg-lime/10 flex items-center justify-center">
          <div className="text-center px-6">
            <ImageIcon className="w-10 h-10 text-ddg-lime-deep/60 mx-auto mb-3" />
            <p className="text-sm text-ddg-muted">
              A engine vai gerar uma imagem em alguns segundos.
            </p>
            <p className="text-xs text-ddg-muted mt-1">
              Ou se preferir, suba uma sua agora:
            </p>
          </div>
        </div>
      )}

      {/* Overlay com ações (sempre visível) */}
      <div className="absolute top-3 right-3 flex gap-2">
        <button
          type="button"
          onClick={pickFile}
          disabled={pending}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-ddg-paper text-ddg-ink text-xs font-bold border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-wait disabled:hover:shadow-[3px_3px_0_var(--ddg-ink)] disabled:hover:translate-y-0"
        >
          {pending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Enviando…
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" />
              {previewUrl ? "Trocar imagem" : "Subir imagem"}
            </>
          )}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={onChange}
        className="hidden"
        disabled={pending}
      />
    </div>
  );
}
