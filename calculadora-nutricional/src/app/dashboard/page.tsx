import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
    ArrowRight,
    CheckCircle2,
    FileText,
    Globe2,
    PackageSearch,
    Plus,
    ShieldCheck,
} from "lucide-react";

import { authOptions } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemMedia,
    ItemTitle,
} from "@/components/ui/item";

const workspaceGuide = [
    {
        title: "Tabelas nutricionais",
        description: "Cálculo, revisão regulatória, modelos oficiais e exportação.",
        href: "/dashboard/tables",
        action: "Abrir tabelas",
        icon: FileText,
    },
    {
        title: "Ingredientes e fichas técnicas",
        description: "Base própria, importação por arquivo e extração assistida por IA.",
        href: "/dashboard/ingredients",
        action: "Abrir ingredientes",
        icon: PackageSearch,
    },
    {
        title: "Enterprise",
        description: "Mercados internacionais, versões, aprovações e entregáveis.",
        href: "/dashboard/enterprise",
        action: "Abrir Enterprise",
        icon: Globe2,
    },
    {
        title: "Conta e segurança",
        description: "Dados pessoais, senha, preferências e autenticação em duas etapas.",
        href: "/dashboard/profile",
        action: "Ver conta",
        icon: ShieldCheck,
    },
];

const highlights = [
    "Cálculo automático e % VD",
    "Alertas regulatórios ANVISA",
    "Exportação em imagem e Excel",
    "Base de ingredientes reutilizável",
];

const workflow = [
    { step: "01", title: "Organize os dados", description: "Cadastre ou importe seus ingredientes." },
    { step: "02", title: "Monte a formulação", description: "Defina porção, medidas e composição." },
    { step: "03", title: "Revise e exporte", description: "Valide os alertas e gere os arquivos finais." },
];

export default async function DashboardHomePage() {
    const session = await getServerSession(authOptions);

    if (!session) redirect("/login");

    const firstName = session.user?.name?.split(" ")[0] ?? "por aqui";

    return (
        <div className="app-page-loose flex flex-col gap-12">
            <section className="app-enter grid gap-8 border-b pb-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)] lg:items-end">
                <div className="max-w-3xl">
                    <h1 className="text-balance text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
                        Olá, {firstName}. O que vamos rotular hoje?
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                        Organize ingredientes, calcule a informação nutricional e prepare os arquivos finais em um único fluxo.
                    </p>
                    <div className="mt-7 flex flex-wrap gap-3">
                        <Button size="lg" asChild>
                            <Link href="/dashboard/new">
                                <Plus data-icon="inline-start" />
                                Nova tabela
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" asChild>
                            <Link href="/dashboard/tables">Continuar uma tabela</Link>
                        </Button>
                    </div>
                </div>

                <div className="border-l-2 border-primary/15 pl-5 sm:pl-7">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">No seu fluxo</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                        {highlights.map((highlight) => (
                            <div key={highlight} className="flex items-start gap-2 text-sm leading-5">
                                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                                <span>{highlight}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="app-enter app-enter-delay-1" aria-labelledby="workspace-title">
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Ferramentas</p>
                        <h2 id="workspace-title" className="mt-2 text-2xl font-semibold tracking-tight">Áreas de trabalho</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">Escolha uma área para continuar.</p>
                </div>

                <div className="grid overflow-hidden rounded-xl border bg-card shadow-sm sm:grid-cols-2">
                    {workspaceGuide.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <Item
                                key={item.title}
                                asChild
                                className={`group min-h-36 rounded-none p-5 hover:bg-accent/50 sm:p-6 ${
                                    index % 2 === 0 ? "sm:border-r" : ""
                                } ${index < 2 ? "border-b" : ""}`}
                            >
                                <Link href={item.href}>
                                    <ItemMedia className="size-11 rounded-lg border-primary/15 bg-primary/5 text-primary">
                                        <Icon className="size-5" aria-hidden="true" />
                                    </ItemMedia>
                                    <ItemContent className="gap-1.5">
                                        <ItemTitle className="text-base">{item.title}</ItemTitle>
                                        <ItemDescription className="line-clamp-none max-w-md leading-6">{item.description}</ItemDescription>
                                    </ItemContent>
                                    <ItemActions className="self-center text-xs font-semibold text-primary">
                                        <span className="hidden xl:inline">{item.action}</span>
                                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                                    </ItemActions>
                                </Link>
                            </Item>
                        );
                    })}
                </div>
            </section>

            <section className="app-enter app-enter-delay-2 border-t pt-8" aria-labelledby="workflow-title">
                <div className="grid gap-7 lg:grid-cols-[18rem_1fr]">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Fluxo recomendado</p>
                        <h2 id="workflow-title" className="mt-2 text-2xl font-semibold tracking-tight">Da ficha ao rótulo</h2>
                    </div>
                    <ol className="grid gap-6 sm:grid-cols-3">
                        {workflow.map((item) => (
                            <li key={item.step} className="border-l pl-4">
                                <span className="font-mono text-xs font-semibold text-primary">{item.step}</span>
                                <h3 className="mt-2 text-sm font-semibold">{item.title}</h3>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>
        </div>
    );
}
