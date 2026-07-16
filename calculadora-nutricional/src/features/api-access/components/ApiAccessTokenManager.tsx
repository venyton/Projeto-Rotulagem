"use client";

import { useActionState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useSiteLanguage } from "@/features/i18n/components/LanguageSwitcher";
import {
  createApiAccessToken,
  revokeApiAccessToken,
  type ApiTokenActionState,
} from "@/features/api-access/actions/api-token-actions";

type TokenSummary = {
  id: string;
  name: string;
  tokenPrefix: string;
  lastFour: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

const initialState: ApiTokenActionState = {};

export function ApiAccessTokenManager({ tokens }: { tokens: TokenSummary[] }) {
  const [state, formAction, pending] = useActionState(createApiAccessToken, initialState);
  const { language } = useSiteLanguage();

  async function copyToken() {
    if (!state.token) return;
    await navigator.clipboard.writeText(state.token);
    toast.success("Token copiado.");
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Novo token</CardTitle>
          <CardDescription>O segredo completo é mostrado somente uma vez.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={formAction}>
            <FieldGroup className="grid gap-3 md:grid-cols-[1fr_12rem_auto] md:items-end">
              <Field>
                <FieldLabel htmlFor="api-token-name">Nome</FieldLabel>
                <Input id="api-token-name" name="name" placeholder="Integração ERP" minLength={2} maxLength={80} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="api-token-expiration">Validade</FieldLabel>
                <select id="api-token-expiration" name="expirationDays" defaultValue="90" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="30">30 dias</option>
                  <option value="90">90 dias</option>
                  <option value="365">1 ano</option>
                </select>
              </Field>
              <Button type="submit" disabled={pending}>
                <Plus data-icon="inline-start" />
                {pending ? "Gerando..." : "Gerar token"}
              </Button>
            </FieldGroup>
          </form>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.token ? (
            <div className="rounded-lg border border-success/40 bg-success/10 p-4">
              <p className="mb-2 text-sm font-medium">Copie agora:</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <code className="min-w-0 flex-1 overflow-x-auto rounded-md bg-background px-3 py-2 text-xs">{state.token}</code>
                <Button type="button" variant="outline" onClick={copyToken}>
                  <Copy data-icon="inline-start" />Copiar
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tokens emitidos</CardTitle>
          <CardDescription>Revogue imediatamente credenciais que não estejam mais em uso.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {tokens.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum token emitido.</p> : null}
          {tokens.map((token) => (
            <div key={token.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <KeyRound className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-medium">{token.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{token.tokenPrefix}••••{token.lastFour}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {token.revokedAt ? (
                      <><span>Revogado em</span> {formatDate(token.revokedAt, language)}</>
                    ) : (
                      <><span>Expira em</span> {formatDate(token.expiresAt, language)}</>
                    )}
                    {token.lastUsedAt ? <> · <span>Último uso</span> {formatDate(token.lastUsedAt, language)}</> : " · Ainda não utilizado"}
                  </p>
                </div>
              </div>
              {!token.revokedAt ? (
                <form action={revokeApiAccessToken}>
                  <input type="hidden" name="tokenId" value={token.id} />
                  <Button type="submit" variant="destructive" size="sm">
                    <Trash2 data-icon="inline-start" />Revogar
                  </Button>
                </form>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(value: string | null, locale: string) {
  if (!value) return "sem data";
  return new Date(value).toLocaleString(locale, { timeZone: "America/Sao_Paulo" });
}
