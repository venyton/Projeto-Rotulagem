import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gradient-to-b from-green-50 to-white dark:from-green-950 dark:to-background">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-5xl font-bold text-green-700 dark:text-green-400 mb-6">
          Gerador de Tabela Nutricional
        </h1>
        <p className="mt-3 text-2xl mb-12 max-w-2xl text-muted-foreground">
          Crie tabelas nutricionais em conformidade com a <b>ANVISA (RDC 429/2020)</b> de forma simples e rápida.
        </p>

        <div className="flex gap-6">
          <Button asChild size="lg" className="text-lg px-8">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-lg px-8">
            <Link href="/register">Cadastrar</Link>
          </Button>
        </div>
      </main>

      <footer className="flex items-center justify-center w-full h-24 border-t">
        <p className="text-sm text-muted-foreground">
          © 2024 NutriLabel. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
