'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { UserCircle, FileText, Database, LogOut } from "lucide-react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const NavItem = ({ href, label, icon: Icon }: { href: string, label: string, icon: any }) => {
        const isActive = pathname === href;
        return (
            <Button
                asChild
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
            >
                <Link href={href}>
                    <Icon className="h-4 w-4" />
                    {label}
                </Link>
            </Button>
        );
    };

    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
                    <span className="text-green-600">Nutri</span>Label
                </Link>
                <nav className="flex items-center gap-4 ml-6 text-sm font-medium">
                    <Link href="/dashboard" className={cn("transition-colors hover:text-foreground/80", pathname === "/dashboard" ? "text-foreground" : "text-foreground/60")}>
                        Tabelas
                    </Link>
                    <Link href="/dashboard/ingredients" className={cn("transition-colors hover:text-foreground/80", pathname === "/dashboard/ingredients" ? "text-foreground" : "text-foreground/60")}>
                        Ingredientes
                    </Link>
                </nav>
                <div className="ml-auto flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/profile">
                            <UserCircle className="h-5 w-5" />
                            <span className="sr-only">Perfil</span>
                        </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: '/' })}>
                        <LogOut className="h-5 w-5" />
                        <span className="sr-only">Sair</span>
                    </Button>
                </div>
            </header>
            <main className="flex-1 bg-muted/20">
                {children}
            </main>
        </div>
    );
}
