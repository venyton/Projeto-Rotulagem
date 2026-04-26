import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Plus, FileText } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function Dashboard() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
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
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Minhas Tabelas</h1>
                <Button asChild>
                    <Link href="/dashboard/new">
                        <Plus className="mr-2 h-4 w-4" /> Nova Tabela
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tables.length === 0 ? (
                    <Card className="col-span-full flex flex-col items-center justify-center p-12 border-dashed">
                        <div className="text-muted-foreground mb-4">Você ainda não tem tabelas salvas.</div>
                        <Button variant="outline" asChild>
                            <Link href="/dashboard/new">Criar a primeira</Link>
                        </Button>
                    </Card>
                ) : (
                    tables.map(table => (
                        <Card key={table.id}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-green-600" />
                                    {table.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                                <p>Porção: {table.portion}{table.uom}</p>
                                <p>Grupo: {table.popGroup}</p>
                                <p>Criado em: {formatDateBR(table.createdAt)}</p>
                            </CardContent>
                            <CardFooter>
                                <Button variant="secondary" className="w-full" asChild>
                                    <Link href={`/dashboard/edit/${table.id}`}>Editar</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
