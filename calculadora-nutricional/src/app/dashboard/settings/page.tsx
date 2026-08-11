import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2, KeyRound, Link2, Plus, Power, Search, ShieldCheck, Trash2, UserPen, UsersRound } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
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
    canManageAllOrganizationUsers,
    canManageOrganizationSettings,
    getOrganizationSettingsData,
    listActiveOrganizationsForSettings,
    getOrganizationMemberForSettings,
    listOrganizationMembersForSettings,
    profilePermissionEnabled,
} from "@/features/settings/services/organization-settings";
import {
    createManagedOrganization,
    createOrganizationUser,
    createOrganizationProfile,
    linkExistingOrganizationUser,
    removeOrganizationMember,
    resetManagedUserPassword,
    setOrganizationMemberActive,
    updateMemberProfile,
    updateManagedUser,
    updateOrganizationIdentity,
    updateOrganizationProfile,
} from "@/features/settings/actions/settings-actions";
import { PageHeader } from "@/components/layout/page-header";
import { ModuleGateMessage } from "@/features/saas/components/ModuleGateMessage";
import { SAAS_MODULES } from "@/features/saas/domain/modules";

type SettingsPageProps = {
    searchParams?: Promise<{
        tab?: string;
        profile?: string;
        organization?: string;
        organizationSearch?: string;
        userSearch?: string;
        member?: string;
        userError?: string;
        userCreated?: string;
        userLinked?: string;
        organizationUpdated?: string;
        settingsError?: string;
    }>;
};

const tabs = [
    { key: "organizations", label: "Organizações", icon: Building2 },
    { key: "users", label: "Usuários", icon: UsersRound },
    { key: "profiles", label: "Perfis", icon: ShieldCheck },
] as const;

const userErrorMessages: Record<string, string> = {
    invalid: "Preencha nome, email e perfil corretamente.",
    password: "A senha deve ter pelo menos 10 caracteres e não pode conter nome ou email.",
    exists: "Já existe um usuário com este email.",
    profile: "Selecione um perfil válido.",
    cpf: "Informe um CPF válido.",
    not_found: "Não existe um usuário cadastrado com este email.",
    organization: "Selecione uma organização válida.",
    rate_limit: "Muitas alterações em pouco tempo. Aguarde um minuto e tente novamente.",
};

