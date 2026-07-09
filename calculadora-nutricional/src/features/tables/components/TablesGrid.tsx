'use client';

import { useState } from "react";
import Link from "next/link";
import { FileText, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteTableButton } from "@/features/tables/components/DeleteTableButton";

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

    const filteredTables = tables.filter((table) =>
        table.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDateBR = (value: string) =>
        new Date(value).toLocaleDateString("pt-BR", {
            timeZone: "America/Sao_Paulo",
        });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar tabela..."
                        className="pl-9 bg-card/50 shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredTables.length === 0 ? (
                    <Card className="app-empty-state col-span-full flex flex-col items-center justify-center p-12">
                        <div className="text-muted-foreground mb-4">
                            {searchQuery ? "Nenhuma tabela encontrada." : "Você ainda não tem tabelas salvas."}
                        </div>
                        {!searchQuery && (
                            <Button variant="outline" asChild>
                                <Link href="/dashboard/new">Criar a primeira</Link>
                            </Button>
                        )}
                    </Card>
                ) : (
                    filteredTables.map(table => (
                        <Card key={table.id} className="app-panel group overflow-hidden transition-all hover:border-primary/30">
                            <CardHeader className="app-panel-header p-4">
                                <CardTitle className="flex min-w-0 items-start gap-2">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950/40">
                                        <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <span className="min-w-0 text-base font-semibold tracking-tight break-words [overflow-wrap:anywhere] mt-0.5">{table.title}</span>
                                </CardTitle>
                                {hasEnterprise && (
                                    <div className="mt-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 w-fit">
                                        Brasil 🇧🇷
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="p-4 text-xs text-muted-foreground *:break-words *:[overflow-wrap:anywhere] space-y-1.5">
                                <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-border"></div><span>Porção: {table.portion}{table.uom}</span></div>
                                <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-border"></div><span>Grupo: {table.popGroup}</span></div>
                                <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-border"></div><span>Criado: {formatDateBR(table.createdAt)}</span></div>
                            </CardContent>
                            <CardFooter className="app-panel-header grid grid-cols-2 gap-2 p-3">
                                <Button variant="secondary" size="sm" className="w-full bg-background hover:bg-muted shadow-sm" asChild>
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
