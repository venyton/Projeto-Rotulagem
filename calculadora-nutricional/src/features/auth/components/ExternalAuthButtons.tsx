'use client'

import { useEffect, useState } from "react";
import { getProviders, signIn, type ClientSafeProvider } from "next-auth/react";
import { Chrome, Facebook, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldSeparator } from "@/components/ui/field";
import Link from "next/link";

const providerLabels: Record<string, string> = {
  google: "Google",
  facebook: "Facebook",
  "azure-ad": "Outlook",
};

const providerIcons: Record<string, typeof Chrome> = {
  google: Chrome,
  facebook: Facebook,
  "azure-ad": Mail,
};

type ExternalAuthButtonsProps = {
  actionLabel?: string;
  dividerLabel?: string;
};

export function ExternalAuthButtons({ actionLabel = "Entrar com", dividerLabel }: ExternalAuthButtonsProps) {
  const [providers, setProviders] = useState<ClientSafeProvider[]>([]);

  useEffect(() => {
    getProviders().then((items) => {
      setProviders(Object.values(items || {}).filter((provider) => provider.id !== "credentials"));
    });
  }, []);

  if (providers.length === 0) return null;

  return (
    <div className="grid w-full gap-2">
      {dividerLabel ? <FieldSeparator>{dividerLabel}</FieldSeparator> : null}
      {providers.map((provider) => {
        const Icon = providerIcons[provider.id] || Mail;
        return (
          <Button
            key={provider.id}
            type="button"
            variant="outline"
            className="h-11 w-full gap-2"
            onClick={() => signIn(provider.id, { callbackUrl: "/dashboard" })}
          >
            <Icon className="h-4 w-4" />
            {actionLabel} {providerLabels[provider.id] || provider.name}
          </Button>
        );
      })}
      <p className="px-1 text-center text-xs leading-5 text-muted-foreground">
        Ao continuar com um provedor, você declara que leu e aceita os{" "}
        <Link href="/termos-de-uso" target="_blank" className="underline underline-offset-4 hover:text-foreground">Termos de Uso</Link>
        {" "}e a{" "}
        <Link href="/politica-de-privacidade" target="_blank" className="underline underline-offset-4 hover:text-foreground">Política de Privacidade</Link>.
      </p>
    </div>
  );
}
