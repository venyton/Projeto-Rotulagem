'use client'

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { BadgeCheck, CheckCircle2, KeyRound, Loader2, QrCode, ScanLine, ShieldCheck, ShieldOff, Smartphone, UserRound } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { InterfaceScaleControl } from "@/components/interface-scale-control";

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
        <p
            className={
                state.error
                    ? "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    : "rounded-md border border-emerald-300/60 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
            }
        >
            {state.error || state.success}
        </p>
    );
}

function StatusBadge({ active }: { active: boolean }) {
    return (
        <span
            className={
                active
                    ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                    : "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/[0.28] px-3 py-1 text-xs font-medium text-muted-foreground"
            }
        >
            {active ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
            {active ? "Ativo" : "Opcional"}
        </span>
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
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <Input
                id={id}
                name={name}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                placeholder="000000"
                className="h-12 text-center font-mono text-lg tracking-[0.45em]"
                required
            />
        </div>
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
        <div className="container mx-auto max-w-4xl py-8">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">Perfil e Segurança</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Atualize seus dados de acesso e mantenha sua conta protegida.
                </p>
            </div>

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
                        <form action={profileAction} className="space-y-4">
                            {profileState?.error && (
                                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                    {profileState.error}
                                </p>
                            )}
                            {profileState?.success && (
                                <p className="rounded-md border border-emerald-300/60 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                                    {profileState.success}
                                </p>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="name">Nome</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    value={profile.name}
                                    onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
                                    placeholder="Seu nome"
                                    disabled={loadingProfile}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
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
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="profileCurrentPassword">Senha atual para trocar email</Label>
                                <Input id="profileCurrentPassword" name="profileCurrentPassword" type="password" />
                            </div>

                            {profile.twoFactorEnabled && (
                                <div className="space-y-2">
                                    <Label htmlFor="profileTwoFactorCode">Código 2FA para trocar email</Label>
                                    <Input id="profileTwoFactorCode" name="profileTwoFactorCode" inputMode="numeric" autoComplete="one-time-code" />
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={loadingProfile || profilePending}>
                                {(loadingProfile || profilePending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar dados da conta
                            </Button>
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
                        <form action={passwordAction} className="space-y-4">
                            {passwordState?.error && (
                                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                    {passwordState.error}
                                </p>
                            )}
                            {passwordState?.success && (
                                <p className="rounded-md border border-emerald-300/60 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                                    {passwordState.success}
                                </p>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Senha atual</Label>
                                <Input id="currentPassword" name="currentPassword" type="password" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">Nova senha</Label>
                                <Input id="newPassword" name="newPassword" type="password" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                                <Input id="confirmPassword" name="confirmPassword" type="password" required />
                            </div>
                            {profile.twoFactorEnabled && <OtpField id="twoFactorCode" name="twoFactorCode" label="Código 2FA" />}

                            <Button type="submit" className="w-full" disabled={passwordPending}>
                                {passwordPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Atualizar senha
                            </Button>
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
                                    <form action={setupAction} className="space-y-4">
                                        <ActionMessage state={setupState} />
                                        <div className="space-y-2">
                                            <Label htmlFor="twoFactorCurrentPassword">Senha atual</Label>
                                            <Input id="twoFactorCurrentPassword" name="currentPassword" type="password" required />
                                        </div>
                                        <Button type="submit" disabled={setupPending} className="h-11 w-full gap-2">
                                            {setupPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                                            Gerar QR Code
                                        </Button>
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
                                        <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/[0.12] px-6 text-center">
                                            <div className="space-y-2">
                                                <QrCode className="mx-auto h-8 w-8 text-muted-foreground" />
                                                <p className="text-sm text-muted-foreground">Gere o QR Code para continuar.</p>
                                            </div>
                                        </div>
                                    )}

                                    {hasTwoFactorSetup && (
                                        <form action={confirmAction} className="space-y-4 border-t border-border/70 pt-5">
                                            <ActionMessage state={confirmState} />
                                            <div className="space-y-2">
                                                <Label htmlFor="confirmCurrentPassword">Senha atual</Label>
                                                <Input id="confirmCurrentPassword" name="confirmCurrentPassword" type="password" required />
                                            </div>
                                            <OtpField id="setupCode" name="setupCode" label="Código do aplicativo" />
                                            <Button type="submit" disabled={confirmPending} className="h-11 w-full gap-2">
                                                {confirmPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                                                Ativar 2FA
                                            </Button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
                                <div className="space-y-4 border-b border-border/70 p-6 lg:border-b-0 lg:border-r">
                                    <div className="flex items-start gap-3 rounded-md bg-emerald-500/10 px-3 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                        <span>O login desta conta pede senha e código do aplicativo.</span>
                                    </div>
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
                                            {disablePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Desativar 2FA
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
