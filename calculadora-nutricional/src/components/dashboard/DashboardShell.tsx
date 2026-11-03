'use client'

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
    BadgeDollarSign,
    Building2,
    ChartNoAxesCombined,
    Check,
    ChevronsUpDown,
    CircleDollarSign,
    CreditCard,
    FileClock,
    Globe2,
    Home,
    LayoutGrid,
    LogOut,
    PackageSearch,
    PanelTop,
    Plus,
    ReceiptText,
    Settings2,
    ShieldCheck,
    Tags,
    UserCircle2,
    UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarFooter,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/theme-toggle";
import { Footer } from "@/components/footer";
import { LanguageSwitcher, useSiteLanguage } from "@/features/i18n/components/LanguageSwitcher";
import type { AdminNavigationOverride } from "@/features/configuration/domain/admin-navigation";
import {
    PLATFORM_PERMISSIONS,
    type PlatformPermissionKey,
} from "@/features/platform-iam/domain/platform-authorization";
import { SAAS_MODULES, type SaaSModuleKey } from "@/features/saas/domain/modules";

export type AdminNavItem = {
    navigationKey: AdminNavigationOverride["key"];
    href: string;
    label: string;
    icon: LucideIcon;
  permission: PlatformPermissionKey;
  anyPermission?: PlatformPermissionKey[];
};

export type AdminNavGroup = { label: string; items: AdminNavItem[] };

type PlatformAdminShellContext = {
    permissions: PlatformPermissionKey[];
    navigationOverrides?: AdminNavigationOverride[];
};

const PLATFORM_NAVIGATION_GROUPS: AdminNavGroup[] = [
    { label: "Visão geral", items: [{ navigationKey: "dashboard", href: "/admin", label: "Visão geral", icon: PanelTop, permission: PLATFORM_PERMISSIONS.ACCESS }] },
    { label: "Clientes", items: [
        { navigationKey: "organizations", href: "/admin/organizations", label: "Organizações", icon: Building2, permission: PLATFORM_PERMISSIONS.ORGANIZATIONS_READ },
        { navigationKey: "billing", href: "/admin/billing", label: "Cobranças e assinaturas", icon: ReceiptText, permission: PLATFORM_PERMISSIONS.BILLING_READ },
    ] },
    { label: "Comercial", items: [
        { navigationKey: "catalog", href: "/admin/catalog", label: "Pacotes e acessos", icon: BadgeDollarSign, permission: PLATFORM_PERMISSIONS.CATALOG_READ },
        { navigationKey: "coupons", href: "/admin/commercial/coupons", label: "Cupons", icon: Tags, permission: PLATFORM_PERMISSIONS.CATALOG_READ },
        { navigationKey: "grants", href: "/admin/commercial/grants", label: "Benefícios e exceções", icon: CircleDollarSign, permission: PLATFORM_PERMISSIONS.ENTITLEMENTS_READ },
    ] },
    { label: "Operação", items: [
        { navigationKey: "metrics", href: "/admin/metrics", label: "Métricas e consumo", icon: ChartNoAxesCombined, permission: PLATFORM_PERMISSIONS.OPERATIONS_READ },
        { navigationKey: "audit", href: "/admin/audit", label: "Auditoria", icon: FileClock, permission: PLATFORM_PERMISSIONS.AUDIT_READ },
    ] },
    { label: "Segurança", items: [
        { navigationKey: "privileged-sessions", href: "/admin/security/privileged-sessions", label: "Acessos temporários", icon: ShieldCheck, permission: PLATFORM_PERMISSIONS.ACCESS },
        { navigationKey: "operators", href: "/admin/security/operators", label: "Administradores", icon: UsersRound, permission: PLATFORM_PERMISSIONS.SECURITY_OPERATORS_READ },
    ] },
    { label: "Configuração", items: [
        { navigationKey: "settings", href: "/admin/settings", label: "Configurações", icon: Settings2, permission: PLATFORM_PERMISSIONS.CONFIGURATION_READ, anyPermission: [PLATFORM_PERMISSIONS.BILLING_READ] },
        { navigationKey: "internal-settings", href: "/admin/internal-settings", label: "Configurações internas", icon: Settings2, permission: PLATFORM_PERMISSIONS.CONFIGURATION_READ },
    ] },
];

