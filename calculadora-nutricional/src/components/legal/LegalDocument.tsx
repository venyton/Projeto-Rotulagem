import Link from "next/link";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LEGAL_DOCUMENT_DATE, LEGAL_DOCUMENT_NOTICE } from "@/lib/legal";

type LegalDocumentSection = {
  id: string;
  title: string;
};

type LegalDocumentProps = {
  eyebrow: string;
  title: string;
  description: string;
  sections: LegalDocumentSection[];
  children: React.ReactNode;
};

export function LegalDocument({
  eyebrow,
  title,
  description,
  sections,
  children,
}: LegalDocumentProps) {
  return (
    <main className="app-page-loose">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar para a SoIZI
        </Link>

        <header className="mt-10 max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="uppercase tracking-[0.16em]">
              {eyebrow}
            </Badge>
            <span className="text-xs text-muted-foreground">Vigente desde {LEGAL_DOCUMENT_DATE}</span>
          </div>
          <h1 className="mt-5 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.035em] sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            {description}
          </p>
        </header>

        <Alert className="mt-8 max-w-4xl border-primary/20 bg-primary/5">
          <FileText className="size-4" aria-hidden="true" />
          <AlertTitle>Documento em revisão de publicação</AlertTitle>
          <AlertDescription>{LEGAL_DOCUMENT_NOTICE}</AlertDescription>
        </Alert>

        <div className="mt-12 grid gap-12 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
          <aside className="lg:sticky lg:top-28">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              Nesta página
            </div>
            <nav className="mt-4 border-l pl-4" aria-label="Seções do documento">
              <ol className="space-y-2 text-sm leading-5 text-muted-foreground">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a className="transition-colors hover:text-foreground" href={`#${section.id}`}>
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className="min-w-0 max-w-3xl text-[0.95rem] leading-7 text-foreground/90 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-primary/80 [&_h2]:scroll-mt-28 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-7 [&_h3]:text-base [&_h3]:font-semibold [&_li]:pl-1 [&_ol]:space-y-3 [&_p]:mt-4 [&_ul]:list-disc [&_ul]:space-y-3 [&_ul]:pl-5">
            {children}
          </article>
        </div>

        <Separator className="my-12" />
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Este documento descreve as regras gerais da plataforma. Direitos previstos em lei, inclusive na legislação de proteção de dados e de defesa do consumidor, permanecem preservados.
        </p>
      </div>
    </main>
  );
}
