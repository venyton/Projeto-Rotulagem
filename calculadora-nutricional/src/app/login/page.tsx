'use client'

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { toast } from "sonner"; // Assuming sonner is installed/configured

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        setLoading(false);

        if (res?.error) {
            toast.error("Email ou senha inválidos.");
        } else {
            router.push("/dashboard");
            router.refresh(); // Update server components
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center px-4">
            <Card className="mx-auto max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Login</CardTitle>
                    <CardDescription>
                        Entre para acessar suas tabelas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="bg-red-500 text-white text-4xl font-bold p-4 text-center mb-4 border-4 border-yellow-400 animate-pulse">
                        TESTE - SE VER ISSO O DEPLOY FUNCIONOU
                    </div>
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <Link href="#" className="ml-auto inline-block text-sm underline text-muted-foreground hover:text-primary">
                                Esqueceu a senha?
                            </Link>
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Entrando..." : "ENTRAR"}
                        </Button>
                        <div className="mt-4 text-center text-sm">
                            Não tem uma conta?{" "}
                            <Link href="/register" className="underline">
                                Cadastre-se
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
