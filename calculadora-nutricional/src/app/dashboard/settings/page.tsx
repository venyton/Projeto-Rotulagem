import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Settings2, ShieldCheck, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { getProfilePermissionDefinition, PROFILE_PERMISSION_MODULES } from "@/features/settings/domain/profile-permissions";
import {
    canManageOrganizationSettings,
    getOrganizationSettingsData,
    profilePermissionEnabled,
} from "@/features/settings/services/organization-settings";
import {
    createOrganizationUser,
    createOrganizationProfile,
    updateMemberProfile,
    updateOrganizationProfile,
} from "@/features/settings/actions/settings-actions";

type SettingsPageProps = {
    searchParams?: Promise<{ tab?: string; profile?: string; userError?: string; userCreated?: string }>;
};

const tabs = [
    { key: "users", label: "Usuários", icon: UsersRound },
    { key: "profiles", label: "Perfis", icon: ShieldCheck },
] as const;

const userErrorMessages: Record<string, string> = {
    invalid: "Preencha nome e email corretamente.",
    password: "A senha deve ter pelo menos 10 caracteres e não pode conter nome ou email.",
    exists: "Já existe um usuário com este email.",
    profile: "Selecione um perfil válido.",
};

function TabLink({ tab, active }: { tab: (typeof tabs)[number]; active: boolean }) {
    const Icon = tab.icon;

    return (
        <Button
            variant={active ? "secondary" : "ghost"}
            asChild
            className="h-9 rounded-md px-3 text-sm"
        >
            <Link href={`/dashboard/settings?tab=${tab.key}`} className="inline-flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {tab.label}
            </Link>
        </Button>
    );
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
    const params = await searchParams;
    const activeTab = params?.tab === "profiles" ? "profiles" : "users";
    const context = await getCurrentSaaSContext();

    if (!context) {
        redirect("/login");
    }

    if (!canManageOrganizationSettings(context)) {
        redirect("/dashboard");
    }

    const data = await getOrganizationSettingsData(context.organization.id);

    if (!data) {
        redirect("/dashboard");
    }

    const enabledOrganizationModules = new Set(
        data.entitlements.filter((entitlement) => entitlement.enabled).map((entitlement) => entitlement.moduleKey),
    );
    const selectedProfile =
        data.profiles.find((profile) => profile.id === params?.profile) ??
        data.profiles.find((profile) => profile.systemKey === "ADMIN") ??
        data.profiles[0];
    const selectedProfilePermissions = selectedProfile
        ? PROFILE_PERMISSION_MODULES.filter((moduleKey) => profilePermissionEnabled(selectedProfile.permissions, moduleKey))
        : [];
    const defaultNewUserProfile = data.profiles.find((profile) => profile.systemKey === "MEMBER") ?? selectedProfile;

    return (
        <div className="app-page space-y-6">
            <header className="app-header-panel flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Settings2 className="h-4 w-4 text-primary" />
                        Configuração
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight">Usuários e perfis</h1>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                        Veja os usuários do workspace, defina o perfil de cada um e controle o acesso por funcionalidade.
                    </p>
                </div>
            </header>

            <div className="app-tabs">
                {tabs.map((tab) => (
                    <TabLink key={tab.key} tab={tab} active={activeTab === tab.key} />
                ))}
            </div>

            {activeTab === "users" ? (
                <div className="grid gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Novo usuário</CardTitle>
                            <CardDescription>Crie o acesso e defina o perfil inicial.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form action={createOrganizationUser} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_16rem_auto] lg:items-end">
                                <label className="space-y-1">
                                    <span className="text-sm font-medium">Nome</span>
                                    <input
                                        name="name"
                                        required
                                        minLength={2}
                                        maxLength={80}
                                        className="app-input"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-sm font-medium">Email</span>
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        className="app-input"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-sm font-medium">Senha temporária</span>
                                    <input
                                        name="password"
                                        type="password"
                                        required
                                        minLength={10}
                                        className="app-input"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-sm font-medium">Perfil</span>
                                    <select
                                        name="profileId"
                                        required
                                        defaultValue={defaultNewUserProfile?.id || ""}
                                        className="app-input"
                                    >
                                        {data.profiles.map((profile) => (
                                            <option key={profile.id} value={profile.id}>
                                                {profile.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <Button type="submit">
                                    <Plus className="h-4 w-4" />
                                    Criar
                                </Button>
                            </form>
                            {params?.userError ? (
                                <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                                    {userErrorMessages[params.userError] || "Não foi possível criar o usuário."}
                                </p>
                            ) : null}
                            {params?.userCreated ? (
                                <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
                                    Usuário criado.
                                </p>
                            ) : null}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Controle de usuários</CardTitle>
                            <CardDescription>Usuários ativos e perfil atribuído.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Usuário</TableHead>
                                        <TableHead>Perfil atual</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="w-[22rem]">Alterar perfil</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.members.map((member) => (
                                        <TableRow key={member.id}>
                                            <TableCell>
                                                <div className="font-medium">{member.user.name || member.user.email}</div>
                                                <div className="text-xs text-muted-foreground">{member.user.email}</div>
                                            </TableCell>
                                            <TableCell>{member.profile?.name || member.role}</TableCell>
                                            <TableCell>
                                                <span
                                                    className={cn(
                                                        "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                                                        member.active
                                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                                            : "bg-muted text-muted-foreground",
                                                    )}
                                                >
                                                    {member.active ? "Ativo" : "Inativo"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <form action={updateMemberProfile} className="flex min-w-[18rem] items-center gap-2">
                                                    <input type="hidden" name="memberId" value={member.id} />
                                                    <select
                                                        name="profileId"
                                                        defaultValue={member.profileId || ""}
                                                        className="app-input flex-1"
                                                    >
                                                        {data.profiles.map((profile) => (
                                                            <option key={profile.id} value={profile.id}>
                                                                {profile.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <Button type="submit" variant="outline" size="sm">
                                                        Salvar
                                                    </Button>
                                                </form>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Novo perfil</CardTitle>
                                <CardDescription>Crie o perfil e depois selecione os módulos.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form action={createOrganizationProfile} className="space-y-3">
                                    <input
                                        name="name"
                                        required
                                        minLength={2}
                                        maxLength={60}
                                        placeholder="Nome do perfil"
                                        className="app-input"
                                    />
                                    <textarea
                                        name="description"
                                        maxLength={180}
                                        placeholder="Descrição"
                                        className="app-textarea"
                                    />
                                    <Button type="submit" className="w-full">
                                        <Plus className="h-4 w-4" />
                                        Criar perfil
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Perfis</CardTitle>
                                <CardDescription>Escolha um perfil para editar.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                {data.profiles.map((profile) => {
                                    const active = selectedProfile?.id === profile.id;

                                    return (
                                        <Link
                                            key={profile.id}
                                            href={`/dashboard/settings?tab=profiles&profile=${profile.id}`}
                                            className={cn(
                                                "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                                                active ? "bg-secondary text-secondary-foreground" : "hover:bg-secondary/70",
                                            )}
                                        >
                                            <span className="min-w-0 truncate font-medium">{profile.name}</span>
                                            <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                                                {profile._count.members}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div className="space-y-1">
                                    <CardTitle>{selectedProfile?.name || "Perfil"}</CardTitle>
                                    <CardDescription>
                                        {selectedProfilePermissions.length} módulo(s) ativo(s)
                                    </CardDescription>
                                </div>
                                {selectedProfile ? (
                                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                                        {selectedProfile._count.members} usuário(s)
                                    </span>
                                ) : null}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {selectedProfile ? (
                                <form action={updateOrganizationProfile} className="space-y-6">
                                    <input type="hidden" name="profileId" value={selectedProfile.id} />

                                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                                        <label className="space-y-1">
                                            <span className="text-sm font-medium">Nome</span>
                                            <input
                                                name="name"
                                                required
                                                minLength={2}
                                                maxLength={60}
                                                defaultValue={selectedProfile.name}
                                                className="app-input"
                                            />
                                        </label>
                                        <label className="space-y-1">
                                            <span className="text-sm font-medium">Descrição</span>
                                            <input
                                                name="description"
                                                maxLength={180}
                                                defaultValue={selectedProfile.description || ""}
                                                className="app-input"
                                            />
                                        </label>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <h3 className="text-sm font-semibold">Módulos liberados</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Marque as funcionalidades que este perfil pode acessar.
                                            </p>
                                        </div>

                                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                            {PROFILE_PERMISSION_MODULES.map((moduleKey) => {
                                                const moduleDefinition = getProfilePermissionDefinition(moduleKey);
                                                if (!moduleDefinition) return null;

                                                const enabled = profilePermissionEnabled(selectedProfile.permissions, moduleKey);
                                                const organizationHasModule = enabledOrganizationModules.has(moduleKey);

                                                return (
                                                    <label
                                                        key={moduleKey}
                                                        className="app-subpanel flex min-h-24 items-start gap-3 text-sm transition-colors hover:border-primary/35 hover:bg-secondary/40"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            name="moduleKey"
                                                            value={moduleKey}
                                                            defaultChecked={enabled}
                                                            className="mt-1 h-4 w-4 shrink-0 accent-primary"
                                                        />
                                                        <span className="min-w-0 space-y-1">
                                                            <span className="block font-medium">{moduleDefinition.name}</span>
                                                            <span className="block leading-5 text-muted-foreground">
                                                                {moduleDefinition.description}
                                                            </span>
                                                            {!organizationHasModule ? (
                                                                <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                                                    Fora do plano atual
                                                                </span>
                                                            ) : null}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <Button type="submit">Salvar alterações</Button>
                                    </div>
                                </form>
                            ) : (
                                <p className="text-sm text-muted-foreground">Nenhum perfil encontrado.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
