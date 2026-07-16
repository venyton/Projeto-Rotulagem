'use client';

import { useState } from "react";
import Link from "next/link";
import { FileText, Plus, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export function TablesGrid({ tables, hasEnterprise }: { tables: TableType[], hasEnterprise: boolean }) {
    const [searchQuery, setSearchQuery] = useState("");
    const { language } = useSiteLanguage();

    const filteredTables = tables.filter((table) =>
        table.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (value: string) =>
        new Date(value).toLocaleDateString(language, {
            timeZone: "America/Sao_Paulo",
        });

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <InputGroup className="w-full max-w-sm">
                    <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
                    <InputGroupInput
                        type="search"
                        placeholder="Buscar tabela..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </InputGroup>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredTables.length === 0 ? (
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
                    filteredTables.map(table => (
                        <Card key={table.id} className="group overflow-hidden transition-colors hover:border-primary/40">
                            <CardHeader className="border-b bg-muted/35 p-4">
                                <CardTitle className="flex min-w-0 items-start gap-3">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                                        <FileText className="size-4" aria-hidden="true" />
                                    </span>
                                    <span className="mt-1 min-w-0 break-words text-base [overflow-wrap:anywhere]">{table.title}</span>
                                </CardTitle>
                                {hasEnterprise && (
                                    <Badge variant="secondary" className="w-fit">Brasil 🇧🇷</Badge>
                                )}
                            </CardHeader>
                            <CardContent className="flex flex-col gap-1.5 p-4 text-xs text-muted-foreground *:break-words *:[overflow-wrap:anywhere]">
                                <span>Porção: {table.portion}{table.uom}</span>
                                <span>Grupo: {table.popGroup}</span>
                                <span>Criado em {formatDate(table.createdAt)}</span>
                            </CardContent>
                            <CardFooter className="grid grid-cols-2 gap-2 border-t bg-muted/25 p-3">
                                <Button variant="outline" size="sm" className="w-full" asChild>
                                    <Link href={`/dashboard/edit/${table.id}`}>Editar</Link>
                                </Button>
                                <DeleteTableButton tableId={table.id} title={table.title} />
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
