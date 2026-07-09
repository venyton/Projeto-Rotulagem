"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ModeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

interface HeaderProps {
    isLoggedIn?: boolean;
}

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

    const sectionIds = useMemo(() => HOME_SECTIONS.map((section) => section.id), []);

    useEffect(() => {
        if (!isHome) {
            return;
        }

        const elements = sectionIds
            .map((id) => document.getElementById(id))
            .filter((element): element is HTMLElement => Boolean(element));

        if (!elements.length) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const visibleEntries = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

                if (visibleEntries[0]?.target?.id) {
                    setActiveSection(visibleEntries[0].target.id);
                }
            },
            {
                root: null,
                rootMargin: "-32% 0px -52% 0px",
                threshold: [0.2, 0.35, 0.5, 0.7],
            },
        );

        elements.forEach((element) => observer.observe(element));

        return () => {
            elements.forEach((element) => observer.unobserve(element));
            observer.disconnect();
        };
    }, [isHome, sectionIds]);

    if (pathname.startsWith("/dashboard")) {
        return null;
    }

    return (
        <header className="sticky top-0 z-50 border-b border-border/70 bg-background/88 backdrop-blur-xl">
            <div className="container mx-auto flex h-16 items-center gap-3 px-4 md:px-6">
                <Link
                    href={isLoggedIn ? "/dashboard" : "/"}
                    className="group -ml-2 flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-secondary"
                >
                    <div className="relative h-9 w-32">
                        <Image
                            src="/logo.png"
                            alt="SoIZI"
                            fill
                            sizes="128px"
                            priority
                            className="object-contain dark:hidden"
                        />
                        <Image
                            src="/logo-branco.png"
                            alt="SoIZI"
                            fill
                            sizes="128px"
                            priority
                            className="hidden object-contain dark:block"
                        />
                    </div>
                </Link>

                {isHome ? (
                    <nav className="ml-2 hidden items-center gap-1 rounded-md  shadow-[0_12px_32px_-28px_rgba(15,23,42,0.6)] md:flex">
                        {HOME_SECTIONS.map((section) => {
                            const isActive = activeSection === section.id;
                            return (
                                <Button
                                    key={section.id}
                                    asChild
                                    variant={isActive ? "secondary" : "ghost"}
                                    className="h-8 rounded-md px-3 text-[13px]"
                                >
                                    <Link
                                        href={`#${section.id}`}
                                        onClick={() => setActiveSection(section.id)}
                                    >
                                        {section.label}
                                    </Link>
                                </Button>
                            );
                        })}
                    </nav>
                ) : null}

                <div className="ml-auto flex items-center gap-2">
                    {(pathname === "/login" || pathname === "/register") ? (
                        <Button asChild variant="ghost" className="h-9 rounded-md text-sm">
                            <Link href={isLoggedIn ? "/dashboard" : "/"}>{isLoggedIn ? "Minhas tabelas" : "Início"}</Link>
                        </Button>
                    ) : null}
                    {isLoggedIn && pathname === "/" ? (
                        <Button asChild variant="ghost" className="h-9 rounded-md text-sm">
                            <Link href="/dashboard">Minhas tabelas</Link>
                        </Button>
                    ) : null}
                    {!isLoggedIn && isHome ? (
                        <>
                            <Button asChild variant="ghost" className="h-9 rounded-md text-sm">
                                <Link href="/login">Login</Link>
                            </Button>
                            <Button asChild className="h-9 rounded-md px-4 text-sm">
                                <Link href="/register">Criar conta</Link>
                            </Button>
                        </>
                    ) : null}
                    <ModeToggle />
                </div>
            </div>
        </header>
    );
}
