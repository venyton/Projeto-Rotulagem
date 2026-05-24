import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Globe2, PackageSearch, Plus, ShieldCheck, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

const workspaceGuide = [
    {
        title: "Tabelas nutricionais",
        description: "Crie, revise e exporte tabelas no padrão brasileiro, com porção, medida caseira, nutrientes e alertas regulatórios.",
        href: "/dashboard/tables",
        action: "Abrir Tabelas",
        icon: FileText,
        color: "text-emerald-600",
        bg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
        title: "Ingredientes e fichas técnicas",
        description: "Monte sua base de ingredientes, importe fichas técnicas e reaproveite dados nas próximas formulações.",
        href: "/dashboard/ingredients",
        action: "Abrir Ingredientes",
        icon: PackageSearch,
        color: "text-blue-600",
        bg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
        title: "Enterprise",
        description: "Prepare rótulos por mercado, idioma e regra internacional, com histórico de versões, aprovação e exportação.",
        href: "/dashboard/enterprise",
        action: "Abrir Enterprise",
        icon: Globe2,
        color: "text-violet-600",
        bg: "bg-violet-50 dark:bg-violet-950/40",
    },
    {
        title: "Conta e segurança",
        description: "Atualize dados da conta, senha e segurança antes de compartilhar ou aprovar materiais finais.",
        href: "/dashboard/profile",
        action: "Ver conta",
        icon: ShieldCheck,
        color: "text-amber-600",
        bg: "bg-amber-50 dark:bg-amber-950/40",
    },
];

const highlights = [
    "Cálculo automático de % VD e alertas ANVISA",
    "Exportação em PDF, PNG e Excel",
    "Base de ingredientes reutilizável",
    "Suporte a rótulos internacionais",
];

export default async function DashboardHomePage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const firstName = session.user?.name?.split(" ")[0] ?? "por aqui";

    return (
        <div className="mx-auto max-w-[88rem] space-y-10 px-4 py-10 md:px-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-emerald-50/40 p-8 dark:from-primary/10 dark:to-emerald-950/20 md:p-12">
                <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-10 left-10 h-48 w-48 rounded-full bg-emerald-400/10 blur-2xl" />

                <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-xl space-y-3">
                        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                            Olá, {firstName}!
                        </h1>
                        <p className="text-base leading-relaxed text-muted-foreground">
                            A plataforma completa para formulação de rótulos nutricionais no padrão ANVISA.
                            Crie tabelas, organize ingredientes e exporte para qualquer mercado.
                        </p>
                        <ul className="mt-2 space-y-1.5">
                            {highlights.map((h) => (
                                <li key={h} className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                                    {h}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <Button size="lg" asChild className="shrink-0 gap-2 self-start md:self-auto">
                        <Link href="/dashboard/new">
                            <Plus className="h-5 w-5" />
                            Nova Tabela
                        </Link>
                    </Button>
                </div>
            </div>

            <div>
                <div className="mb-5 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Como funciona</p>
                    <h2 className="text-2xl font-semibold tracking-tight">Explore o sistema</h2>
                    <p className="text-sm text-muted-foreground">
                        Tudo que você precisa para formular, revisar e exportar rótulos nutricionais conformes.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    {workspaceGuide.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.title}
                                href={item.href}
                                className="group min-w-0 rounded-xl border border-border/70 bg-card/70 p-5 transition-all hover:border-primary/40 hover:bg-card hover:shadow-sm"
                            >
                                <div className="flex min-w-0 items-start gap-4">
                                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.bg} ${item.color}`}>
                                        <Icon className="h-5 w-5" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="break-words text-base font-semibold tracking-tight">{item.title}</h3>
                                        <p className="mt-1 break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
                                            {item.description}
                                        </p>
                                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:underline">
                                            {item.action}
                                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <div className="rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-8 text-center">
                <p className="text-sm font-medium text-muted-foreground">Pronto para começar?</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">Crie sua tabela agora</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                    Basta adicionar os ingredientes e o sistema calcula tudo automaticamente no padrão ANVISA.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <Button asChild>
                        <Link href="/dashboard/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Nova Tabela
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/tables">Ver minhas tabelas</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
