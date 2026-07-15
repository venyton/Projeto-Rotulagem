import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, Database } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item";

type ColumnRow = {
    column_name: string;
};

export default async function DebugPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    let columns: ColumnRow[] = [];
    let error: string | null = null;

    try {
        // Query information_schema to check if columns exist
        columns = await prisma.$queryRaw`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'CustomIngredient';
        `;
    } catch (e: unknown) {
        error = e instanceof Error ? e.message : String(e);
    }

    return (
        <div className="app-page flex flex-col gap-6">
            <PageHeader eyebrow="Diagnóstico" icon={Database} title="Banco de dados" description="Verificação técnica da estrutura disponível para ingredientes personalizados." />

            {error ? (
                <Alert variant="destructive">
                    <AlertCircle aria-hidden="true" />
                    <AlertTitle>Falha na conexão</AlertTitle>
                    <AlertDescription><pre className="mt-2 whitespace-pre-wrap text-xs">{error}</pre></AlertDescription>
                </Alert>
            ) : (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
                            <CardTitle>Conexão ativa</CardTitle>
                            <Badge variant="success">{columns.length} colunas</Badge>
                        </div>
                        <CardDescription>Estrutura encontrada na tabela CustomIngredient.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        {columns.map((col) => (
                            <Item key={col.column_name} variant="outline" size="sm">
                                <ItemContent><ItemTitle className="font-mono text-xs">{col.column_name}</ItemTitle></ItemContent>
                            </Item>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
