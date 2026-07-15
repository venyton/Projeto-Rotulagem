'use client'

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { BadgeCheck, KeyRound, QrCode, ScanLine, ShieldCheck, ShieldOff, Smartphone, UserRound } from "lucide-react";
import {
    changePassword,
    confirmTwoFactorSetup,
    disableTwoFactor,
    getProfileInfo,
    startTwoFactorSetup,
    updateProfileInfo,
} from "@/features/profile/actions/profile-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { InterfaceScaleControl } from "@/components/interface-scale-control";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/layout/page-header";

type ProfileData = {
    name: string;
    email: string;
    twoFactorEnabled: boolean;
};

type ActionMessageState = {
    error?: string;
    success?: string;
};

function ActionMessage({ state }: { state?: ActionMessageState }) {
    if (!state?.error && !state?.success) return null;

    return (
        <Alert variant={state.error ? "destructive" : "default"}>
            <AlertDescription>{state.error || state.success}</AlertDescription>
        </Alert>
    );
}

function StatusBadge({ active }: { active: boolean }) {
    return (
        <Badge variant={active ? "success" : "secondary"}>
            {active ? <ShieldCheck aria-hidden="true" /> : <ShieldOff aria-hidden="true" />}
            {active ? "Ativo" : "Opcional"}
        </Badge>
    );
}

function StepTitle({ step, title, active }: { step: string; title: string; active?: boolean }) {
    return (
        <div className="flex items-center gap-3">
            <span
                className={
                    active
                        ? "flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                        : "flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
                }
            >
                {step}
            </span>
            <h3 className="text-sm font-semibold">{title}</h3>
        </div>
    );
}

