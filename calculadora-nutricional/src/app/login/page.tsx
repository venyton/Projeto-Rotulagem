'use client'

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ExternalAuthButtons } from "@/features/auth/components/ExternalAuthButtons";

function formatOtp(value: string) {
    return value.replace(/\D/g, "").slice(0, 6);
}

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [twoFactorCode, setTwoFactorCode] = useState("");
    const [step, setStep] = useState<"CREDENTIALS" | "2FA">("CREDENTIALS");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        const response = await signIn("credentials", {
            email,
            password,
            twoFactorCode: step === "2FA" ? twoFactorCode : "",
            redirect: false,
        });
        setLoading(false);

        if (response?.error === "2FA_REQUIRED") setStep("2FA");
        else if (response?.error === "2FA_INVALID") toast.error("Código 2FA incorreto.");
        else if (response?.error) toast.error("Email ou senha inválidos.");
        else {
            router.push("/dashboard");
            router.refresh();
        }
    };

    const title = step === "CREDENTIALS" ? "Entrar" : "Verificação em duas etapas";
    const description = step === "CREDENTIALS"
        ? "Acesse sua conta SoIZI."
        : "Insira o código do seu aplicativo autenticador.";

    return (
        <main className="flex min-h-[calc(100svh-4.5rem)] items-center justify-center bg-muted/20 px-4 py-10">
            <Card className="app-enter w-full max-w-sm border-border/70 bg-card shadow-sm">
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                    {step === "CREDENTIALS" ? (
                        <CardAction>
                            <Button asChild variant="link">
                                <Link href="/register">Criar conta</Link>
                            </Button>
                        </CardAction>
                    ) : null}
                </CardHeader>

                <CardContent>
                    <form id="login-form" onSubmit={handleSubmit}>
                        <div className="flex flex-col gap-6">
                            {step === "CREDENTIALS" ? (
                                <>
                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="email">E-mail</FieldLabel>
                                        <Input id="email" type="email" placeholder="voce@empresa.com" required value={email} onChange={(event) => setEmail(event.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <div className="flex items-center">
                                            <FieldLabel htmlFor="password">Senha</FieldLabel>
                                            <Link href="/forgot-password" className="ml-auto inline-block text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline">Esqueci a senha</Link>
                                        </div>
                                        <Input id="password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
                                    </div>
                                </>
                            ) : (
                                <FieldGroup className="gap-4">
                                    <Empty className="border-0 p-0">
                                        <EmptyHeader>
                                            <EmptyMedia variant="icon"><ShieldCheck aria-hidden="true" /></EmptyMedia>
                                            <EmptyTitle>Confirme o acesso</EmptyTitle>
                                        </EmptyHeader>
                                    </Empty>
                                    <Field>
                                        <FieldLabel htmlFor="twoFactorCode" className="justify-center">Código do aplicativo</FieldLabel>
                                        <InputOTP
                                            id="twoFactorCode"
                                            maxLength={6}
                                            value={twoFactorCode}
                                            onChange={(value) => setTwoFactorCode(formatOtp(value))}
                                            containerClassName="justify-center"
                                            autoComplete="one-time-code"
                                            autoFocus
                                        >
                                            <InputOTPGroup>
                                                {Array.from({ length: 6 }, (_, index) => (
                                                    <InputOTPSlot key={index} index={index} className="size-11 font-mono text-lg" />
                                                ))}
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </Field>
                                </FieldGroup>
                            )}
                        </div>
                    </form>
                </CardContent>

                <CardFooter className="flex-col gap-2 border-t">
                    <Button form="login-form" type="submit" className="w-full" disabled={loading || (step === "2FA" && twoFactorCode.length < 6)}>
                        {loading ? <Spinner data-icon="inline-start" /> : null}
                        {loading ? "Verificando..." : step === "CREDENTIALS" ? "Entrar" : "Validar código"}
                        {!loading && step === "CREDENTIALS" ? <ArrowRight data-icon="inline-end" /> : null}
                    </Button>

                    {step === "CREDENTIALS" ? (
                        <ExternalAuthButtons />
                    ) : (
                        <Button type="button" variant="ghost" className="w-full" onClick={() => { setStep("CREDENTIALS"); setTwoFactorCode(""); }}>
                            <ArrowLeft data-icon="inline-start" />Voltar para credenciais
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </main>
    );
}
