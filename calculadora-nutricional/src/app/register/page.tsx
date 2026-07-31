'use client'

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { AuthShell } from "@/components/auth/AuthShell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { registerUser } from "@/features/auth/actions/register-user";
import { ExternalAuthButtons } from "@/features/auth/components/ExternalAuthButtons";

const initialState: { error?: string } = {};

export default function RegisterPage() {
    const [state, formAction, pending] = useActionState(registerUser, initialState);
    const [showPassword, setShowPassword] = useState(false);

    return (
        <AuthShell title="Criar conta" description="Complete os dados para acessar a plataforma.">
            <div className="mb-5">
                <ExternalAuthButtons actionLabel="Cadastrar com" dividerLabel="ou cadastre-se com" />
            </div>
            <form action={formAction}>
                <FieldGroup className="gap-4">
                    <Field><FieldLabel htmlFor="name">Nome</FieldLabel><Input id="name" name="name" placeholder="Seu nome" required /></Field>
                    <Field><FieldLabel htmlFor="companyName">Empresa</FieldLabel><Input id="companyName" name="companyName" placeholder="Nome da empresa" required /></Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field><FieldLabel htmlFor="document">CPF/CNPJ</FieldLabel><Input id="document" name="document" placeholder="Documento" /></Field>
                        <Field><FieldLabel htmlFor="phone">Telefone</FieldLabel><Input id="phone" name="phone" placeholder="(00) 00000-0000" required /></Field>
                    </div>
                    <Field><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" name="email" type="email" placeholder="voce@empresa.com" required /></Field>
                    <Field>
                        <FieldLabel htmlFor="password">Senha</FieldLabel>
                        <InputGroup>
                        <InputGroupInput id="password" name="password" type={showPassword ? "text" : "password"} required minLength={10} maxLength={256} />
                            <InputGroupAddon align="inline-end">
                                <InputGroupButton size="icon-xs" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}>
                                    {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                                </InputGroupButton>
                            </InputGroupAddon>
                        </InputGroup>
                        <FieldDescription>Use pelo menos 10 caracteres.</FieldDescription>
                    </Field>
                    <Field><FieldLabel htmlFor="confirmPassword">Confirmar senha</FieldLabel><Input id="confirmPassword" name="confirmPassword" type={showPassword ? "text" : "password"} required minLength={10} maxLength={256} /></Field>
                    <label htmlFor="legalAcceptance" className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                        <input
                            id="legalAcceptance"
                            name="legalAcceptance"
                            type="checkbox"
                            value="accepted"
                            required
                            className="mt-1 size-4 shrink-0 accent-primary"
                        />
                        <span>
                            Li e aceito os <Link href="/termos-de-uso" target="_blank" className="font-medium text-primary underline-offset-4 hover:underline">Termos de Uso</Link> e a <Link href="/politica-de-privacidade" target="_blank" className="font-medium text-primary underline-offset-4 hover:underline">Política de Privacidade</Link>.
                        </span>
                    </label>
                    {state?.error ? <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert> : null}
                    <Button type="submit" className="w-full" disabled={pending}>
                        {pending ? <Spinner data-icon="inline-start" /> : null}{pending ? "Criando..." : "Criar conta"}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">Já tem uma conta? <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">Entrar</Link></p>
                </FieldGroup>
            </form>
        </AuthShell>
    );
}
