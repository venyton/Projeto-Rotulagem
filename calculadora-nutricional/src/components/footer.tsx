"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const FOOTER_LINKS = [
  { label: "Sobre a SoIZI", href: "/#sobre-nos" },
  { label: "Plataforma", href: "/#o-que-fazemos" },
  { label: "Dayane", href: "/#dayane" },
];

export function Footer() {
  const pathname = usePathname();

  if (pathname.startsWith("/dashboard")) return null;

  return (
    <footer className="site-footer border-t">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <Link href="/" className="relative block h-10 w-32 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Image src="/logo.png" alt="SoIZI" fill sizes="128px" className="object-contain object-left dark:hidden" />
              <Image src="/logo-branco.png" alt="SoIZI" fill sizes="128px" className="hidden object-contain object-left dark:block" />
            </Link>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
              Tecnologia e conhecimento regulatório para transformar dados técnicos em rótulos prontos para uso.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-1 gap-y-2" aria-label="Rodapé">
            {FOOTER_LINKS.map((item) => (
              <Button key={item.href} variant="ghost" size="sm" asChild>
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
            <Button variant="ghost" size="sm" asChild>
              <Link href="https://linkedin.com/in/doutoraday/" target="_blank" rel="noopener noreferrer">
                LinkedIn <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          </nav>
        </div>

        <Separator className="my-7" />

        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} SoIZI. Todos os direitos reservados.</p>
          <p>Desenvolvido por AsaTech</p>
        </div>
      </div>
    </footer>
  );
}
