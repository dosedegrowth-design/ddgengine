import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight text-lg">
            DDG Engine
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Início
            </Link>
            <Link href="#pricing" className="hover:text-foreground">
              Planos
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="border-t py-6">
        <div className="container mx-auto max-w-6xl px-4 text-sm text-muted-foreground text-center">
          © {new Date().getFullYear()} DDG Engine · Feito no Brasil
        </div>
      </footer>
    </div>
  );
}
