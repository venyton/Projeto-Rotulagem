"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!token) {
            toast.error("Token de recuperação inválido ou ausente.");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("As senhas não coincidem.");
            return;
        }

        if (password.length < 8) {
            toast.error("A senha deve ter no mínimo 8 caracteres.");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });

            if (res.ok) {
                toast.success("Senha redefinida com sucesso! Você já pode fazer login.");
                router.push("/login");
            } else {
                const data = await res.json();
                toast.error(data.error || "Ocorreu um erro ao redefinir a senha.");
            }
        } catch (error) {
            toast.error("Erro de conexão. Tente novamente mais tarde.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="text-center space-y-4 py-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                    <Lock className="h-6 w-6 text-destructive" />
                </div>
                <h2 className="text-lg font-semibold">Link Inválido</h2>
                <p className="text-sm text-muted-foreground">
                    O link de recuperação de senha é inválido ou está faltando o token de segurança.
                </p>
                <Button asChild className="mt-4">
                    <Link href="/forgot-password">Solicitar novo link</Link>
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        id="password"
                        type="password"
                        placeholder="Mínimo 8 caracteres"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9"
                        disabled={isLoading}
                        minLength={8}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Digite a senha novamente"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-9"
                        disabled={isLoading}
                        minLength={8}
                    />
                </div>
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isLoading}>
                {isLoading ? "Salvando..." : "Redefinir senha"}
            </Button>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4 md:p-8">
            <div className="mx-auto w-full max-w-md space-y-6">
                <div className="flex flex-col items-center space-y-2 text-center">
                    <h1 className="text-3xl font-bold tracking-tight">Criar nova senha</h1>
                    <p className="text-sm text-muted-foreground">
                        Digite sua nova senha abaixo para recuperar seu acesso.
                    </p>
                </div>

                <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm sm:p-8">
                    <Suspense fallback={<div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>}>
                        <ResetPasswordForm />
                    </Suspense>
                </div>

                <div className="text-center">
                    <Button variant="link" asChild className="text-muted-foreground hover:text-primary">
                        <Link href="/login" className="inline-flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Voltar para o login
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
