'use client'

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Globe2, LayoutGrid, UserCircle2, LogOut, PackageSearch, Home, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher, useSiteLanguage } from "@/features/i18n/components/LanguageSwitcher";
import { SAAS_MODULES, type SaaSModuleKey } from "@/features/saas/domain/modules";

const PRODUCT_NAV_ITEMS: Array<{
    href: string;
    label: string;
    copyKey?: "home" | "tables" | "ingredients" | "enterprise";
    icon: typeof LayoutGrid;
    moduleKey?: SaaSModuleKey;
    settingsOnly?: boolean;
}> = [
    { href: "/dashboard", label: "Inicio", copyKey: "home", icon: Home },
    { href: "/dashboard/tables", label: "Tabelas", copyKey: "tables", icon: LayoutGrid, moduleKey: SAAS_MODULES.TABLES },
    { href: "/dashboard/ingredients", label: "Ingredientes", copyKey: "ingredients", icon: PackageSearch, moduleKey: SAAS_MODULES.CUSTOM_INGREDIENTS },
    { href: "/dashboard/enterprise", label: "Enterprise", copyKey: "enterprise", icon: Globe2, moduleKey: SAAS_MODULES.ENTERPRISE_LABELS },
    { href: "/dashboard/settings", label: "Configurações", icon: Settings2, settingsOnly: true },
];

export function DashboardShell({
    children,
    accessibleModules = [],
    canManageSettings = false,
}: {
    children: React.ReactNode;
    accessibleModules?: SaaSModuleKey[];
    canManageSettings?: boolean;
}) {
    const pathname = usePathname();
    const { copy } = useSiteLanguage();
    const accessibleModuleSet = new Set(accessibleModules);
    const navItems = PRODUCT_NAV_ITEMS.filter((item) => {
        if (item.settingsOnly) return canManageSettings;
        if (item.moduleKey) return accessibleModuleSet.has(item.moduleKey);
        return true;
    });
    const isNavActive = (href: string) => {
        if (href === "/dashboard") {
            return pathname === "/dashboard";
        }
        return pathname === href || pathname.startsWith(`${href}/`);
    };

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header className="dashboard-header sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
                <div className="container mx-auto flex h-16 items-center gap-3 px-4 md:px-6">
                    <Link
                        href="/dashboard"
                        className="group -ml-1 flex items-center rounded-md px-1 py-1 transition-colors hover:bg-secondary"
                    >
                        <div className="relative h-10 w-36">
                            <Image
                                src="/logo.png"
                                alt="SoIZI"
                                fill
                                sizes="160px"
                                className="object-contain dark:hidden"
                                priority
                            />
                            <Image
                                src="/logo-branco.png"
                                alt="SoIZI"
                                fill
                                sizes="160px"
                                className="hidden object-contain dark:block"
                                priority
                            />
                        </div>
                    </Link>

                    <nav className="items-center gap-2 md:flex">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isNavActive(item.href);
                            return (
                                <Button
                                    key={item.href}
                                    variant="ghost"
                                    asChild
                                    data-nav-active={active ? "true" : undefined}
                                    className="dashboard-nav-button h-8 px-2.5 text-[13px] xl:px-3"
                                >
                                    <Link href={item.href} className="inline-flex items-center gap-1.5">
                                        <Icon className="h-4 w-4" />
                                        {"copyKey" in item && item.copyKey ? copy[item.copyKey] : item.label}
                                    </Link>
                                </Button>
                            );
                        })}
                    </nav>

                    <div className="ml-auto flex items-center gap-2">
                        <LanguageSwitcher />
                        <ModeToggle />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-9 gap-2 px-2.5 text-[13px]">
                                    <UserCircle2 className="h-4 w-4" />
                                    <span className="hidden sm:inline">{copy.account}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuLabel>{copy.myAccount}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/profile">{copy.profileSecurity}</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/tables">{copy.myTables}</Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onSelect={(event) => {
                                        event.preventDefault();
                                        signOut({ callbackUrl: "/" });
                                    }}
                                    className="text-red-600 focus:text-red-700 dark:text-red-300 dark:focus:text-red-200"
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    {copy.logout}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="container mx-auto px-4 pb-2 md:hidden">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isNavActive(item.href);
                            return (
                                <Button
                                    key={item.href}
                                    variant="ghost"
                                    asChild
                                    data-nav-active={active ? "true" : undefined}
                                    className="dashboard-nav-button h-8 px-2.5 text-[12px]"
                                >
                                    <Link href={item.href} className="inline-flex items-center gap-1.5">
                                        <Icon className="h-3.5 w-3.5" />
                                        {"copyKey" in item && item.copyKey ? copy[item.copyKey] : item.label}
                                    </Link>
                                </Button>
                            );
                        })}
                    </div>
                </div>
            </header>

            <main className="flex-1 bg-[linear-gradient(180deg,rgba(255,255,255,0.65),rgba(255,255,255,0)_22rem)] dark:bg-[linear-gradient(180deg,rgba(20,28,45,0.72),rgba(20,28,45,0)_22rem)]">
                {children}
            </main>
        </div>
    );
}
