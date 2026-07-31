"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, Lock } from "lucide-react";
import { toast } from "sonner";

import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

function ResetPasswordForm() {
    const router = useRouter();
    const token = useSearchParams().get("token");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!token) return toast.error("Token de recuperação inválido ou ausente.");
        if (password !== confirmPassword) return toast.error("As senhas não coincidem.");
        if (password.length < 10) return toast.error("A senha deve ter no mínimo 10 caracteres.");
        if (password.length > 256) return toast.error("A senha deve ter no máximo 256 caracteres.");
        setIsLoading(true);
        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });
            if (response.ok) {
                toast.success("Senha redefinida com sucesso.");
                router.push("/login");
            } else {
                const data = await response.json();
                toast.error(data.error || "Ocorreu um erro ao redefinir a senha.");
            }
        } catch {
            toast.error("Erro de conexão. Tente novamente mais tarde.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <Empty className="border-0 p-0">
                <EmptyHeader>
                    <EmptyMedia variant="icon"><Lock aria-hidden="true" /></EmptyMedia>
                    <EmptyTitle>Link inválido</EmptyTitle>
                    <EmptyDescription>O token de recuperação está ausente ou expirou.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent><Button asChild><Link href="/forgot-password">Solicitar novo link</Link></Button></EmptyContent>
            </Empty>
        );
    }

    return (
        <form onSubmit={handleSubmit}>
            <FieldGroup className="gap-4">
                <Field>
                    <FieldLabel htmlFor="password">Nova senha</FieldLabel>
                    <InputGroup><InputGroupAddon><KeyRound aria-hidden="true" /></InputGroupAddon><InputGroupInput id="password" type="password" placeholder="Mínimo 10 caracteres" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={isLoading} minLength={10} maxLength={256} /></InputGroup>
                </Field>
                <Field>
                    <FieldLabel htmlFor="confirmPassword">Confirmar nova senha</FieldLabel>
                    <InputGroup><InputGroupAddon><KeyRound aria-hidden="true" /></InputGroupAddon><InputGroupInput id="confirmPassword" type="password" placeholder="Digite a senha novamente" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={isLoading} minLength={10} maxLength={256} /></InputGroup>
                </Field>
                <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? <Spinner data-icon="inline-start" /> : null}{isLoading ? "Salvando..." : "Redefinir senha"}</Button>
            </FieldGroup>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <AuthShell title="Criar nova senha" description="Defina uma nova senha para recuperar seu acesso.">
            <Suspense fallback={<div className="flex flex-col gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-9 w-full" /></div>}>
                <ResetPasswordForm />
            </Suspense>
            <Button variant="link" asChild className="mt-5 w-full"><Link href="/login"><ArrowLeft data-icon="inline-start" />Voltar para o login</Link></Button>
        </AuthShell>
    );
}
