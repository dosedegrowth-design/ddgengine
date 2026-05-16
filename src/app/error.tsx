"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-6xl">⚠️</div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Algo deu errado</h1>
          <p className="text-muted-foreground mt-2">
            Já fomos notificados e estamos investigando.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground mt-3 font-mono">ID: {error.digest}</p>
          )}
        </div>
        <div className="flex gap-2 justify-center">
          <Button onClick={reset}>Tentar novamente</Button>
          <Button asChild variant="outline">
            <Link href="/">Ir pra home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
