'use client';

import Link from "next/link";
import { Download, FileText, Plus, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { DeleteTableButton } from "@/features/tables/components/DeleteTableButton";
import { useSiteLanguage } from "@/features/i18n/components/LanguageSwitcher";

type TableType = {
    id: string;
    title: string;
    portion: number;
    uom: string;
    popGroup: string;
    createdAt: string;
};

export function TablesGrid({
    tables,
    hasExports,
    page,
    pageSize,
    total,
    searchQuery,
}: {
    tables: TableType[];
    hasExports: boolean;
    page: number;
    pageSize: number;
    total: number;
    searchQuery: string;
}) {
    const { language } = useSiteLanguage();

    const pageHref = (targetPage: number) => {
        const params = new URLSearchParams();
        if (searchQuery) params.set("q", searchQuery);
        if (targetPage > 1) params.set("page", String(targetPage));
        const query = params.toString();
        return `/dashboard/tables${query ? `?${query}` : ""}`;
    };

    const formatDate = (value: string) =>
        new Date(value).toLocaleDateString(language, {
            timeZone: "America/Sao_Paulo",
        });

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <form action="/dashboard/tables" method="get" className="w-full max-w-sm">
                    <InputGroup>
                        <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
                        <InputGroupInput
                            type="search"
                            name="q"
                            placeholder="Buscar tabela..."
                            defaultValue={searchQuery}
                            aria-label="Buscar tabela por nome"
                        />
                    </InputGroup>
                </form>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {tables.length === 0 ? (
                    <Empty className="col-span-full bg-card">
                        <EmptyHeader>
                            <EmptyMedia variant="icon"><FileText aria-hidden="true" /></EmptyMedia>
                            <EmptyTitle>{searchQuery ? "Nenhuma tabela encontrada" : "Nenhuma tabela salva"}</EmptyTitle>
                            <EmptyDescription>
                                {searchQuery ? "Tente buscar com outro nome." : "Crie sua primeira tabela nutricional para começar."}
                            </EmptyDescription>
                        </EmptyHeader>
                        {!searchQuery ? (
                            <EmptyContent>
                                <Button asChild><Link href="/dashboard/new"><Plus data-icon="inline-start" />Criar tabela</Link></Button>
                            </EmptyContent>
                        ) : null}
                    </Empty>
                ) : (
                    tables.map(table => (
                        <Card key={table.id} className="group overflow-hidden transition-colors hover:border-primary/40">
                            <CardHeader className="border-b bg-muted/35 p-4">
                                <CardTitle className="flex min-w-0 items-start gap-3">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                                        <FileText className="size-4" aria-hidden="true" />
                                    </span>
                                    <span className="mt-1 min-w-0 break-words text-base [overflow-wrap:anywhere]">{table.title}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-1.5 p-4 text-xs text-muted-foreground *:break-words *:[overflow-wrap:anywhere]">
                                <span>Porção: {table.portion}{table.uom}</span>
                                <span>Grupo: {table.popGroup}</span>
                                <span>Criado em {formatDate(table.createdAt)}</span>
                            </CardContent>
                            <CardFooter className={`grid ${hasExports ? "grid-cols-3" : "grid-cols-2"} gap-2 border-t bg-muted/25 p-3`}>
                                <Button variant="outline" size="sm" className="w-full" asChild>
                                    <Link href={`/dashboard/edit/${table.id}`}>Editar</Link>
                                </Button>
                                {hasExports && (
                                    <Button variant="outline" size="sm" className="w-full" asChild>
                                        <a
                                            href={`/api/export/memorial?tableId=${encodeURIComponent(table.id)}`}
                                            download
                                            title="Baixar memorial de cálculo em PDF"
                                        >
                                            <Download data-icon="inline-start" />
                                            <span className="hidden sm:inline">Memorial</span>
                                            <span className="sm:hidden">PDF</span>
                                        </a>
                                    </Button>
                                )}
                                <DeleteTableButton tableId={table.id} title={table.title} />
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>
            {total > pageSize ? (
                <div className="flex items-center justify-between gap-3 border-t pt-4 text-sm text-muted-foreground">
                    <span>Mostrando {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} de {total}</span>
                    <div className="flex gap-2">
                        {page > 1 ? (
                            <Button variant="outline" size="sm" asChild>
                                <Link href={pageHref(page - 1)}>Anterior</Link>
                            </Button>
                        ) : (
                            <Button variant="outline" size="sm" disabled>Anterior</Button>
                        )}
                        {page * pageSize < total ? (
                            <Button variant="outline" size="sm" asChild>
                                <Link href={pageHref(page + 1)}>Próxima</Link>
                            </Button>
                        ) : (
                            <Button variant="outline" size="sm" disabled>Próxima</Button>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
