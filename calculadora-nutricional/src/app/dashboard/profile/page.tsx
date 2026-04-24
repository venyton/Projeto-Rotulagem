'use client'

import { useActionState } from "react";
import { changePassword } from "@/features/profile/actions/profile-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function ProfilePage() {
    const [state, formAction] = useActionState(changePassword, {});

    return (
        <div className="container mx-auto py-8 max-w-md">
            <Card>
                <CardHeader>
                    <CardTitle>Meu Perfil</CardTitle>
                    <CardDescription>Gerencie suas credenciais</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="space-y-4">
                        <h3 className="text-lg font-medium">Alterar Senha</h3>
                        {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
                        {state?.success && <p className="text-sm text-green-500">{state.success}</p>}

                        <div className="space-y-2">
                            <Label>Senha Atual</Label>
                            <Input name="currentPassword" type="password" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Nova Senha</Label>
                            <Input name="newPassword" type="password" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Confirmar Nova Senha</Label>
                            <Input name="confirmPassword" type="password" required />
                        </div>
                        <Button type="submit" className="w-full">Atualizar Senha</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
