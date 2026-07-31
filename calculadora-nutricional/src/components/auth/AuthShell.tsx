import { LockKeyhole, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AuthShellProps = {
    title: string;
    description: string;
    children: React.ReactNode;
};

export function AuthShell({ title, description, children }: AuthShellProps) {
    return (
        <main className="flex min-h-[calc(100svh-4rem)] w-full items-center justify-center px-4 py-8 sm:min-h-[calc(100svh-4.5rem)] sm:py-10">
            <Card className="app-enter mx-auto grid w-full max-w-5xl overflow-hidden p-0 md:grid-cols-[0.9fr_1fr]">
                <CardHeader className="relative min-h-72 content-end overflow-hidden border-b bg-primary px-7 py-8 text-primary-foreground md:min-h-[32rem] md:border-r md:border-b-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(255,255,255,0.24),transparent_34rem)]" />
                    <div className="relative flex h-full flex-col justify-between gap-10">
                        <div className="flex items-center justify-between gap-3">
                            <span className="flex size-11 items-center justify-center rounded-xl bg-primary-foreground/12">
                                <LockKeyhole className="size-5" aria-hidden="true" />
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                                <ShieldCheck className="size-4" aria-hidden="true" />
                                Acesso seguro
                            </span>
                        </div>
                        <div>
                            <CardTitle className="text-3xl text-primary-foreground">{title}</CardTitle>
                            <CardDescription className="mt-2 max-w-sm text-primary-foreground/80">{description}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-6 py-7 sm:px-8 sm:py-9">{children}</CardContent>
            </Card>
        </main>
    );
}
