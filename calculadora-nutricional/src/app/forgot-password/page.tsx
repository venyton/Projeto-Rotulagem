"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (res.ok) {
                setIsSuccess(true);
            } else {
                const data = await res.json();
                toast.error(data.error || "Ocorreu um erro. Tente novamente.");
            }
        } catch (error) {
            toast.error("Erro de conexão. Tente novamente mais tarde.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4 md:p-8">
            <div className="mx-auto w-full max-w-md space-y-6">
                <div className="flex flex-col items-center space-y-2 text-center">
                    <h1 className="text-3xl font-bold tracking-tight">Recuperar senha</h1>
                    <p className="text-sm text-muted-foreground">
                        {!isSuccess
                            ? "Digite seu e-mail e enviaremos um link para você redefinir sua senha."
                            : "Verifique sua caixa de entrada para continuar."}
                    </p>
                </div>

                <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm sm:p-8">
                    {!isSuccess ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
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
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isLoading}>
                                {isLoading ? "Enviando..." : "Enviar link de recuperação"}
                            </Button>
                        </form>
                    ) : (
                        <div className="flex flex-col items-center justify-center space-y-4 py-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
                            </div>
                            <p className="text-center text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                Link enviado! Cheque seu e-mail.
                            </p>
                            <Button 
                                type="button" 
                                variant="outline" 
                                className="w-full mt-4"
                                onClick={() => setIsSuccess(false)}
                            >
                                Enviar novamente
                            </Button>
                        </div>
                    )}
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
