"use client";

/**
 * PostListItem — card de um post na lista /posts.
 *
 * Client Component porque (1) o card inteiro navega pro editor via
 * router.push e (2) o botão "Ver post" abre o blog em nova aba com
 * stopPropagation pra não disparar a navegação do card. Isso evita
 * tanto o erro "Event handlers cannot be passed to Client Component
 * props" (quando era Server Component) quanto o <a> aninhado em <a>.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatRelativeTime } from "@/lib/utils";

interface Props {
  id: string;
  slug: string | null;
  title: string | null;
  typeLabel: string;
  status: string;
  createdAt: string;
  publishedAt: string | null;
  ogImageUrl: string | null;
  orgSlug: string | null;
  /** Domínio do cliente (blog.cliente.com.br) quando conectado; senão null. */
  publicBlogUrl?: string | null;
}

export function PostListItem({
  id,
  slug,
  title,
  typeLabel,
  status,
  createdAt,
  publishedAt,
  ogImageUrl,
  orgSlug,
  publicBlogUrl,
}: Props) {
  const router = useRouter();
  const showViewPost = status === "published" && !!slug && !!orgSlug;
  // Link do cliente (limpo) quando o subdomínio está conectado; senão preview.
  const viewHref = publicBlogUrl ? `${publicBlogUrl}/${slug}` : `/blog/${orgSlug}/${slug}`;

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/posts/${id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/posts/${id}`);
      }}
      className="block p-4 rounded-xl border-2 border-ddg-ink bg-ddg-paper hover:bg-ddg-cream hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--ddg-ink)] transition-all group cursor-pointer"
    >
      <div className="flex items-start gap-4">
        {/* Thumb da imagem hero (ou placeholder lime) */}
        <div className="shrink-0 w-24 h-16 rounded-lg border-2 border-ddg-ink bg-ddg-stone overflow-hidden">
          {ogImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ogImageUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-ddg-lime/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-ddg-lime-deep opacity-50" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-ddg-stone text-ddg-muted">
              {typeLabel}
            </span>
            <StatusBadge status={status} />
          </div>
          <div className="font-bold text-base text-ddg-ink truncate group-hover:text-ddg-lime-deep transition-colors">
            {title ?? "Sem título"}
          </div>
          <div className="text-xs font-mono uppercase tracking-widest text-ddg-muted mt-1.5">
            {status === "published" && publishedAt
              ? `Publicado ${formatRelativeTime(publishedAt)}`
              : `Criado ${formatRelativeTime(createdAt)}`}
          </div>
        </div>
        {showViewPost && (
          <Link
            href={viewHref}
            target="_blank"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border-2 border-ddg-ink text-ddg-ink text-xs font-medium hover:bg-ddg-ink hover:text-ddg-paper transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
            Ver post
          </Link>
        )}
      </div>
    </div>
  );
}