const PRODUCT_NAV_ITEMS: Array<{
    href: string;
    label: string;
    copyKey?: "home" | "tables" | "ingredients" | "enterprise";
    icon: typeof LayoutGrid;
    moduleKey?: SaaSModuleKey;
    settingsOnly?: boolean;
    billingOnly?: boolean;
}> = [
    { href: "/dashboard", label: "Início", copyKey: "home", icon: Home },
    { href: "/dashboard/tables", label: "Tabelas", copyKey: "tables", icon: LayoutGrid, moduleKey: SAAS_MODULES.TABLES },
    { href: "/dashboard/ingredients", label: "Ingredientes", copyKey: "ingredients", icon: PackageSearch, moduleKey: SAAS_MODULES.CUSTOM_INGREDIENTS },
    { href: "/dashboard/enterprise", label: "Internacional", copyKey: "enterprise", icon: Globe2, moduleKey: SAAS_MODULES.ENTERPRISE_LABELS },
    { href: "/dashboard/billing", label: "Faturamento", icon: CreditCard, billingOnly: true },
    { href: "/dashboard/settings", label: "Configurações", icon: Settings2, moduleKey: SAAS_MODULES.SETTINGS, settingsOnly: true },
];

export function DashboardShell({
    children,
    accessibleModules = [],
    canManageSettings = false,
    canManageBilling = false,
    canAccessPlatformManagement = false,
    organizations = [],
    activeOrganizationId = null,
    platformAdmin,
}: {
    children: React.ReactNode;
    accessibleModules?: SaaSModuleKey[];
    canManageSettings?: boolean;
    canManageBilling?: boolean;
    canAccessPlatformManagement?: boolean;
    organizations?: Array<{ id: string; name: string; slug: string; role: string }>;
    activeOrganizationId?: string | null;
    platformAdmin?: PlatformAdminShellContext;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { copy } = useSiteLanguage();
    const [switchingOrganizationId, setSwitchingOrganizationId] = useState<string | null>(null);
    const accessibleModuleSet = new Set(accessibleModules);
    const hasTables = accessibleModuleSet.has(SAAS_MODULES.TABLES);
    const navItems = PRODUCT_NAV_ITEMS.filter((item) => {
        if (item.settingsOnly && !canManageSettings) return false;
        if (item.billingOnly && !canManageBilling) return false;
        if (item.moduleKey) return accessibleModuleSet.has(item.moduleKey);
        return true;
    });
    const isNavActive = (href: string) => href === "/dashboard"
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`);
    const currentItem = [...navItems]
        .sort((a, b) => b.href.length - a.href.length)
        .find((item) => isNavActive(item.href));
    const adminOverrideMap = new Map((platformAdmin?.navigationOverrides ?? []).map((item) => [item.key, item]));
    const platformNavGroups = (platformAdmin ? PLATFORM_NAVIGATION_GROUPS : [])
        .map((group) => ({
            ...group,
            items: group.items
                .map((item, index) => ({ item, index, override: adminOverrideMap.get(item.navigationKey) }))
                .filter(({ item, override }) => (
                    (platformAdmin?.permissions.includes(item.permission) ?? false)
                    || (item.anyPermission?.some((permission) => platformAdmin?.permissions.includes(permission)) ?? false)
                ) && override?.enabled !== false)
                .sort((left, right) => (left.override?.order ?? left.index) - (right.override?.order ?? right.index))
                .map(({ item, override }) => ({ ...item, label: override?.label?.trim() || item.label })),
        }))
        .filter((group) => group.items.length > 0);
    const platformNavItems = platformNavGroups.flatMap((group) => group.items);
    const activePlatformItem = platformNavItems
        .sort((left, right) => right.href.length - left.href.length)
        .find((item) => item.href === "/admin" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));
    const currentLabel = platformAdmin
        ? activePlatformItem?.label ?? "Gestão"
        : pathname.startsWith("/dashboard/profile")
        ? copy.profileSecurity
        : currentItem?.copyKey
            ? copy[currentItem.copyKey]
            : currentItem?.label ?? "Workspace";
    const workspaceItems = navItems.filter((item) => !item.settingsOnly);
    const currentOrganization = organizations?.find((organization) => organization.id === activeOrganizationId);

    async function switchOrganization(organizationId: string) {
        if (organizationId === activeOrganizationId || switchingOrganizationId) return;
        setSwitchingOrganizationId(organizationId);
        try {
            const response = await fetch("/api/saas/workspace", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ organizationId }),
            });
            if (!response.ok) throw new Error("Não foi possível trocar de workspace.");
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Não foi possível trocar de workspace.");
        } finally {
            setSwitchingOrganizationId(null);
        }
    }

    return (
        <SidebarProvider>
            <Sidebar collapsible="icon" variant="inset" className="!top-14 !bottom-0 !h-[calc(100svh-3.5rem)]">

                <SidebarContent className={platformAdmin ? "!overflow-y-auto" : undefined}>
                    {platformAdmin ? platformNavGroups.map((group) => (
                        <SidebarGroup key={group.label} className="group-data-[collapsible=icon]:p-[4px]!">
                            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                            <SidebarGroupContent><SidebarMenu>{group.items.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.href === "/admin" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
                                return <SidebarMenuItem key={item.href}><SidebarMenuButton asChild isActive={isActive} tooltip={item.label} size="lg" className="group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center"><Link href={item.href}><Icon aria-hidden="true" /><span className="group-data-[collapsible=icon]:hidden">{item.label}</span></Link></SidebarMenuButton></SidebarMenuItem>;
                            })}</SidebarMenu></SidebarGroupContent>
                        </SidebarGroup>
                    )) : <SidebarGroup className="group-data-[collapsible=icon]:p-[4px]!">
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
                    </SidebarGroup>}
                </SidebarContent>

                <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-[4px]!">
                    <SidebarMenu>
                        {platformAdmin ? (
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip="Voltar ao workspace" className="group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center">
                                    <Link href="/dashboard">
                                        <Home aria-hidden="true" />
                                        <span className="group-data-[collapsible=icon]:hidden">Voltar ao workspace</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ) : null}
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

            <SidebarInset className={platformAdmin ? "mt-14 h-[calc(100svh-3.5rem)] min-h-0 min-w-0 overflow-x-clip overflow-y-auto md:!mt-14 md:!mr-0 md:!mb-0 md:!rounded-r-none" : "min-h-0 min-w-0 overflow-hidden pt-14"}>
                <header className="app-topbar fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2 border-b px-2 sm:px-4">
                    <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
                        <SidebarTrigger aria-label="Abrir ou recolher navegação" className="size-8" />
                        <Link href="/" aria-label="Ir para a tela inicial" className="relative h-8 w-32 shrink-0 rounded-md outline-none ring-ring focus-visible:ring-2">
                            <Image src="/logo.png" alt="SoIZI" fill sizes="128px" priority className="object-contain object-left dark:hidden" />
                            <Image src="/logo-branco.png" alt="SoIZI" fill sizes="128px" priority className="hidden object-contain object-left dark:block" />
                        </Link>
                        <Separator orientation="vertical" className="h-5" />
                        <Breadcrumb className="min-w-0 flex-1 overflow-hidden">
                            <BreadcrumbList className="flex-nowrap overflow-hidden">
                                {platformAdmin && pathname !== "/admin" ? (
                                  <>
                                    <BreadcrumbItem className="hidden sm:inline-flex">
                                        <BreadcrumbLink asChild><Link href="/admin">Gestão</Link></BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator className="hidden sm:block" />
                                  </>
                                ) : !platformAdmin && pathname !== "/dashboard" ? (
                                  <>
                                    <BreadcrumbItem className="hidden sm:inline-flex">
                                        <BreadcrumbLink asChild><Link href="/dashboard">Workspace</Link></BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator className="hidden sm:block" />
                                  </>
                                ) : null}
                                <BreadcrumbItem className="min-w-0">
                                    <BreadcrumbPage className="block max-w-[min(42vw,21rem)] truncate sm:max-w-[24rem]">{currentLabel}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                        {hasTables ? (
                            <Button asChild size="sm" className="hidden md:inline-flex">
                                <Link href="/dashboard/new">
                                    <Plus data-icon="inline-start" />
                                    Nova tabela
                                </Link>
                            </Button>
                        ) : null}
                    </div>

                    <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
                        {organizations && organizations.length > 1 ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="hidden max-w-56 items-center gap-2 lg:inline-flex">
                                        <span className="truncate">{currentOrganization?.name ?? "Workspace"}</span>
                                        <ChevronsUpDown aria-hidden="true" className="size-3.5 shrink-0" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64">
                                    <DropdownMenuLabel>Workspace atual</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {organizations.map((organization) => (
                                        <DropdownMenuItem
                                            key={organization.id}
                                            disabled={Boolean(switchingOrganizationId)}
                                            onSelect={() => void switchOrganization(organization.id)}
                                        >
                                            <Check
                                                aria-hidden="true"
                                                className={organization.id === activeOrganizationId ? "opacity-100" : "opacity-0"}
                                            />
                                            <span className="truncate">{organization.name}</span>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : null}
                        <LanguageSwitcher compact />
                        <ModeToggle />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" className="rounded-full" aria-label={copy.account}>
                                    <Avatar className="size-7 border">
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            <UserCircle2 aria-hidden="true" className="size-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>{copy.myAccount}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {organizations && organizations.length > 1 ? (
                                    <>
                                        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                                        <DropdownMenuGroup>
                                            {organizations.map((organization) => (
                                                <DropdownMenuItem
                                                    key={organization.id}
                                                    disabled={Boolean(switchingOrganizationId)}
                                                    onSelect={() => void switchOrganization(organization.id)}
                                                >
                                                    <Check
                                                        aria-hidden="true"
                                                        className={organization.id === activeOrganizationId ? "opacity-100" : "opacity-0"}
                                                    />
                                                    <span className="truncate">{organization.name}</span>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator />
                                    </>
                                ) : null}
                                {!platformAdmin && (canManageSettings || canAccessPlatformManagement) ? (
                                    <>
                                        <DropdownMenuGroup>
                                            {canManageSettings ? (
                                                <DropdownMenuItem asChild>
                                                    <Link href="/dashboard/settings">
                                                        <Settings2 aria-hidden="true" />
                                                        Configurações
                                                    </Link>
                                                </DropdownMenuItem>
                                            ) : null}
                                            {canAccessPlatformManagement ? (
                                                <DropdownMenuItem asChild>
                                                    <Link href="/admin">
                                                        <ShieldCheck aria-hidden="true" />
                                                        Administração
                                                    </Link>
                                                </DropdownMenuItem>
                                            ) : null}
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator />
                                    </>
                                ) : null}
                                <DropdownMenuGroup>
                                    <DropdownMenuItem asChild>
                                        <Link href="/dashboard/profile">
                                            <UserCircle2 aria-hidden="true" />
                                            {copy.profileSecurity}
                                        </Link>
                                    </DropdownMenuItem>
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
                {platformAdmin ? (
                    <div className="flex min-w-0 flex-1 flex-col">
                        <div className="app-page !h-auto !min-h-max !overflow-visible flex flex-1 flex-col gap-6">
                            {children}
                        </div>
                        <Footer />
                    </div>
                ) : (
                    <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
                )}
            </SidebarInset>
        </SidebarProvider>
    );
}
