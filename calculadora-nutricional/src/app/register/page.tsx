'use client'

import { useActionState, useState } from "react";
import { registerUser } from "@/features/auth/actions/register-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const initialState: { error?: string } = {};

export default function RegisterPage() {
    const [state, formAction] = useActionState(registerUser, initialState);
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="flex min-h-[calc(100svh-4rem)] w-full items-center justify-center px-4 py-10">
            <Card className="mx-auto grid w-full max-w-5xl overflow-hidden border-border/70 bg-card/95 p-0 shadow-[0_28px_80px_-54px_rgba(15,23,42,0.85)] md:grid-cols-[0.95fr_1fr]">
                <CardHeader className="relative min-h-[360px] overflow-hidden border-b border-border/70 bg-primary px-7 py-8 text-primary-foreground md:border-b-0 md:border-r">
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0)_42%)]" />
                    <div className="relative flex h-full flex-col justify-end">
                        <CardTitle className="text-3xl text-white">Cadastro</CardTitle>
                        <CardDescription className="mt-2 max-w-sm text-primary-foreground/78">
                            Complete os dados para acessar a plataforma.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="px-6 py-7 sm:px-8">
                    <form action={formAction} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nome</Label>
                            <Input id="name" name="name" placeholder="Seu nome" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="companyName">Empresa</Label>
                            <Input id="companyName" name="companyName" placeholder="Nome da empresa" required />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="document">CPF/CNPJ</Label>
                                <Input id="document" name="document" placeholder="Documento" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Telefone</Label>
                                <Input id="phone" name="phone" placeholder="(00) 00000-0000" required />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Senha</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? "Ocultar" : "Exibir"}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">Use pelo menos 10 caracteres.</p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                required
                            />
                        </div>
                        {state?.error && (
                            <p className="text-sm text-red-500">{state.error}</p>
                        )}
                        <Button type="submit" className="w-full">
                            Criar conta
                        </Button>
                        <div className="mt-4 text-center text-sm">
                            Já tem uma conta?{" "}
                            <Link href="/login" className="underline">
                                Entrar
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
