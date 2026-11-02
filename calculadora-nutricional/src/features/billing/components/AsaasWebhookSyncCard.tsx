"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  environment: "sandbox" | "production";
  apiConfigured: boolean;
  webhookConfigured: boolean;
  webhookId: string | null;
  canManage: boolean;
};

export function AsaasWebhookSyncCard({
  environment,
  apiConfigured,
  webhookConfigured,
  webhookId,
  canManage,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const synchronize = () => {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/asaas/webhook/sync", { method: "POST" });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const error = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error
          : "Não foi possível sincronizar o webhook.";
        setMessage(error);
        toast.error(error);
        return;
      }
      const data = typeof result === "object" && result !== null && "data" in result ? result.data : null;
      const id = typeof data === "object" && data !== null && "webhookId" in data && typeof data.webhookId === "string"
        ? data.webhookId
        : null;
      const success = id ? `Webhook ${id} sincronizado no Asaas.` : "Webhook sincronizado no Asaas.";
      setMessage(success);
      toast.success(success);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Webhook do Asaas</CardTitle>
            <CardDescription className="mt-1">
              Salve os campos acima e sincronize para criar ou atualizar o webhook da conta selecionada.
            </CardDescription>
          </div>
          <Badge variant={webhookId ? "default" : "outline"}>{webhookId ? "Registrado" : "Não sincronizado"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Conta ativa</p>
            <p className="font-medium">{environment === "sandbox" ? "Sandbox" : "Produção"}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Chave de API</p>
            <p className="font-medium">{apiConfigured ? "Armazenada" : "Pendente"}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Token do webhook</p>
            <p className="font-medium">{webhookConfigured ? "Armazenado" : "Pendente"}</p>
          </div>
        </div>
        {message ? (
          <Alert variant={message.startsWith("Webhook ") ? "default" : "destructive"}>
            <AlertTitle>{message.startsWith("Webhook ") ? "Sincronização concluída" : "Sincronização pendente"}</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}
        <p className="text-sm text-muted-foreground">
          A sincronização usa a API oficial do Asaas e preserva o ID retornado. Se o token for trocado, sincronize logo em seguida para manter o recebimento autenticado.
        </p>
        <p className="text-sm text-muted-foreground">
          E-mail de alertas e versão da API são campos da criação; a referência oficial de atualização não lista esses campos no PUT. Revise-os antes do primeiro cadastro.
        </p>
      </CardContent>
      <CardFooter className="justify-end border-t">
        <Button type="button" onClick={synchronize} disabled={!canManage || !apiConfigured || !webhookConfigured || pending}>
          {pending ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
          {pending ? "Sincronizando…" : webhookId ? "Atualizar no Asaas" : "Registrar no Asaas"}
        </Button>
      </CardFooter>
    </Card>
  );
}
