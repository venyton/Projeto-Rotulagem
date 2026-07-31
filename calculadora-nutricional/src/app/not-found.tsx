import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="app-page flex min-h-[50vh] items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Página não encontrada</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-5 text-sm text-muted-foreground">O endereço pode estar incorreto ou o recurso não está mais disponível.</p>
          <Button type="button" asChild>
            <Link href="/">Voltar ao início</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
