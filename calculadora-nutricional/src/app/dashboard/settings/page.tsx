import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Settings2, ShieldCheck, UsersRound } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
import { PageHeader } from "@/components/layout/page-header";
import { ModuleGateMessage } from "@/features/saas/components/ModuleGateMessage";
import { SAAS_MODULES } from "@/features/saas/domain/modules";

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

function TabLink({ tab }: { tab: (typeof tabs)[number] }) {
    const Icon = tab.icon;

    return (
        <TabsTrigger value={tab.key} asChild>
            <Link href={`/dashboard/settings?tab=${tab.key}`} className="inline-flex items-center gap-2">
                <Icon aria-hidden="true" />
                {tab.label}
            </Link>
        </TabsTrigger>
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
        return <ModuleGateMessage moduleKey={SAAS_MODULES.SETTINGS} />;
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
    const isAdministratorProfile = selectedProfile?.systemKey === "ADMIN";
    const defaultNewUserProfile = data.profiles.find((profile) => profile.systemKey === "MEMBER") ?? selectedProfile;

    return (
        <div className="app-page flex flex-col gap-6">
            <PageHeader eyebrow="Configuração" icon={Settings2} title="Usuários e perfis" description="Gerencie participantes, perfis e acessos por funcionalidade." />

            <Tabs value={activeTab}>
              <TabsList>
                {tabs.map((tab) => (
                    <TabLink key={tab.key} tab={tab} />
                ))}
              </TabsList>
            </Tabs>

            {activeTab === "users" ? (
                <div className="grid min-w-0 gap-4">
                    <Card className="min-w-0">
                        <CardHeader>
                            <CardTitle>Novo usuário</CardTitle>
                            <CardDescription>Crie o acesso e defina o perfil inicial.</CardDescription>
                        </CardHeader>
                        <CardContent className="min-w-0">
                            <form action={createOrganizationUser}>
                              <FieldGroup className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_16rem_auto] lg:items-end">
                                <Field>
                                    <FieldLabel htmlFor="new-user-name">Nome</FieldLabel>
                                    <Input id="new-user-name"
                                        name="name"
                                        required
                                        minLength={2}
                                        maxLength={80}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="new-user-email">Email</FieldLabel>
                                    <Input id="new-user-email"
                                        name="email"
                                        type="email"
                                        required
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="new-user-password">Senha temporária</FieldLabel>
                                    <Input id="new-user-password"
                                        name="password"
                                        type="password"
                                        required
                                        minLength={10}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="new-user-profile">Perfil</FieldLabel>
                                    <NativeSelect id="new-user-profile"
                                        name="profileId"
                                        required
                                        defaultValue={defaultNewUserProfile?.id || ""}
                                    >
                                        {data.profiles.map((profile) => (
                                            <NativeSelectOption key={profile.id} value={profile.id}>
                                                {profile.name}
                                            </NativeSelectOption>
                                        ))}
                                    </NativeSelect>
                                </Field>
                                <Button type="submit">
                                    <Plus data-icon="inline-start" />
                                    Criar
                                </Button>
                              </FieldGroup>
                            </form>
                            {params?.userError ? (
                                <Alert variant="destructive" className="mt-3"><AlertDescription>{userErrorMessages[params.userError] || "Não foi possível criar o usuário."}</AlertDescription></Alert>
                            ) : null}
                            {params?.userCreated ? (
                                <Alert className="mt-3"><AlertDescription>Usuário criado.</AlertDescription></Alert>
                            ) : null}
                        </CardContent>
                    </Card>

                    <Card className="min-w-0">
                        <CardHeader>
                            <CardTitle>Controle de usuários</CardTitle>
                            <CardDescription>Usuários ativos e perfil atribuído.</CardDescription>
                        </CardHeader>
                        <CardContent className="min-w-0">
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
                                                <Badge variant={member.active ? "success" : "secondary"}>
                                                    {member.active ? "Ativo" : "Inativo"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <form action={updateMemberProfile} className="flex min-w-[18rem] items-center gap-2">
                                                    <input type="hidden" name="memberId" value={member.id} />
                                                    <NativeSelect
                                                        name="profileId"
                                                        defaultValue={member.profileId || ""}
                                                    >
                                                        {data.profiles.map((profile) => (
                                                            <NativeSelectOption key={profile.id} value={profile.id}>
                                                                {profile.name}
                                                            </NativeSelectOption>
                                                        ))}
                                                    </NativeSelect>
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
                    <div className="flex flex-col gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Novo perfil</CardTitle>
                                <CardDescription>Crie o perfil e depois selecione os módulos.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form action={createOrganizationProfile}>
                                  <FieldGroup className="gap-3">
                                    <Field>
                                      <FieldLabel htmlFor="new-profile-name" className="sr-only">Nome do perfil</FieldLabel>
                                      <Input id="new-profile-name"
                                        name="name"
                                        required
                                        minLength={2}
                                        maxLength={60}
                                        placeholder="Nome do perfil"
                                      />
                                    </Field>
                                    <Field>
                                      <FieldLabel htmlFor="new-profile-description" className="sr-only">Descrição</FieldLabel>
                                      <Textarea id="new-profile-description"
                                        name="description"
                                        maxLength={180}
                                        placeholder="Descrição"
                                      />
                                    </Field>
                                    <Button type="submit" className="w-full">
                                        <Plus data-icon="inline-start" />
                                        Criar perfil
                                    </Button>
                                  </FieldGroup>
                                </form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Perfis</CardTitle>
                                <CardDescription>Escolha um perfil para editar.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-1">
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
                                            <Badge variant="secondary">{profile._count.members}</Badge>
                                        </Link>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div className="flex flex-col gap-1">
                                    <CardTitle>{selectedProfile?.name || "Perfil"}</CardTitle>
                                    <CardDescription>
                                        {selectedProfilePermissions.length} módulo(s) ativo(s)
                                    </CardDescription>
                                </div>
                                {selectedProfile ? (
                                    <Badge variant="secondary">{selectedProfile._count.members} usuário(s)</Badge>
                                ) : null}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {selectedProfile ? (
                                <form action={updateOrganizationProfile} className="flex flex-col gap-6">
                                    <input type="hidden" name="profileId" value={selectedProfile.id} />

                                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                                        <Field>
                                            <FieldLabel htmlFor="profile-name">Nome</FieldLabel>
                                            <Input id="profile-name"
                                                name="name"
                                                required
                                                minLength={2}
                                                maxLength={60}
                                                defaultValue={selectedProfile.name}
                                            />
                                        </Field>
                                        <Field>
                                            <FieldLabel htmlFor="profile-description">Descrição</FieldLabel>
                                            <Input id="profile-description"
                                                name="description"
                                                maxLength={180}
                                                defaultValue={selectedProfile.description || ""}
                                            />
                                        </Field>
                                    </div>

                                    <FieldSet>
                                        <FieldLegend variant="label">Módulos liberados</FieldLegend>
                                        <FieldDescription>
                                            {isAdministratorProfile
                                                ? "O perfil Administrador possui todos os módulos ativos e não pode ser alterado."
                                                : "Marque as funcionalidades que este perfil pode acessar."}
                                        </FieldDescription>
                                        <FieldGroup className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                            {PROFILE_PERMISSION_MODULES.map((moduleKey) => {
                                                const moduleDefinition = getProfilePermissionDefinition(moduleKey);
                                                if (!moduleDefinition) return null;

                                                const enabled = profilePermissionEnabled(selectedProfile.permissions, moduleKey);
                                                const organizationHasModule = enabledOrganizationModules.has(moduleKey);

                                                return (
                                                    <FieldLabel
                                                        key={moduleKey}
                                                        className="min-h-24 rounded-lg border p-3 transition-colors hover:border-primary/35 hover:bg-accent/40"
                                                    >
                                                        <Field orientation="horizontal">
                                                          <Checkbox
                                                            name="moduleKey"
                                                            value={moduleKey}
                                                            defaultChecked={isAdministratorProfile || (enabled && organizationHasModule)}
                                                            disabled={isAdministratorProfile || !organizationHasModule}
                                                          />
                                                          <span className="flex min-w-0 flex-col gap-1">
                                                            <span className="block font-medium">{moduleDefinition.name}</span>
                                                            <span className="block leading-5 text-muted-foreground">
                                                                {moduleDefinition.description}
                                                            </span>
                                                            {!organizationHasModule ? (
                                                                <Badge variant="warning">Fora do plano atual</Badge>
                                                            ) : null}
                                                          </span>
                                                        </Field>
                                                    </FieldLabel>
                                                );
                                            })}
                                        </FieldGroup>
                                    </FieldSet>

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
