import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-7xl font-bold tracking-tighter">404</div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Página não encontrada</h1>
          <p className="text-muted-foreground mt-2">
            Esse link não existe ou foi movido. Volte pra home pra começar.
          </p>
        </div>
        <Button asChild>
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}
