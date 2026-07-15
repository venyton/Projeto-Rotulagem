"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { toast } from "sonner";

import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsLoading(true);
        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (response.ok) setIsSuccess(true);
            else {
                const data = await response.json();
                toast.error(data.error || "Ocorreu um erro. Tente novamente.");
            }
        } catch {
            toast.error("Erro de conexão. Tente novamente mais tarde.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthShell title="Recuperar senha" description={isSuccess ? "Verifique sua caixa de entrada para continuar." : "Enviaremos um link seguro para redefinir sua senha."}>
            {!isSuccess ? (
                <form onSubmit={handleSubmit}>
                    <FieldGroup className="gap-4">
                        <Field>
                            <FieldLabel htmlFor="email">E-mail</FieldLabel>
                            <InputGroup>
                                <InputGroupAddon><Mail aria-hidden="true" /></InputGroupAddon>
                                <InputGroupInput id="email" type="email" placeholder="voce@empresa.com" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={isLoading} />
                            </InputGroup>
                        </Field>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Spinner data-icon="inline-start" /> : <Mail data-icon="inline-start" />}
                            {isLoading ? "Enviando..." : "Enviar link de recuperação"}
                        </Button>
                    </FieldGroup>
                </form>
            ) : (
                <Empty className="border-0 p-0">
                    <EmptyHeader>
                        <EmptyMedia variant="icon"><CheckCircle2 aria-hidden="true" /></EmptyMedia>
                        <EmptyTitle>Link enviado</EmptyTitle>
                        <EmptyDescription>Cheque seu e-mail e siga as instruções.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent><Button type="button" variant="outline" className="w-full" onClick={() => setIsSuccess(false)}>Enviar novamente</Button></EmptyContent>
                </Empty>
            )}
            <Button variant="link" asChild className="mt-5 w-full">
                <Link href="/login"><ArrowLeft data-icon="inline-start" />Voltar para o login</Link>
            </Button>
        </AuthShell>
    );
}
