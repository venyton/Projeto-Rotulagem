'use client'

import { useActionState, useState } from "react";
import { registerUser } from "@/app/actions";
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
        <div className="flex h-screen w-full items-center justify-center px-4">
            <Card className="mx-auto max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Cadastro</CardTitle>
                    <CardDescription>
                        Crie sua conta para começar a gerar tabelas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nome</Label>
                            <Input id="name" name="name" placeholder="Seu nome" required />
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
