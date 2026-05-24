'use client'

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { ExternalAuthButtons } from "@/features/auth/components/ExternalAuthButtons";

function formatOtp(value: string) {
    return value.replace(/\D/g, "").slice(0, 6);
}

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [twoFactorCode, setTwoFactorCode] = useState("");
    const [useTwoFactor, setUseTwoFactor] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await signIn("credentials", {
            email,
            password,
            twoFactorCode: useTwoFactor ? twoFactorCode : "",
            redirect: false,
        });

        setLoading(false);

        if (res?.error) {
            toast.error("Email, senha ou código 2FA inválidos.");
        } else {
            router.push("/dashboard");
            router.refresh(); // Update server components
        }
    };

    return (
        <div className="flex min-h-[calc(100svh-4rem)] w-full items-center justify-center px-4 py-10">
            <Card className="mx-auto grid w-full max-w-5xl overflow-hidden border-border/70 bg-card/95 p-0 shadow-[0_28px_80px_-54px_rgba(15,23,42,0.85)] md:grid-cols-[0.95fr_1fr]">
                <CardHeader className="relative min-h-[360px] overflow-hidden border-b border-border/70 bg-primary px-7 py-8 text-primary-foreground md:border-b-0 md:border-r">
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0)_42%)]" />
                    <div className="absolute bottom-0 left-0 right-0 h-28 bg-[linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,0.18))]" />
                    <div className="relative flex h-full flex-col justify-between gap-10">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex h-11 w-11 items-center justify-center text-white">
                            <LockKeyhole className="h-5 w-5" />
                        </div>
                        <div className="inline-flex items-center gap-1.5 border-white/20 text-xs font-medium text-white">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Seguro
                        </div>
                    </div>
                    <div>
                        <CardTitle className="text-3xl text-white">Entrar</CardTitle>
                        <CardDescription className="mt-2 max-w-sm text-primary-foreground/78">
                            Acesse sua conta SoIZI.
                        </CardDescription>
                    </div>
                    </div>
                </CardHeader>
                <CardContent className="px-6 py-7 sm:px-8">
                    <ExternalAuthButtons />
                    <div className="my-5 h-px bg-border" />
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">E-mail</Label>
                            <div className="relative">
                                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="voce@empresa.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between gap-3">
                                <Label htmlFor="password">Senha</Label>
                                <Link href="#" className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
                                    Esqueci a senha
                                </Link>
                            </div>
                            <div className="relative">
                                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="rounded-lg border border-border/70 bg-muted/[0.16] p-3 transition-colors">
                            <button
                                type="button"
                                onClick={() => {
                                    setUseTwoFactor((value) => !value);
                                    if (useTwoFactor) setTwoFactorCode("");
                                }}
                                className="flex w-full items-center justify-between gap-3 text-left"
                            >
                                <span className="flex items-center gap-2 text-sm font-medium">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background text-primary">
                                        <ShieldCheck className="h-4 w-4" />
                                    </span>
                                    Tenho 2FA ativo
                                </span>
                                <span className={useTwoFactor ? "text-xs font-medium text-primary" : "text-xs text-muted-foreground"}>
                                    {useTwoFactor ? "Ativado" : "Opcional"}
                                </span>
                            </button>

                            {useTwoFactor && (
                                <div className="mt-3 grid gap-2 border-t border-border/70 pt-3">
                                    <Label htmlFor="twoFactorCode">Código do aplicativo</Label>
                                    <Input
                                        id="twoFactorCode"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        maxLength={6}
                                        placeholder="000000"
                                        value={twoFactorCode}
                                        onChange={(e) => setTwoFactorCode(formatOtp(e.target.value))}
                                        className="h-12 text-center font-mono text-lg tracking-[0.45em]"
                                        required={useTwoFactor}
                                    />
                                </div>
                            )}
                        </div>

                        <Button type="submit" className="h-11 w-full gap-2" disabled={loading}>
                            {loading ? "Entrando..." : "Entrar"}
                            {!loading && <ArrowRight className="h-4 w-4" />}
                        </Button>
                        <div className="mt-4 text-center text-sm">
                            Não tem uma conta?{" "}
                            <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
                                Cadastre-se
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
