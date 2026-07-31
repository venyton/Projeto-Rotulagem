"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AppErrorState({
  title = "Não foi possível carregar esta tela",
  description = "Ocorreu um erro inesperado. Tente novamente ou volte para o início.",
  reset,
}: {
  title?: string;
  description?: string;
  reset: () => void;
}) {
  return (
    <main className="app-page flex min-h-[50vh] items-center justify-center" role="alert" aria-live="assertive">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle aria-hidden="true" className="size-5" />
          </div>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" onClick={reset}>
            <RefreshCcw data-icon="inline-start" />
            Tentar novamente
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/">Voltar ao início</Link>
          </Button>
          <p className="basis-full text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </main>
  );
}
