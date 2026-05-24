import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { FileText, Globe2, PackageSearch, Plus, ShieldCheck } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ModuleGateMessage } from "@/features/saas/components/ModuleGateMessage";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { contextHasModuleAccess, getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { DeleteTableButton } from "@/features/tables/components/DeleteTableButton";

const workspaceGuide = [
    {
        title: "Tabelas nutricionais",
        description: "Crie, revise e exporte tabelas no padrão brasileiro, com porção, medida caseira, nutrientes e alertas regulatórios.",
        href: "/dashboard/new",
        action: "Criar tabela",
        icon: FileText,
    },
    {
        title: "Ingredientes e fichas técnicas",
        description: "Monte sua base de ingredientes, importe fichas técnicas e reaproveite dados nas próximas formulações.",
        href: "/dashboard/ingredients",
        action: "Abrir ingredientes",
        icon: PackageSearch,
    },
    {
        title: "Enterprise",
        description: "Prepare rótulos por mercado, idioma e regra internacional, com histórico de versões, aprovação e exportação.",
        href: "/dashboard/enterprise",
        action: "Abrir Enterprise",
        icon: Globe2,
    },
    {
        title: "Conta e segurança",
        description: "Atualize dados da conta, senha e segurança antes de compartilhar ou aprovar materiais finais.",
        href: "/dashboard/profile",
        action: "Ver conta",
        icon: ShieldCheck,
    },
];

export default async function Dashboard() {
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
        orderBy: { createdAt: 'desc' }
    });

    const formatDateBR = (value: Date) =>
        new Date(value).toLocaleDateString("pt-BR", {
            timeZone: "America/Sao_Paulo",
        });

    return (
        <div className="container mx-auto space-y-8 px-4 py-8 md:px-6">
            <div className="flex flex-col gap-3 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Workspace</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight">Início</h1>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                        Use este painel para formular, revisar informações regulatórias, organizar ingredientes e preparar rótulos para mercados nacionais ou internacionais.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/new">
                        <Plus className="mr-2 h-4 w-4" /> Nova Tabela
                    </Link>
                </Button>
            </div>

            <section className="grid gap-3 sm:grid-cols-2">
                {workspaceGuide.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.title}
                            href={item.href}
                            className="group min-w-0 rounded-lg border border-border/70 bg-card/70 p-4 transition-colors hover:border-primary/45 hover:bg-card"
                        >
                            <div className="flex min-w-0 items-start gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                    <Icon className="h-5 w-5" />
                                </span>
                                <div className="min-w-0">
                                    <h2 className="break-words text-base font-semibold tracking-tight">{item.title}</h2>
                                    <p className="mt-1 break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
                                        {item.description}
                                    </p>
                                    <span className="mt-3 inline-flex text-sm font-medium text-primary group-hover:underline">
                                        {item.action}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </section>

            <div className="flex flex-col gap-2 border-b border-border/70 pb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Arquivos</p>
                <h2 className="text-2xl font-semibold tracking-tight">Minhas Tabelas</h2>
                <p className="text-sm text-muted-foreground">Arquivos salvos, prontos para revisar ou exportar.</p>
            </div>

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
                        <Card key={table.id} className="transition-colors hover:border-primary/35">
                            <CardHeader>
                                <CardTitle className="flex min-w-0 items-start gap-2">
                                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">{table.title}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground *:break-words *:[overflow-wrap:anywhere]">
                                <p>Porção: {table.portion}{table.uom}</p>
                                <p>Grupo: {table.popGroup}</p>
                                <p>Criado em: {formatDateBR(table.createdAt)}</p>
                            </CardContent>
                            <CardFooter className="grid grid-cols-2 gap-2">
                                <Button variant="secondary" className="w-full" asChild>
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