function OtpField({ id, name, label }: { id: string; name: string; label: string }) {
    return (
        <Field>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <InputOTP
                id={id}
                name={name}
                maxLength={6}
                pattern="^[0-9]+$"
                containerClassName="justify-start"
                autoComplete="one-time-code"
                required
            >
                <InputOTPGroup>
                    {Array.from({ length: 6 }, (_, index) => (
                        <InputOTPSlot key={index} index={index} className="size-11 font-mono text-lg" />
                    ))}
                </InputOTPGroup>
            </InputOTP>
        </Field>
    );
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<ProfileData>({ name: "", email: "", twoFactorEnabled: false });
    const [loadingProfile, setLoadingProfile] = useState(true);

    const [profileState, profileAction, profilePending] = useActionState(updateProfileInfo, {});
    const [passwordState, passwordAction, passwordPending] = useActionState(changePassword, {});
    const [setupState, setupAction, setupPending] = useActionState(startTwoFactorSetup, {});
    const [confirmState, confirmAction, confirmPending] = useActionState(confirmTwoFactorSetup, {});
    const [disableState, disableAction, disablePending] = useActionState(disableTwoFactor, {});

    useEffect(() => {
        let active = true;

        (async () => {
            setLoadingProfile(true);
            try {
                const data = await getProfileInfo();
                if (!active) return;
                if (data) {
                    setProfile(data);
                }
            } finally {
                if (active) {
                    setLoadingProfile(false);
                }
            }
        })();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!profileState?.requireRelogin) return;
        const timer = setTimeout(() => {
            signOut({ callbackUrl: "/login" });
        }, 1200);
        return () => clearTimeout(timer);
    }, [profileState?.requireRelogin]);

    useEffect(() => {
        if (confirmState?.enabled) {
            setProfile((prev) => ({ ...prev, twoFactorEnabled: true }));
        }
    }, [confirmState?.enabled]);

    useEffect(() => {
        if (disableState?.disabled) {
            setProfile((prev) => ({ ...prev, twoFactorEnabled: false }));
        }
    }, [disableState?.disabled]);

    const hasTwoFactorSetup = Boolean(setupState?.qrCodeDataUrl && setupState?.manualSecret);

    return (
        <div className="app-page flex max-w-5xl flex-col gap-6">
            <PageHeader eyebrow="Conta" icon={ShieldCheck} title="Perfil e segurança" description="Atualize seus dados de acesso, preferências e proteção da conta." />

            <Card className="mb-6 border-border/70">
                <CardHeader>
                    <CardTitle className="text-lg">Preferências de visualização</CardTitle>
                    <CardDescription>Ajuste o tamanho global da fonte e das janelas do sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="text-sm font-semibold">Tamanho da interface</div>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Use as setas para reduzir ou ampliar a visualização.
                            </p>
                        </div>
                        <InterfaceScaleControl />
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-border/70">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <UserRound className="h-5 w-5 text-primary" />
                            Dados da Conta
                        </CardTitle>
                        <CardDescription>Nome e email usados no seu acesso ao sistema.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={profileAction}>
                          <FieldGroup className="gap-4">
                            <ActionMessage state={profileState} />
                            <Field>
                                <FieldLabel htmlFor="name">Nome</FieldLabel>
                                <Input
                                    id="name"
                                    name="name"
                                    value={profile.name}
                                    onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
                                    placeholder="Seu nome"
                                    disabled={loadingProfile}
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={profile.email}
                                    onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))}
                                    placeholder="voce@empresa.com"
                                    required
                                    disabled={loadingProfile}
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="profileCurrentPassword">Senha atual para trocar email</FieldLabel>
                                <Input id="profileCurrentPassword" name="profileCurrentPassword" type="password" />
                            </Field>

                            {profile.twoFactorEnabled && (
                                <Field>
                                    <FieldLabel htmlFor="profileTwoFactorCode">Código 2FA para trocar email</FieldLabel>
                                    <Input id="profileTwoFactorCode" name="profileTwoFactorCode" inputMode="numeric" autoComplete="one-time-code" />
                                </Field>
                            )}

                            <Button type="submit" className="w-full" disabled={loadingProfile || profilePending}>
                                {(loadingProfile || profilePending) && <Spinner data-icon="inline-start" />}
                                {(loadingProfile || profilePending) ? "Salvando..." : "Salvar dados da conta"}
                            </Button>
                          </FieldGroup>
                        </form>
                    </CardContent>
                </Card>

                <Card className="border-border/70">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <KeyRound className="h-5 w-5 text-primary" />
                            Alterar Senha
                        </CardTitle>
                        <CardDescription>Use no mínimo 10 caracteres para a nova senha.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={passwordAction}>
                          <FieldGroup className="gap-4">
                            <ActionMessage state={passwordState} />
                            <Field>
                                <FieldLabel htmlFor="currentPassword">Senha atual</FieldLabel>
                                <Input id="currentPassword" name="currentPassword" type="password" required />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="newPassword">Nova senha</FieldLabel>
                                <Input id="newPassword" name="newPassword" type="password" required />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="confirmPassword">Confirmar nova senha</FieldLabel>
                                <Input id="confirmPassword" name="confirmPassword" type="password" required />
                            </Field>
                            {profile.twoFactorEnabled && <OtpField id="twoFactorCode" name="twoFactorCode" label="Código 2FA" />}

                            <Button type="submit" className="w-full" disabled={passwordPending}>
                                {passwordPending && <Spinner data-icon="inline-start" />}
                                {passwordPending ? "Atualizando..." : "Atualizar senha"}
                            </Button>
                          </FieldGroup>
                        </form>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-border/70 lg:col-span-2">
                    <CardHeader className="border-b border-border/70 bg-background">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    {profile.twoFactorEnabled ? <ShieldCheck className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Autenticação em dois fatores</CardTitle>
                                    <CardDescription className="mt-1">
                                        Proteção opcional por aplicativo autenticador.
                                    </CardDescription>
                                </div>
                            </div>
                            <StatusBadge active={profile.twoFactorEnabled} />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {!profile.twoFactorEnabled ? (
                            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
                                <div className="space-y-5 border-b border-border/70 p-6 lg:border-b-0 lg:border-r">
                                    <StepTitle step="1" title="Gerar chave segura" active />
                                    <form action={setupAction}>
                                      <FieldGroup className="gap-4">
                                        <ActionMessage state={setupState} />
                                        <Field>
                                            <FieldLabel htmlFor="twoFactorCurrentPassword">Senha atual</FieldLabel>
                                            <Input id="twoFactorCurrentPassword" name="currentPassword" type="password" required />
                                        </Field>
                                        <Button type="submit" disabled={setupPending} className="h-11 w-full">
                                            {setupPending ? <Spinner data-icon="inline-start" /> : <QrCode data-icon="inline-start" />}
                                            {setupPending ? "Gerando..." : "Gerar QR Code"}
                                        </Button>
                                      </FieldGroup>
                                    </form>

                                    <div className="flex items-start gap-3 rounded-md bg-muted/[0.18] px-3 py-3 text-sm text-muted-foreground">
                                        <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
                                        <span>Use Google Authenticator, Microsoft Authenticator, 1Password ou app compatível.</span>
                                    </div>
                                </div>

                                <div className="space-y-5 p-6">
                                    <StepTitle step="2" title="Escanear e confirmar" active={hasTwoFactorSetup} />

                                    {hasTwoFactorSetup ? (
                                        <div className="grid gap-5 md:grid-cols-[160px_minmax(0,1fr)]">
                                            <div className="flex justify-center rounded-xl bg-white p-4 shadow-sm ring-1 ring-border">
                                                <Image
                                                    src={setupState.qrCodeDataUrl || ""}
                                                    alt="QR Code do 2FA"
                                                    width={144}
                                                    height={144}
                                                    unoptimized
                                                    className="h-36 w-36"
                                                />
                                            </div>
                                            <div className="min-w-0 space-y-3">
                                                <div className="flex items-center gap-2 text-sm font-medium">
                                                    <ScanLine className="h-4 w-4 text-primary" />
                                                    Chave manual
                                                </div>
                                                <div className="rounded-md bg-muted/[0.24] px-3 py-2 font-mono text-xs leading-relaxed text-foreground">
                                                    {setupState.manualSecret}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Guarde a conta no aplicativo antes de confirmar.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <Empty className="min-h-40 p-4">
                                            <EmptyHeader>
                                                <EmptyMedia variant="icon"><QrCode aria-hidden="true" /></EmptyMedia>
                                                <EmptyTitle>QR Code ainda não gerado</EmptyTitle>
                                                <EmptyDescription>Gere a chave segura para continuar.</EmptyDescription>
                                            </EmptyHeader>
                                        </Empty>
                                    )}

                                    {hasTwoFactorSetup && (
                                        <form action={confirmAction} className="space-y-4 border-t border-border/70 pt-5">
                                            <ActionMessage state={confirmState} />
                                            <div className="space-y-2">
                                                <Label htmlFor="confirmCurrentPassword">Senha atual</Label>
                                                <Input id="confirmCurrentPassword" name="confirmCurrentPassword" type="password" required />
                                            </div>
                                            <OtpField id="setupCode" name="setupCode" label="Código do aplicativo" />
                                            <Button type="submit" disabled={confirmPending} className="h-11 w-full">
                                                {confirmPending ? <Spinner data-icon="inline-start" /> : <BadgeCheck data-icon="inline-start" />}
                                                {confirmPending ? "Ativando..." : "Ativar 2FA"}
                                            </Button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
                                <div className="space-y-4 border-b border-border/70 p-6 lg:border-b-0 lg:border-r">
                                    <Alert><ShieldCheck aria-hidden="true" /><AlertDescription>O login desta conta pede senha e código do aplicativo.</AlertDescription></Alert>
                                    <div className="flex items-start gap-3 rounded-md bg-muted/[0.18] px-3 py-3 text-sm text-muted-foreground">
                                        <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
                                        <span>Mantenha o aplicativo autenticador instalado antes de sair.</span>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <form action={disableAction} className="max-w-md space-y-4">
                                        <ActionMessage state={disableState} />
                                        <div className="space-y-2">
                                            <Label htmlFor="disableCurrentPassword">Senha atual</Label>
                                            <Input id="disableCurrentPassword" name="disableCurrentPassword" type="password" required />
                                        </div>
                                        <OtpField id="disableTwoFactorCode" name="disableTwoFactorCode" label="Código 2FA" />
                                        <Button type="submit" variant="destructive" disabled={disablePending} className="h-11 w-full">
                                            {disablePending && <Spinner data-icon="inline-start" />}
                                            {disablePending ? "Desativando..." : "Desativar 2FA"}
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
