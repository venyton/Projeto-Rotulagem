import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { FileText, Plus } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ModuleGateMessage } from "@/features/saas/components/ModuleGateMessage";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { contextHasModuleAccess, getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { DeleteTableButton } from "@/features/tables/components/DeleteTableButton";

export default async function TablesPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const context = await getCurrentSaaSContext();
    if (!context || !contextHasModuleAccess(context, SAAS_MODULES.TABLES)) {
        return <ModuleGateMessage moduleKey={SAAS_MODULES.TABLES} />;
    }

    const tables = await prisma.generatedTable.findMany({
        where: {
            user: { email: session.user?.email || "" }
        },
        orderBy: { createdAt: "desc" }
    });

    const formatDateBR = (value: Date) =>
        new Date(value).toLocaleDateString("pt-BR", {
            timeZone: "America/Sao_Paulo",
        });

    return (
        <div className="container mx-auto space-y-8 px-4 py-8 md:px-6">
            <header className="relative mb-8 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-emerald-50/40 via-background to-primary/5 p-6 dark:from-emerald-950/20 dark:to-primary/10 md:p-8">
                <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-600/10" />
                <div className="pointer-events-none absolute -bottom-10 left-10 h-48 w-48 rounded-full bg-primary/10 blur-2xl dark:bg-primary/10" />
                
                <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/50 px-3 py-1 text-sm font-medium text-muted-foreground backdrop-blur-sm">
                            <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            Workspace
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Tabelas</h1>
                            <p className="mt-2 max-w-2xl text-base text-muted-foreground">
                                Suas tabelas nutricionais salvas, prontas para revisar ou exportar.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:flex-nowrap">
                        <Button asChild className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                            <Link href="/dashboard/new">
                                <Plus className="h-4 w-4" /> Nova Tabela
                            </Link>
                        </Button>
                    </div>
                </div>
            </header>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tables.length === 0 ? (
                    <Card className="col-span-full flex flex-col items-center justify-center border-dashed p-12 text-center">
                        <div className="text-muted-foreground mb-4">Você ainda não tem tabelas salvas.</div>
                        <Button variant="outline" asChild>
                            <Link href="/dashboard/new">Criar a primeira</Link>
                        </Button>
                    </Card>
                ) : (
                    tables.map(table => (
                        <Card key={table.id} className="group overflow-hidden rounded-xl border border-border/80 bg-card/80 shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
                            <CardHeader className="bg-muted/10 border-b border-border/60 pb-4 pt-5">
                                <CardTitle className="flex min-w-0 items-start gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950/40">
                                        <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <span className="min-w-0 font-semibold tracking-tight break-words [overflow-wrap:anywhere] mt-1">{table.title}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-5 text-sm text-muted-foreground *:break-words *:[overflow-wrap:anywhere] space-y-2">
                                <div className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-border"></div><span>Porção: {table.portion}{table.uom}</span></div>
                                <div className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-border"></div><span>Grupo: {table.popGroup}</span></div>
                                <div className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-border"></div><span>Criado em: {formatDateBR(table.createdAt)}</span></div>
                            </CardContent>
                            <CardFooter className="bg-muted/5 grid grid-cols-2 gap-2 border-t border-border/40 pt-4">
                                <Button variant="secondary" className="w-full bg-background hover:bg-muted shadow-sm" asChild>
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
