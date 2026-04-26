'use client'

import { useActionState, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { UserRound, KeyRound, Loader2 } from "lucide-react";
import { changePassword, getProfileInfo, updateProfileInfo } from "@/features/profile/actions/profile-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

type ProfileData = {
    name: string;
    email: string;
};

export default function ProfilePage() {
    const [profile, setProfile] = useState<ProfileData>({ name: "", email: "" });
    const [loadingProfile, setLoadingProfile] = useState(true);

    const [profileState, profileAction, profilePending] = useActionState(updateProfileInfo, {});
    const [passwordState, passwordAction, passwordPending] = useActionState(changePassword, {});

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

    return (
        <div className="container mx-auto max-w-4xl py-8">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">Perfil e Segurança</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Atualize seus dados de acesso e mantenha sua conta protegida.
                </p>
            </div>

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
                        <CardDescription>Use no mínimo 6 caracteres para a nova senha.</CardDescription>
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

                            <Button type="submit" className="w-full" disabled={passwordPending}>
                                {passwordPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Atualizar senha
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