const settingsErrorMessages: Record<string, string> = {
    rate_limit: "Muitas alterações em pouco tempo. Aguarde um minuto e tente novamente.",
    invalid: "Verifique os dados informados.",
    cnpj: "Informe um CNPJ válido.",
    cnpj_exists: "Este CNPJ já está vinculado a outra organização.",
    company_identity: "Informe razão social e CNPJ para cadastrar a empresa.",
    organization_kind: "Uma organização empresarial não pode ser convertida em cadastro individual.",
    forbidden: "Você não tem permissão para concluir esta alteração.",
    organization: "A organização selecionada não está disponível.",
    user_not_found: "O usuário selecionado não está disponível.",
    user_exists: "Já existe outro usuário com este email ou CPF.",
    cpf: "Informe um CPF válido.",
    password: "A nova senha deve ter pelo menos 10 caracteres e não pode conter nome ou email.",
    protected_member: "Não é permitido remover ou inativar o próprio acesso nem o proprietário da organização.",
    profile_name: "Já existe um perfil com esse nome em uma organização. Escolha outro nome para o padrão global.",
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

function organizationSettingsHref(organizationId: string, organizationSearch?: string) {
    const searchParams = new URLSearchParams({ tab: "organizations", organization: organizationId });
    if (organizationSearch) searchParams.set("organizationSearch", organizationSearch);
    return `/dashboard/settings?${searchParams.toString()}`;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
    const params = await searchParams;
    const context = await getCurrentSaaSContext();

    if (!context) {
        redirect("/login");
    }

    if (!canManageOrganizationSettings(context)) {
        return <ModuleGateMessage moduleKey={SAAS_MODULES.SETTINGS} />;
    }

    const canManageAllUsers = canManageAllOrganizationUsers(context);
    const requestedTab = params?.tab;
    const activeTab = requestedTab === "profiles" || requestedTab === "users" || (requestedTab === "organizations" && canManageAllUsers)
        ? requestedTab
        : canManageAllUsers
            ? "organizations"
            : "users";
    const requestedOrganizationId = canManageAllUsers ? params?.organization?.trim() : undefined;
    const [data, organizations, members] = await Promise.all([
        getOrganizationSettingsData(context.organization.id),
        canManageAllUsers ? listActiveOrganizationsForSettings(params?.organizationSearch) : Promise.resolve([]),
        canManageAllUsers ? listOrganizationMembersForSettings(params?.userSearch) : Promise.resolve([]),
    ]);

    if (!data) {
        redirect("/dashboard");
    }

    const selectedOrganizationId = requestedOrganizationId || (params?.organizationSearch ? organizations[0]?.id : context.organization.id);
    const selectedOrganizationData = activeTab === "organizations" && selectedOrganizationId && selectedOrganizationId !== context.organization.id
        ? await getOrganizationSettingsData(selectedOrganizationId)
        : selectedOrganizationId
            ? data
            : null;

    const profileOrganizationId = activeTab === "profiles" && requestedOrganizationId
        ? requestedOrganizationId
        : context.organization.id;
    const profileSettingsData = profileOrganizationId !== context.organization.id
        ? await getOrganizationSettingsData(profileOrganizationId)
        : data;
    const selectedManagedMember = activeTab === "users" && canManageAllUsers && params?.member
        ? await getOrganizationMemberForSettings(params.member)
        : null;

    if (activeTab === "profiles" && !profileSettingsData) {
        redirect("/dashboard/settings?tab=profiles");
    }

    const profileData = profileSettingsData ?? data;

    const enabledOrganizationModules = new Set(
        profileData.entitlements.filter((entitlement) => entitlement.enabled).map((entitlement) => entitlement.moduleKey),
    );
    const selectedProfile =
        profileData.profiles.find((profile) => profile.id === params?.profile) ??
        profileData.profiles.find((profile) => profile.systemKey === "ADMIN") ??
        profileData.profiles[0];
    const selectedProfilePermissions = selectedProfile
        ? PROFILE_PERMISSION_MODULES.filter((moduleKey) => profilePermissionEnabled(selectedProfile.permissions, moduleKey))
        : [];
    const isAdministratorProfile = selectedProfile?.systemKey === "ADMIN";
    const defaultNewUserProfile = data.profiles.find((profile) => profile.systemKey === "MEMBER") ?? selectedProfile;
    const visibleTabs = canManageAllUsers ? tabs : tabs.filter((tab) => tab.key !== "organizations");

    return (
        <div className="app-page flex flex-col gap-6">
            <PageHeader
                title="Organizações e acessos"
                description={canManageAllUsers
                    ? "Encontre uma organização, consulte sua equipe e mantenha os acessos organizados."
                    : "Gerencie a equipe e os perfis do workspace ativo."}
            />

            <Tabs value={activeTab}>
              <TabsList>
                {visibleTabs.map((tab) => (
                    <TabLink key={tab.key} tab={tab} />
                ))}
              </TabsList>
            </Tabs>

            {params?.settingsError ? (
                <Alert variant="destructive"><AlertDescription>{settingsErrorMessages[params.settingsError] || "Não foi possível salvar a alteração."}</AlertDescription></Alert>
            ) : null}

            {activeTab === "organizations" ? (
                <div className="flex flex-col gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Organizações cadastradas</CardTitle>
                            <CardDescription>Busque pelo nome da empresa, razão social, nome fantasia ou pelos quatro últimos dígitos do CNPJ.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <details className="rounded-lg border bg-muted/20 p-4">
                                <summary className="cursor-pointer font-medium">Cadastrar organização</summary>
                                <form action={createManagedOrganization} className="mt-4">
                                    <FieldGroup className="grid gap-3 lg:grid-cols-4">
                                        <Field>
                                            <FieldLabel htmlFor="new-organization-kind">Cadastro</FieldLabel>
                                            <NativeSelect id="new-organization-kind" name="kind" defaultValue="COMPANY">
                                                <NativeSelectOption value="COMPANY">Empresa</NativeSelectOption>
                                                <NativeSelectOption value="INDIVIDUAL">Pessoa física</NativeSelectOption>
                                            </NativeSelect>
                                        </Field>
                                        <Field>
                                            <FieldLabel htmlFor="new-organization-legal-name">Razão social ou nome</FieldLabel>
                                            <Input id="new-organization-legal-name" name="legalName" required maxLength={120} />
                                        </Field>
                                        <Field>
                                            <FieldLabel htmlFor="new-organization-trade-name">Nome fantasia</FieldLabel>
                                            <Input id="new-organization-trade-name" name="tradeName" maxLength={120} />
                                        </Field>
                                        <Field>
                                            <FieldLabel htmlFor="new-organization-cnpj">CNPJ</FieldLabel>
                                            <Input id="new-organization-cnpj" name="cnpj" inputMode="numeric" placeholder="00.000.000/0000-00" />
                                            <FieldDescription>Obrigatório para empresa.</FieldDescription>
                                        </Field>
                                        <Button type="submit"><Plus data-icon="inline-start" />Criar organização</Button>
                                    </FieldGroup>
                                </form>
                            </details>

                            <form method="get">
                                <input type="hidden" name="tab" value="organizations" />
                                <FieldGroup className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                                    <Field>
                                        <FieldLabel htmlFor="organization-search">Buscar organização</FieldLabel>
                                        <Input
                                            id="organization-search"
                                            name="organizationSearch"
                                            defaultValue={params?.organizationSearch || ""}
                                            placeholder="Ex.: Lacta, razão social ou 1234"
                                        />
                                    </Field>
                                    <Button type="submit" variant="outline"><Search data-icon="inline-start" />Buscar</Button>
                                </FieldGroup>
                            </form>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Organização</TableHead>
                                        <TableHead>Cadastro</TableHead>
                                        <TableHead>CNPJ</TableHead>
                                        <TableHead>Usuários</TableHead>
                                        <TableHead className="text-right">Ação</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {organizations.map((organization) => (
                                        <TableRow key={organization.id}>
                                            <TableCell>
                                                <div className="font-medium">{organization.tradeName || organization.name}</div>
                                                {organization.legalName && organization.legalName !== organization.tradeName ? (
                                                    <div className="text-xs text-muted-foreground">{organization.legalName}</div>
                                                ) : null}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{organization.kind === "COMPANY" ? "Empresa" : "Pessoa física"}</Badge>
                                            </TableCell>
                                            <TableCell>{organization.cnpjLastFour ? `••••${organization.cnpjLastFour}` : "—"}</TableCell>
                                            <TableCell>{organization._count.members}</TableCell>
                                            <TableCell className="text-right">
                                                <Button asChild variant={selectedOrganizationData?.id === organization.id ? "secondary" : "outline"} size="sm">
                                                    <Link href={organizationSettingsHref(organization.id, params?.organizationSearch)}>Ver equipe</Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {organizations.length === 0 ? (
                                <Empty>
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon"><Building2 aria-hidden="true" /></EmptyMedia>
                                        <EmptyTitle>Nenhuma organização encontrada</EmptyTitle>
                                        <EmptyDescription>Altere a busca para encontrar outro cadastro.</EmptyDescription>
                                    </EmptyHeader>
                                </Empty>
                            ) : null}
                        </CardContent>
                    </Card>

                    {selectedOrganizationData ? (
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="flex flex-col gap-1">
                                    <CardTitle>{selectedOrganizationData.tradeName || selectedOrganizationData.name}</CardTitle>
                                    <CardDescription>
                                        {selectedOrganizationData.kind === "COMPANY"
                                            ? `${selectedOrganizationData.legalName || selectedOrganizationData.name}${selectedOrganizationData.cnpjLastFour ? ` · CNPJ ••••${selectedOrganizationData.cnpjLastFour}` : ""}`
                                            : "Cadastro individual"}
                                    </CardDescription>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button asChild variant="outline" size="sm"><Link href={`/dashboard/settings?tab=profiles&organization=${selectedOrganizationData.id}`}><ShieldCheck data-icon="inline-start" />Perfis</Link></Button>
                                    {selectedOrganizationData.id !== context.organization.id ? (
                                        <Button asChild variant="ghost" size="sm"><Link href="/dashboard/settings?tab=organizations"><ArrowLeft data-icon="inline-start" />Voltar à lista</Link></Button>
                                    ) : null}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <details className="rounded-lg border bg-muted/20 p-4">
                                <summary className="cursor-pointer font-medium">Editar dados da organização</summary>
                                <form action={updateOrganizationIdentity} className="mt-4">
                                    <input type="hidden" name="organizationId" value={selectedOrganizationData.id} />
                                    <input type="hidden" name="managementTab" value="organizations" />
                                    <FieldGroup className="grid gap-3 lg:grid-cols-4 lg:items-end">
                                        <Field>
                                            <FieldLabel htmlFor="selected-organization-kind">Cadastro</FieldLabel>
                                            <NativeSelect id="selected-organization-kind" name="kind" defaultValue={selectedOrganizationData.kind === "COMPANY" ? "COMPANY" : "INDIVIDUAL"}>
                                                <NativeSelectOption value="INDIVIDUAL">Pessoa física</NativeSelectOption>
                                                <NativeSelectOption value="COMPANY">Empresa</NativeSelectOption>
                                            </NativeSelect>
                                        </Field>
                                        <Field><FieldLabel htmlFor="selected-organization-legal-name">Razão social</FieldLabel><Input id="selected-organization-legal-name" name="legalName" maxLength={120} defaultValue={selectedOrganizationData.legalName || ""} /></Field>
                                        <Field><FieldLabel htmlFor="selected-organization-trade-name">Nome fantasia</FieldLabel><Input id="selected-organization-trade-name" name="tradeName" maxLength={120} defaultValue={selectedOrganizationData.tradeName || ""} /></Field>
                                        <Field>
                                            <FieldLabel htmlFor="selected-organization-cnpj">CNPJ</FieldLabel>
                                            <Input id="selected-organization-cnpj" name="cnpj" inputMode="numeric" placeholder={selectedOrganizationData.cnpjLastFour ? `CNPJ cadastrado ••••${selectedOrganizationData.cnpjLastFour}` : "00.000.000/0000-00"} />
                                            <FieldDescription>Deixe vazio para manter o CNPJ atual.</FieldDescription>
                                        </Field>
                                        <Button type="submit" variant="outline"><Building2 data-icon="inline-start" />Salvar dados</Button>
                                    </FieldGroup>
                                </form>
                            </details>

                            <details className="rounded-lg border bg-muted/20 p-4">
                                <summary className="cursor-pointer font-medium">Adicionar usuário à organização</summary>
                                <form action={createOrganizationUser} className="mt-4">
                                    <input type="hidden" name="organizationId" value={selectedOrganizationData.id} />
                                    <input type="hidden" name="managementTab" value="organizations" />
                                    <FieldGroup className="grid gap-3 lg:grid-cols-2">
                                        <Field><FieldLabel htmlFor="selected-user-name">Nome</FieldLabel><Input id="selected-user-name" name="name" required minLength={2} maxLength={80} /></Field>
                                        <Field><FieldLabel htmlFor="selected-user-email">Email</FieldLabel><Input id="selected-user-email" name="email" type="email" required /></Field>
                                        <Field><FieldLabel htmlFor="selected-user-cpf">CPF</FieldLabel><Input id="selected-user-cpf" name="cpf" inputMode="numeric" required placeholder="000.000.000-00" /></Field>
                                        <Field><FieldLabel htmlFor="selected-user-password">Senha temporária</FieldLabel><Input id="selected-user-password" name="password" type="password" required minLength={10} /></Field>
                                        <Field>
                                            <FieldLabel htmlFor="selected-user-profile">Perfil</FieldLabel>
                                            <NativeSelect id="selected-user-profile" name="profileId" required defaultValue={selectedOrganizationData.profiles.find((profile) => profile.systemKey === "MEMBER")?.id || ""}>
                                                {selectedOrganizationData.profiles.map((profile) => <NativeSelectOption key={profile.id} value={profile.id}>{profile.name}</NativeSelectOption>)}
                                            </NativeSelect>
                                        </Field>
                                        <Button type="submit"><Plus data-icon="inline-start" />Criar usuário</Button>
                                    </FieldGroup>
                                </form>
                                <form action={linkExistingOrganizationUser} className="mt-4">
                                    <input type="hidden" name="organizationId" value={selectedOrganizationData.id} />
                                    <input type="hidden" name="managementTab" value="organizations" />
                                    <FieldGroup className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem_auto] lg:items-end">
                                        <Field><FieldLabel htmlFor="selected-existing-user-email">Vincular usuário existente</FieldLabel><Input id="selected-existing-user-email" name="email" type="email" required placeholder="colaborador@empresa.com" /></Field>
                                        <Field><FieldLabel htmlFor="selected-existing-user-profile">Perfil</FieldLabel><NativeSelect id="selected-existing-user-profile" name="profileId" required defaultValue={selectedOrganizationData.profiles.find((profile) => profile.systemKey === "MEMBER")?.id || ""}>{selectedOrganizationData.profiles.map((profile) => <NativeSelectOption key={profile.id} value={profile.id}>{profile.name}</NativeSelectOption>)}</NativeSelect></Field>
                                        <Button type="submit" variant="outline"><Link2 data-icon="inline-start" />Vincular</Button>
                                    </FieldGroup>
                                </form>
                            </details>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Usuário</TableHead>
                                        <TableHead>Perfil atual</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="w-[22rem]">Alterar perfil</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedOrganizationData.members.map((member) => (
                                        <TableRow key={member.id}>
                                            <TableCell>
                                                <div className="font-medium">{member.user.name || member.user.email}</div>
                                                <div className="text-xs text-muted-foreground">{member.user.email}</div>
                                            </TableCell>
                                            <TableCell>{member.profile?.name || member.role}</TableCell>
                                            <TableCell><Badge variant={member.active ? "success" : "secondary"}>{member.active ? "Ativo" : "Inativo"}</Badge></TableCell>
                                            <TableCell>
                                                <form action={updateMemberProfile} className="flex min-w-[18rem] items-center gap-2">
                                                    <input type="hidden" name="memberId" value={member.id} />
                                                    <NativeSelect name="profileId" defaultValue={member.profileId || ""}>
                                                        {selectedOrganizationData.profiles.map((profile) => (
                                                            <NativeSelectOption key={profile.id} value={profile.id}>{profile.name}</NativeSelectOption>
                                                        ))}
                                                    </NativeSelect>
                                                    <Button type="submit" variant="outline" size="sm">Salvar</Button>
                                                </form>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button asChild variant="ghost" size="sm"><Link href={`/dashboard/settings?tab=users&member=${member.id}`}><UserPen data-icon="inline-start" />Gerenciar</Link></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {selectedOrganizationData.members.length === 0 ? (
                                <Empty>
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon"><UsersRound aria-hidden="true" /></EmptyMedia>
                                        <EmptyTitle>Sem usuários vinculados</EmptyTitle>
                                        <EmptyDescription>Essa organização ainda não possui pessoas com acesso à plataforma.</EmptyDescription>
                                    </EmptyHeader>
                                </Empty>
                            ) : null}
                        </CardContent>
                    </Card>
                    ) : null}
                </div>
            ) : null}

            {activeTab === "users" && canManageAllUsers ? (
                <div className="flex flex-col gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Todos os usuários</CardTitle>
                            <CardDescription>Cada linha representa o acesso de uma pessoa em uma organização. Uma mesma pessoa pode aparecer em mais de uma organização.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <form method="get">
                                <input type="hidden" name="tab" value="users" />
                                <FieldGroup className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                                    <Field><FieldLabel htmlFor="user-search">Buscar usuário ou organização</FieldLabel><Input id="user-search" name="userSearch" defaultValue={params?.userSearch || ""} placeholder="Nome, email ou organização" /></Field>
                                    <Button type="submit" variant="outline"><Search data-icon="inline-start" />Buscar</Button>
                                </FieldGroup>
                            </form>
                            <Table>
                                <TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>Organização</TableHead><TableHead>Perfil</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {members.map((member) => (
                                        <TableRow key={member.id}>
                                            <TableCell><div className="font-medium">{member.user.name || member.user.email}</div><div className="text-xs text-muted-foreground">{member.user.email}</div></TableCell>
                                            <TableCell>{member.organization.tradeName || member.organization.name}</TableCell>
                                            <TableCell>{member.profile?.name || member.role}</TableCell>
                                            <TableCell><Badge variant={member.active ? "success" : "secondary"}>{member.active ? "Ativo" : "Inativo"}</Badge></TableCell>
                                            <TableCell className="text-right"><Button asChild variant={selectedManagedMember?.id === member.id ? "secondary" : "outline"} size="sm"><Link href={`/dashboard/settings?tab=users&member=${member.id}${params?.userSearch ? `&userSearch=${encodeURIComponent(params.userSearch)}` : ""}`}><UserPen data-icon="inline-start" />Gerenciar</Link></Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {members.length === 0 ? <Empty><EmptyHeader><EmptyMedia variant="icon"><UsersRound aria-hidden="true" /></EmptyMedia><EmptyTitle>Nenhum usuário encontrado</EmptyTitle><EmptyDescription>Altere a busca para encontrar outro usuário ou organização.</EmptyDescription></EmptyHeader></Empty> : null}
                        </CardContent>
                    </Card>

                    {selectedManagedMember ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>{selectedManagedMember.user.name || selectedManagedMember.user.email}</CardTitle>
                                <CardDescription>Acesso em {selectedManagedMember.organization.tradeName || selectedManagedMember.organization.name}. A senha atual nunca é exibida; defina uma nova senha temporária quando necessário.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4 xl:grid-cols-2">
                                <form action={updateManagedUser}>
                                    <input type="hidden" name="memberId" value={selectedManagedMember.id} />
                                    <FieldGroup className="gap-3">
                                        <Field><FieldLabel htmlFor="managed-user-name">Nome</FieldLabel><Input id="managed-user-name" name="name" required minLength={2} maxLength={80} defaultValue={selectedManagedMember.user.name || ""} /></Field>
                                        <Field><FieldLabel htmlFor="managed-user-email">Email</FieldLabel><Input id="managed-user-email" name="email" type="email" required defaultValue={selectedManagedMember.user.email} /></Field>
                                        <Field><FieldLabel htmlFor="managed-user-cpf">CPF</FieldLabel><Input id="managed-user-cpf" name="cpf" inputMode="numeric" placeholder={selectedManagedMember.user.cpfLastFour ? `CPF cadastrado ••••${selectedManagedMember.user.cpfLastFour}` : "000.000.000-00"} /><FieldDescription>Deixe vazio para manter o CPF atual.</FieldDescription></Field>
                                        <Button type="submit"><UserPen data-icon="inline-start" />Salvar dados</Button>
                                    </FieldGroup>
                                </form>

                                <div className="flex flex-col gap-4">
                                    <form action={resetManagedUserPassword}>
                                        <input type="hidden" name="memberId" value={selectedManagedMember.id} />
                                        <FieldGroup className="gap-3"><Field><FieldLabel htmlFor="managed-user-password">Nova senha temporária</FieldLabel><Input id="managed-user-password" name="password" type="password" required minLength={10} /><FieldDescription>A senha anterior não pode ser visualizada.</FieldDescription></Field><Button type="submit" variant="outline"><KeyRound data-icon="inline-start" />Definir nova senha</Button></FieldGroup>
                                    </form>
                                    <form action={updateMemberProfile} className="flex flex-col gap-3"><input type="hidden" name="memberId" value={selectedManagedMember.id} /><Field><FieldLabel htmlFor="managed-user-profile">Perfil nesta organização</FieldLabel><NativeSelect id="managed-user-profile" name="profileId" defaultValue={selectedManagedMember.profileId || ""}>{selectedManagedMember.organization.profiles.map((profile) => <NativeSelectOption key={profile.id} value={profile.id}>{profile.name}</NativeSelectOption>)}</NativeSelect></Field><Button type="submit" variant="outline"><ShieldCheck data-icon="inline-start" />Salvar perfil</Button></form>
                                    <div className="flex flex-wrap gap-2">
                                        <form action={setOrganizationMemberActive}><input type="hidden" name="memberId" value={selectedManagedMember.id} /><input type="hidden" name="active" value={selectedManagedMember.active ? "false" : "true"} /><Button type="submit" variant="outline"><Power data-icon="inline-start" />{selectedManagedMember.active ? "Inativar acesso" : "Ativar acesso"}</Button></form>
                                        <details className="rounded-md border border-destructive/30 px-3 py-2"><summary className="cursor-pointer text-sm font-medium text-destructive">Remover acesso</summary><form action={removeOrganizationMember} className="mt-3 flex flex-col gap-2"><input type="hidden" name="memberId" value={selectedManagedMember.id} /><Field><FieldLabel htmlFor="remove-confirmation">Digite REMOVER para confirmar</FieldLabel><Input id="remove-confirmation" name="confirmation" required /></Field><Button type="submit" variant="destructive"><Trash2 data-icon="inline-start" />Remover da organização</Button></form></details>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}
                </div>
            ) : null}

            {activeTab === "users" && !canManageAllUsers ? (
                <div className="grid min-w-0 gap-4">
                    <Card className="min-w-0">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Building2 aria-hidden="true" />Dados da organização</CardTitle>
                            <CardDescription>
                                Classifique este workspace como individual ou empresa. O CNPJ é armazenado de forma protegida e apenas os quatro últimos dígitos ficam visíveis.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="min-w-0">
                            <form action={updateOrganizationIdentity}>
                                <FieldGroup className="grid gap-3 lg:grid-cols-4 lg:items-end">
                                    <Field>
                                        <FieldLabel htmlFor="organization-kind">Cadastro</FieldLabel>
                                        <NativeSelect id="organization-kind" name="kind" defaultValue={data.kind === "COMPANY" ? "COMPANY" : "INDIVIDUAL"}>
                                            <NativeSelectOption value="INDIVIDUAL">Pessoa física</NativeSelectOption>
                                            <NativeSelectOption value="COMPANY">Empresa</NativeSelectOption>
                                        </NativeSelect>
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="organization-legal-name">Razão social</FieldLabel>
                                        <Input id="organization-legal-name" name="legalName" maxLength={120} defaultValue={data.legalName || ""} />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="organization-trade-name">Nome fantasia</FieldLabel>
                                        <Input id="organization-trade-name" name="tradeName" maxLength={120} defaultValue={data.tradeName || ""} />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="organization-cnpj">CNPJ</FieldLabel>
                                        <Input id="organization-cnpj" name="cnpj" inputMode="numeric" placeholder={data.cnpjLastFour ? `CNPJ cadastrado ••••${data.cnpjLastFour}` : "00.000.000/0000-00"} />
                                        <FieldDescription>{data.cnpjLastFour ? "Deixe vazio para manter o CNPJ atual." : "Obrigatório para empresa."}</FieldDescription>
                                    </Field>
                                    <Button type="submit" variant="outline"><Building2 data-icon="inline-start" />Salvar organização</Button>
                                </FieldGroup>
                            </form>
                            {params?.organizationUpdated ? <Alert className="mt-3"><AlertDescription>Dados da organização atualizados.</AlertDescription></Alert> : null}
                        </CardContent>
                    </Card>

                    <div className="grid gap-4 xl:grid-cols-2">
                    <Card className="min-w-0">
                        <CardHeader>
                            <CardTitle>Novo usuário</CardTitle>
                            <CardDescription>Crie o acesso de um colaborador e defina seu perfil inicial.</CardDescription>
                        </CardHeader>
                        <CardContent className="min-w-0">
                            <form action={createOrganizationUser}>
                              <FieldGroup className="grid gap-3 lg:grid-cols-2">
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
                                    <FieldLabel htmlFor="new-user-cpf">CPF</FieldLabel>
                                    <Input id="new-user-cpf" name="cpf" inputMode="numeric" required placeholder="000.000.000-00" />
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
                            <CardTitle>Vincular usuário existente</CardTitle>
                            <CardDescription>Adicione ao workspace uma pessoa que já possui acesso à plataforma.</CardDescription>
                        </CardHeader>
                        <CardContent className="min-w-0">
                            <form action={linkExistingOrganizationUser}>
                                <FieldGroup className="grid gap-3 lg:grid-cols-[1fr_16rem_auto] lg:items-end">
                                    <Field>
                                        <FieldLabel htmlFor="existing-user-email">Email</FieldLabel>
                                        <Input id="existing-user-email" name="email" type="email" required placeholder="colaborador@empresa.com" />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="existing-user-profile">Perfil</FieldLabel>
                                        <NativeSelect id="existing-user-profile" name="profileId" required defaultValue={defaultNewUserProfile?.id || ""}>
                                            {data.profiles.map((profile) => (
                                                <NativeSelectOption key={profile.id} value={profile.id}>{profile.name}</NativeSelectOption>
                                            ))}
                                        </NativeSelect>
                                    </Field>
                                    <Button type="submit"><Link2 data-icon="inline-start" />Vincular</Button>
                                </FieldGroup>
                            </form>
                            {params?.userLinked ? <Alert className="mt-3"><AlertDescription>Usuário vinculado ao workspace ativo.</AlertDescription></Alert> : null}
                        </CardContent>
                    </Card>
                    </div>

                    <Card className="min-w-0">
                        <CardHeader>
                            <CardTitle>Equipe do workspace ativo</CardTitle>
                            <CardDescription>Usuários vinculados a {data.tradeName || data.name}, com seus perfis e status de acesso.</CardDescription>
                        </CardHeader>
                        <CardContent className="min-w-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Usuário</TableHead>
                                        <TableHead>Perfil atual</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="w-[22rem]">Alterar perfil</TableHead>
                                        <TableHead>Ações</TableHead>
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
                                            <TableCell>
                                                <div className="flex min-w-[11rem] flex-col gap-2">
                                                    <form action={setOrganizationMemberActive}><input type="hidden" name="memberId" value={member.id} /><input type="hidden" name="active" value={member.active ? "false" : "true"} /><Button type="submit" variant="outline" size="sm"><Power data-icon="inline-start" />{member.active ? "Inativar" : "Ativar"}</Button></form>
                                                    <details><summary className="cursor-pointer text-sm text-muted-foreground">Senha ou remoção</summary><div className="mt-2 flex flex-col gap-2"><form action={resetManagedUserPassword} className="flex flex-col gap-2"><input type="hidden" name="memberId" value={member.id} /><Input name="password" type="password" minLength={10} required placeholder="Nova senha temporária" /><Button type="submit" variant="outline" size="sm"><KeyRound data-icon="inline-start" />Redefinir senha</Button></form><form action={removeOrganizationMember} className="flex flex-col gap-2"><input type="hidden" name="memberId" value={member.id} /><Input name="confirmation" required placeholder="Digite REMOVER" /><Button type="submit" variant="destructive" size="sm"><Trash2 data-icon="inline-start" />Remover acesso</Button></form></div></details>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {data.members.length === 0 ? (
                                <Empty>
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon"><UsersRound aria-hidden="true" /></EmptyMedia>
                                        <EmptyTitle>Sem usuários vinculados</EmptyTitle>
                                        <EmptyDescription>Crie um usuário ou vincule uma pessoa já cadastrada à organização.</EmptyDescription>
                                    </EmptyHeader>
                                </Empty>
                            ) : null}
                        </CardContent>
                    </Card>
                </div>
            ) : activeTab === "profiles" ? (
                <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
                    <div className="flex flex-col gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Novo perfil</CardTitle>
                                <CardDescription>Crie um perfil local para esta organização ou um padrão global para todos os tenants.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form action={createOrganizationProfile}>
                                  <input type="hidden" name="organizationId" value={profileData.id} />
                                  <input type="hidden" name="managementTab" value="profiles" />
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
                                    {canManageAllUsers ? (
                                        <Field>
                                            <FieldLabel htmlFor="new-profile-scope">Aplicação</FieldLabel>
                                            <NativeSelect id="new-profile-scope" name="scope" defaultValue="ORGANIZATION">
                                                <NativeSelectOption value="ORGANIZATION">Somente esta organização</NativeSelectOption>
                                                <NativeSelectOption value="GLOBAL">Padrão global para todas as organizações</NativeSelectOption>
                                            </NativeSelect>
                                        </Field>
                                    ) : null}
                                    <FieldSet>
                                        <FieldLegend variant="label">Módulos do perfil</FieldLegend>
                                        <FieldGroup className="grid gap-2">
                                            {PROFILE_PERMISSION_MODULES.map((moduleKey) => {
                                                const definition = getProfilePermissionDefinition(moduleKey);
                                                if (!definition) return null;
                                                const available = enabledOrganizationModules.has(moduleKey);
                                                return <Field key={moduleKey} orientation="horizontal" data-disabled={!available}><Checkbox name="moduleKey" value={moduleKey} disabled={!available} /><FieldLabel>{definition.name}</FieldLabel></Field>;
                                            })}
                                        </FieldGroup>
                                    </FieldSet>
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
                                {profileData.profiles.map((profile) => {
                                    const active = selectedProfile?.id === profile.id;

                                    return (
                                        <Link
                                            key={profile.id}
                                            href={`/dashboard/settings?tab=profiles&organization=${profileData.id}&profile=${profile.id}`}
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
                                    <input type="hidden" name="organizationId" value={profileData.id} />
                                    <input type="hidden" name="managementTab" value="profiles" />

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
                                                : selectedProfile.globalTemplateId
                                                    ? "Este é um padrão global. As alterações serão aplicadas a todas as organizações."
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
            ) : null}
        </div>
    );
}
