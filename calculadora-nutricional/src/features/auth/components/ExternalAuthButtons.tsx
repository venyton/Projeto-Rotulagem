'use client'

import { useEffect, useState } from "react";
import { getProviders, signIn, type ClientSafeProvider } from "next-auth/react";
import { Chrome, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

const providerLabels: Record<string, string> = {
  google: "Google",
  facebook: "Meta",
  "azure-ad": "Outlook",
};

const providerIcons: Record<string, typeof Chrome> = {
  google: Chrome,
  facebook: ShieldCheck,
  "azure-ad": Mail,
};

export function ExternalAuthButtons() {
  const [providers, setProviders] = useState<ClientSafeProvider[]>([]);

  useEffect(() => {
    getProviders().then((items) => {
      setProviders(Object.values(items || {}).filter((provider) => provider.id !== "credentials"));
    });
  }, []);

  if (providers.length === 0) return null;

  return (
    <div className="grid gap-2">
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
            Entrar com {providerLabels[provider.id] || provider.name}
          </Button>
        );
      })}
    </div>
  );
}
