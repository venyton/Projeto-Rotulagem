'use client'

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
    Globe2,
    FileSearch,
    Home,
    LayoutGrid,
    LogOut,
    PackageSearch,
    Plus,
    Settings2,
    UserCircle2,
} from "lucide-react";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarSeparator,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";
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
    { href: "/dashboard", label: "Início", copyKey: "home", icon: Home },
    { href: "/dashboard/tables", label: "Tabelas", copyKey: "tables", icon: LayoutGrid, moduleKey: SAAS_MODULES.TABLES },
    { href: "/dashboard/ingredients", label: "Ingredientes", copyKey: "ingredients", icon: PackageSearch, moduleKey: SAAS_MODULES.CUSTOM_INGREDIENTS },
    { href: "/dashboard/ingredients/technical-sheets", label: "Fichas técnicas", icon: FileSearch, moduleKey: SAAS_MODULES.TECHNICAL_SHEETS },
    { href: "/dashboard/enterprise", label: "Enterprise", copyKey: "enterprise", icon: Globe2, moduleKey: SAAS_MODULES.ENTERPRISE_LABELS },
    { href: "/dashboard/settings", label: "Configurações", icon: Settings2, moduleKey: SAAS_MODULES.SETTINGS, settingsOnly: true },
];

function DashboardSidebarHeader() {
    const { isMobile, state } = useSidebar();
    const isCollapsed = state === "collapsed" && !isMobile;

    return (
        <SidebarHeader
            className={isCollapsed ? undefined : "p-3"}
            style={isCollapsed ? { padding: "4px" } : undefined}
        >
            <Link
                href="/dashboard"
                className={`flex items-center overflow-hidden rounded-lg outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent focus-visible:ring-2 ${isCollapsed ? "justify-center" : "min-h-8 px-2"}`}
                style={isCollapsed ? { minHeight: "40px", paddingInline: 0 } : undefined}
            >
                {isCollapsed ? (
                    <span className="relative shrink-0" style={{ width: "32px", height: "32px" }}>
                        <Image
                            src="/logo-tabela.png"
                            alt="SoIZI"
                            width={32}
                            height={32}
                            className="size-[32px] object-contain dark:hidden"
                            priority
                        />
                        <Image
                            src="/logo-tabela-branco.png"
                            alt="SoIZI"
                            width={32}
                            height={32}
                            className="hidden size-[32px] object-contain dark:block"
                            priority
                        />
                    </span>
                ) : (
                    <span className="relative h-8 w-32 shrink-0">
                        <Image
                            src="/logo.png"
                            alt="SoIZI"
                            fill
                            sizes="128px"
                            className="object-contain object-left dark:hidden"
                            priority
                        />
                        <Image
                            src="/logo-branco.png"
                            alt="SoIZI"
                            fill
                            sizes="128px"
                            className="hidden object-contain object-left dark:block"
                            priority
                        />
                    </span>
                )}
            </Link>
        </SidebarHeader>
    );
}

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
    const hasTables = accessibleModuleSet.has(SAAS_MODULES.TABLES);
    const navItems = PRODUCT_NAV_ITEMS.filter((item) => {
        if (item.settingsOnly && !canManageSettings) return false;
        if (item.moduleKey) return accessibleModuleSet.has(item.moduleKey);
        return true;
    });
    const isNavActive = (href: string) => href === "/dashboard"
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`);
    const currentItem = [...navItems]
        .sort((a, b) => b.href.length - a.href.length)
        .find((item) => isNavActive(item.href));
    const currentLabel = pathname.startsWith("/dashboard/profile")
        ? copy.profileSecurity
        : currentItem?.copyKey
            ? copy[currentItem.copyKey]
            : currentItem?.label ?? "Workspace";
    const workspaceItems = navItems.filter((item) => !item.settingsOnly);
    const managementItems = navItems.filter((item) => item.settingsOnly);

    return (
        <SidebarProvider>
            <Sidebar collapsible="icon" variant="inset">
                <DashboardSidebarHeader />

                <SidebarSeparator />

                <SidebarContent>
                    <SidebarGroup className="group-data-[collapsible=icon]:p-[4px]!">
                        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {workspaceItems.map((item) => {
                                    const Icon = item.icon;
                                    const label = item.copyKey ? copy[item.copyKey] : item.label;

                                    return (
                                        <SidebarMenuItem key={item.href}>
                                            <SidebarMenuButton asChild isActive={currentItem?.href === item.href} tooltip={label} size="lg" className="group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center">
                                                <Link href={item.href}>
                                                    <Icon aria-hidden="true" />
                                                    <span className="group-data-[collapsible=icon]:hidden">{label}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                    {managementItems.length > 0 ? (
                        <SidebarGroup className="group-data-[collapsible=icon]:p-[4px]!">
                            <SidebarGroupLabel>Administração</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {managementItems.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton asChild isActive={currentItem?.href === item.href} tooltip={item.label} className="group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center">
                                        <Link href={item.href}>
                                            <Icon aria-hidden="true" />
                                            <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        );
                                    })}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    ) : null}
                </SidebarContent>

                <SidebarSeparator />

                <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-[4px]!">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isNavActive("/dashboard/profile")} tooltip={copy.profileSecurity} className="group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center">
                                <Link href="/dashboard/profile">
                                    <UserCircle2 aria-hidden="true" />
                                    <span className="group-data-[collapsible=icon]:hidden">{copy.profileSecurity}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
                <SidebarRail />
            </Sidebar>

            <SidebarInset className="min-w-0 overflow-x-clip">
                <header className="app-topbar sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-xl sm:px-6">
                    <SidebarTrigger aria-label="Abrir ou recolher navegação" />
                    <Separator orientation="vertical" className="mr-1 h-4" />
                    <Breadcrumb>
                        <BreadcrumbList>
                            {pathname !== "/dashboard" ? (
                              <>
                                <BreadcrumbItem className="hidden sm:inline-flex">
                                    <BreadcrumbLink asChild><Link href="/dashboard">Workspace</Link></BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden sm:block" />
                              </>
                            ) : null}
                            <BreadcrumbItem>
                                <BreadcrumbPage>{currentLabel}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>

                    <div className="ml-auto flex items-center gap-2">
                        {hasTables ? (
                            <Button asChild size="sm" className="hidden sm:inline-flex">
                                <Link href="/dashboard/new">
                                    <Plus data-icon="inline-start" />
                                    Nova tabela
                                </Link>
                            </Button>
                        ) : null}
                        <LanguageSwitcher />
                        <ModeToggle />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full" aria-label={copy.account}>
                                    <Avatar className="size-8 border">
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            <UserCircle2 aria-hidden="true" className="size-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>{copy.myAccount}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem asChild>
                                        <Link href="/dashboard/profile">
                                            <UserCircle2 aria-hidden="true" />
                                            {copy.profileSecurity}
                                        </Link>
                                    </DropdownMenuItem>
                                    {hasTables ? (
                                        <DropdownMenuItem asChild>
                                            <Link href="/dashboard/tables">
                                                <LayoutGrid aria-hidden="true" />
                                                {copy.myTables}
                                            </Link>
                                        </DropdownMenuItem>
                                    ) : null}
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onSelect={(event) => {
                                            event.preventDefault();
                                            signOut({ callbackUrl: "/" });
                                        }}
                                    >
                                        <LogOut aria-hidden="true" />
                                        {copy.logout}
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>
                <div className="min-w-0 flex-1">{children}</div>
                <footer className="app-footer flex flex-col gap-2 border-t px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <p>SoIZI · Rotulagem nutricional</p>
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/profile" className="transition-colors hover:text-foreground">Conta</Link>
                        <Link href="/" className="transition-colors hover:text-foreground">Site institucional</Link>
                    </div>
                </footer>
            </SidebarInset>
        </SidebarProvider>
    );
}
