"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Credential = {
  key: string;
  label: string;
  placeholder: string;
  configured: boolean | null;
};

type Props = {
  sandboxApiKeyConfigured: boolean | null;
  productionApiKeyConfigured: boolean | null;
  canManage: boolean;
};

function responseError(value: unknown) {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string"
    ? value.error
    : "Não foi possível salvar a chave de API.";
}

export function AsaasApiCredentialsCard({
  sandboxApiKeyConfigured,
  productionApiKeyConfigured,
  canManage,
}: Props) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const credentials: Credential[] = [
    {
      key: "business.billing.asaas.sandbox_api_key",
      label: "Chave de API Sandbox",
      placeholder: "$aact_hmlg_…",
      configured: sandboxApiKeyConfigured,
    },
    {
      key: "business.billing.asaas.production_api_key",
      label: "Chave de API Produção",
      placeholder: "$aact_prod_…",
      configured: productionApiKeyConfigured,
    },
  ];

  const save = (credential: Credential) => {
    const value = drafts[credential.key]?.trim();
    if (!value) return;
    setMessages((current) => ({ ...current, [credential.key]: "" }));
    setPendingKey(credential.key);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/configurations/${encodeURIComponent(credential.key)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope: "GLOBAL", value }),
        });
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(responseError(result));

        setDrafts((current) => ({ ...current, [credential.key]: "" }));
        setMessages((current) => ({ ...current, [credential.key]: "Chave salva. O valor permanece oculto." }));
        toast.success(`${credential.label} salva.`);
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível salvar a chave de API.";
        setMessages((current) => ({ ...current, [credential.key]: message }));
        toast.error(message);
      } finally {
        setPendingKey(null);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="size-5 text-primary" aria-hidden="true" />
          <CardTitle>Credenciais da API Asaas</CardTitle>
        </div>
        <CardDescription>
          Cadastre uma chave para cada ambiente. O Asaas não permite consultar a chave completa depois da criação; esta tela mostra apenas se ela está salva.
        </CardDescription>
      </CardHeader>
      {!canManage ? (
        <CardContent className="pb-0">
          <Alert>
            <AlertTitle>Credenciais em modo de leitura</AlertTitle>
            <AlertDescription>A edição exige a permissão “Configurar integração financeira”.</AlertDescription>
          </Alert>
        </CardContent>
      ) : null}
      <CardContent className="grid gap-4 md:grid-cols-2">
        {credentials.map((credential) => {
          const inputId = `asaas-api-key-${credential.label.toLowerCase().replaceAll(" ", "-")}`;
          const messageId = `${inputId}-message`;
          const message = messages[credential.key];
          const saving = pending && pendingKey === credential.key;
          return (
            <section key={credential.key} className="flex min-w-0 flex-col gap-4 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium">{credential.label}</h3>
                <Badge variant={credential.configured === true ? "default" : "outline"}>
                  {credential.configured === null ? "Status restrito" : credential.configured ? "Chave cadastrada" : "Sem chave cadastrada"}
                </Badge>
              </div>
              <Field>
                <FieldLabel htmlFor={inputId}>Nova chave de API</FieldLabel>
                <FieldContent>
                  <Input
                    id={inputId}
                    type="password"
                    value={drafts[credential.key] ?? ""}
                    onChange={(event) => setDrafts((current) => ({ ...current, [credential.key]: event.target.value }))}
                    placeholder={credential.placeholder}
                    autoComplete="new-password"
                    maxLength={512}
                    aria-describedby={message ? messageId : undefined}
                    disabled={!canManage || pending}
                  />
                  <FieldDescription>
                    Salvar outra chave substitui somente a chave deste ambiente. O segredo é cifrado no banco e nunca é devolvido pela API.
                  </FieldDescription>
                </FieldContent>
              </Field>
              {message ? (
                <Alert variant={message.startsWith("Chave salva.") ? "default" : "destructive"} id={messageId}>
                  <AlertTitle>{message.startsWith("Chave salva.") ? "Credencial atualizada" : "Não foi possível atualizar"}</AlertTitle>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              ) : null}
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => save(credential)}
                  disabled={!canManage || pending || !drafts[credential.key]?.trim()}
                >
                  {saving ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
                  {saving ? "Salvando…" : credential.configured ? "Substituir chave" : "Cadastrar chave"}
                </Button>
              </div>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}
