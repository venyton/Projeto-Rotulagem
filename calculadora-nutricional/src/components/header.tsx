"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Menu } from "lucide-react";

import { ModeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/features/i18n/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface HeaderProps { isLoggedIn?: boolean }

const HOME_SECTIONS = [
    { id: "sobre-nos", label: "Sobre nós" },
    { id: "o-que-fazemos", label: "O que fazemos" },
    { id: "dayane", label: "Quem é Dayane" },
    { id: "acesso", label: "Acesso" },
];

export function Header({ isLoggedIn = false }: HeaderProps) {
    const pathname = usePathname();
    const isHome = pathname === "/";
    const [activeSection, setActiveSection] = useState("sobre-nos");
    const [mobileOpen, setMobileOpen] = useState(false);
    const sectionIds = useMemo(() => HOME_SECTIONS.map((section) => section.id), []);

    useEffect(() => {
        if (!isHome) return;
        const elements = sectionIds.map((id) => document.getElementById(id)).filter((element): element is HTMLElement => Boolean(element));
        if (!elements.length) return;
        const observer = new IntersectionObserver((entries) => {
            const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
            if (visible[0]?.target?.id) setActiveSection(visible[0].target.id);
        }, { rootMargin: "-32% 0px -52% 0px", threshold: [0.2, 0.35, 0.5, 0.7] });
        elements.forEach((element) => observer.observe(element));
        return () => observer.disconnect();
    }, [isHome, sectionIds]);

    if (pathname.startsWith("/dashboard")) return null;

    return (
        <header className="site-header sticky top-0 z-40 border-b shadow-[0_1px_0_rgba(15,23,42,0.02)] backdrop-blur-xl">
            <div className="mx-auto flex h-18 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
                <Link href={isLoggedIn ? "/dashboard" : "/"} className="relative h-12 w-40 shrink-0 rounded-md outline-none ring-ring focus-visible:ring-2">
                    <Image src="/logo.png" alt="SoIZI" fill sizes="160px" priority className="object-contain dark:hidden" />
                    <Image src="/logo-branco.png" alt="SoIZI" fill sizes="160px" priority className="hidden object-contain dark:block" />
                </Link>

                {isHome ? (
                    <NavigationMenu viewport={false} className="ml-3 hidden lg:flex" aria-label="Seções da página">
                        <NavigationMenuList>
                            {HOME_SECTIONS.map((section) => (
                                <NavigationMenuItem key={section.id}>
                                    <NavigationMenuLink
                                        asChild
                                        active={activeSection === section.id}
                                        className={navigationMenuTriggerStyle()}
                                    >
                                        <Link href={`#${section.id}`} onClick={() => setActiveSection(section.id)}>{section.label}</Link>
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                            ))}
                        </NavigationMenuList>
                    </NavigationMenu>
                ) : null}

                <div className="ml-auto flex items-center gap-2">
                    <div className="hidden items-center gap-2 sm:flex">
                        {(pathname === "/login" || pathname === "/register") ? (
                            <Button asChild variant="ghost"><Link href={isLoggedIn ? "/dashboard" : "/"}>{isLoggedIn ? "Minhas tabelas" : "Início"}</Link></Button>
                        ) : null}
                        {isLoggedIn && isHome ? <Button asChild variant="outline"><Link href="/dashboard">Minhas tabelas</Link></Button> : null}
                        {!isLoggedIn && isHome ? (
                            <><Button asChild variant="ghost"><Link href="/login">Login</Link></Button><Button asChild><Link href="/register">Criar conta</Link></Button></>
                        ) : null}
                    </div>
                    <div className="hidden sm:block"><LanguageSwitcher /></div>
                    <ModeToggle />
                    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="lg:hidden" aria-label="Abrir menu"><Menu aria-hidden="true" /></Button>
                        </SheetTrigger>
                        <SheetContent side="right">
                            <SheetHeader>
                                <SheetTitle>Navegação</SheetTitle>
                                <SheetDescription>Acesse as áreas da SoIZI.</SheetDescription>
                            </SheetHeader>
                            <div className="flex flex-col gap-2 px-4 pb-4">
                                {isHome ? HOME_SECTIONS.map((section) => (
                                    <Button key={section.id} asChild variant={activeSection === section.id ? "secondary" : "ghost"} className="justify-start">
                                        <Link href={`#${section.id}`} onClick={() => setMobileOpen(false)}>{section.label}</Link>
                                    </Button>
                                )) : null}
                                <Separator className="my-2" />
                                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-2 sm:hidden">
                                    <span className="pl-1 text-sm font-medium">Idioma</span>
                                    <LanguageSwitcher />
                                </div>
                                {isLoggedIn ? (
                                    <Button asChild><Link href="/dashboard" onClick={() => setMobileOpen(false)}>Minhas tabelas</Link></Button>
                                ) : (
                                    <><Button asChild variant="outline"><Link href="/login" onClick={() => setMobileOpen(false)}>Login</Link></Button><Button asChild><Link href="/register" onClick={() => setMobileOpen(false)}>Criar conta</Link></Button></>
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
