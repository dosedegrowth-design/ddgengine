/**
 * Menu de categorias do blog — usado no header de /blog/{org}
 * e /blog/{org}/categoria/{slug}.
 *
 * Server Component (sem interatividade — só links).
 */
import Link from "next/link";

interface Props {
  orgSlug: string;
  categories: Array<{ name: string; slug: string }>;
  activeCatSlug?: string;
}

export function CategoryNav({ orgSlug, categories, activeCatSlug }: Props) {
  if (categories.length === 0) return null;

  return (
    <nav
      className="flex flex-wrap gap-2 pb-6 border-b border-border"
      aria-label="Categorias do blog"
    >
      <Link
        href={`/blog/${orgSlug}`}
        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          !activeCatSlug
            ? "bg-foreground text-background border-foreground"
            : "bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground"
        }`}
      >
        Todos
      </Link>
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/blog/${orgSlug}/categoria/${c.slug}`}
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            activeCatSlug === c.slug
              ? "bg-foreground text-background border-foreground"
              : "bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground"
          }`}
        >
          {c.name}
        </Link>
      ))}
    </nav>
  );
}
