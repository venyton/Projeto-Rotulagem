"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type ConfigurationValueType = "STRING" | "INTEGER" | "DECIMAL" | "BOOLEAN" | "JSON" | "URL";
type ConfigurationScope = "GLOBAL" | "ORGANIZATION" | "USER";

type ConfigurationDefinition = {
  id: string;
  key: string;
  category: string;
  label: string;
  description: string | null;
  valueType: ConfigurationValueType;
  defaultValue: unknown;
  validation: unknown;
  editable: boolean;
  sensitive: boolean;
  values: Array<{
    scope: ConfigurationScope;
    scopeKey: string;
    organizationId: string | null;
    userId: string | null;
    value: unknown;
    updatedAt: string;
  }>;
};

type Props = { definitions: ConfigurationDefinition[]; canManage?: boolean; canManageBilling?: boolean; globalScopeOnly?: boolean };

const CATEGORY_LABELS: Record<string, string> = {
  VISUAL: "Visão e experiência",
  ACESSO: "Acesso e segurança",
  "NEGÓCIO": "Negócio e cobrança",
  OPERAÇÃO: "Operação",
  USUÁRIOS: "Usuários",
  ASAAS: "Integração Asaas",
};

const VALUE_TYPE_LABELS: Record<ConfigurationValueType, string> = {
  STRING: "texto",
  INTEGER: "número inteiro",
  DECIMAL: "número decimal",
  BOOLEAN: "sim ou não",
  JSON: "JSON",
  URL: "endereço web",
};

function scopeKey(scope: ConfigurationScope, organizationId: string, userId: string) {
  if (scope === "ORGANIZATION") return `ORGANIZATION:${organizationId}`;
  if (scope === "USER") return `USER:${userId}`;
  return "GLOBAL";
}

function fallbackValue(definition: ConfigurationDefinition, selectedScopeKey: string) {
  const selected = definition.values.find((value) => value.scopeKey === selectedScopeKey);
  const global = definition.values.find((value) => value.scopeKey === "GLOBAL");
  return selected?.value ?? global?.value ?? definition.defaultValue;
}

function displayValue(definition: ConfigurationDefinition, value: unknown) {
  if (definition.valueType === "JSON") return JSON.stringify(value, null, 2);
  if (definition.valueType === "BOOLEAN") return Boolean(value);
  return value === null || value === undefined ? "" : String(value);
}

function parseValue(definition: ConfigurationDefinition, value: unknown) {
  if (definition.valueType === "JSON") {
    if (typeof value !== "string") return value;
    return JSON.parse(value) as unknown;
  }
  if (definition.valueType === "INTEGER") return Number(value);
  if (definition.valueType === "DECIMAL") return Number(value);
  return value;
}

export function ConfigurationRegistryManager({ definitions, canManage = true, canManageBilling = false, globalScopeOnly = false }: Props) {
  const router = useRouter();
  const [scope, setScope] = useState<ConfigurationScope>("GLOBAL");
  const [organizationId, setOrganizationId] = useState("");
  const [userId, setUserId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});
  const [pending, startTransition] = useTransition();
    const selectedScopeKey = scopeKey(scope, organizationId, userId);
  const groupedDefinitions = useMemo(() => {
    const groups = new Map<string, ConfigurationDefinition[]>();
    for (const definition of definitions) {
      const current = groups.get(definition.category) ?? [];
      current.push(definition);
      groups.set(definition.category, current);
    }
    return [...groups.entries()];
  }, [definitions]);

  const updateDraft = (key: string, value: unknown) => {
    setDrafts((current) => ({ ...current, [`${selectedScopeKey}:${key}`]: value }));
  };

  const save = (definition: ConfigurationDefinition) => {
    const draftKey = `${selectedScopeKey}:${definition.key}`;
    const value = drafts[draftKey] ?? displayValue(definition, fallbackValue(definition, selectedScopeKey));
    let parsedValue: unknown;
    try {
      parsedValue = parseValue(definition, value);
    } catch {
      toast.error(`O JSON de “${definition.label}” é inválido.`);
      return;
    }
    if (definition.valueType === "INTEGER" || definition.valueType === "DECIMAL") {
      if (typeof parsedValue !== "number" || !Number.isFinite(parsedValue)) {
        toast.error(`Informe um número válido para “${definition.label}”.`);
        return;
      }
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/configurations/${encodeURIComponent(definition.key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, organizationId: organizationId || undefined, userId: userId || undefined, value: parsedValue }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error
          : "Não foi possível salvar a configuração.";
        toast.error(message);
        return;
      }
      toast.success(`“${definition.label}” salva.`);
      setDrafts((current) => {
        const next = { ...current };
        delete next[draftKey];
        return next;
      });
      router.refresh();
    });
  };

  const reset = (definition: ConfigurationDefinition) => {
    startTransition(async () => {
      const response = await fetch(`/api/admin/configurations/${encodeURIComponent(definition.key)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, organizationId: organizationId || undefined, userId: userId || undefined }),
      });
      if (!response.ok) {
        const result: unknown = await response.json().catch(() => null);
        const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error
          : "Não foi possível restaurar a configuração.";
        toast.error(message);
        return;
      }
      setDrafts((current) => {
        const next = { ...current };
        delete next[`${selectedScopeKey}:${definition.key}`];
        return next;
      });
      toast.success(`Valor de “${definition.label}” removido deste escopo.`);
    });
  };

  const scopeReady = scope === "GLOBAL" || (scope === "ORGANIZATION" ? organizationId.trim().length > 0 : userId.trim().length > 0);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Editar valores por escopo</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-4 md:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="configuration-scope">Escopo</FieldLabel>
              <NativeSelect id="configuration-scope" value={scope} onChange={(event) => setScope(event.target.value as ConfigurationScope)} disabled={globalScopeOnly}>
                <NativeSelectOption value="GLOBAL">Toda a plataforma</NativeSelectOption>
                <NativeSelectOption value="ORGANIZATION">Uma organização</NativeSelectOption>
                <NativeSelectOption value="USER">Uma pessoa</NativeSelectOption>
              </NativeSelect>
            </Field>
            {!globalScopeOnly && scope === "ORGANIZATION" ? (
              <Field>
                <FieldLabel htmlFor="configuration-organization">ID da organização</FieldLabel>
                <Input id="configuration-organization" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} placeholder="ID da organização" />
              </Field>
            ) : null}
            {!globalScopeOnly && scope === "USER" ? (
              <Field>
                <FieldLabel htmlFor="configuration-user">ID do usuário</FieldLabel>
                <Input id="configuration-user" value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="ID do usuário" />
              </Field>
            ) : null}
          </FieldGroup>
        </CardContent>
      </Card>

      {!scopeReady ? <Alert variant="destructive"><AlertTitle>Informe o ID do escopo para editar.</AlertTitle></Alert> : null}
      {!canManage && !canManageBilling ? <Alert><AlertTitle>Somente leitura</AlertTitle></Alert> : null}
      {canManage && !canManageBilling && definitions.some((definition) => definition.key.startsWith("business.billing.asaas.") || definition.key === "business.billing.environment") ? (
        <Alert><AlertTitle>Credenciais Asaas: acesso somente para leitura</AlertTitle><AlertDescription>A edição exige a permissão “Configurar integração financeira”.</AlertDescription></Alert>
      ) : null}
      {scope !== "GLOBAL" ? <Alert><AlertTitle>Credenciais e parâmetros do Asaas usam somente o escopo global.</AlertTitle></Alert> : null}

      {groupedDefinitions.map(([category, categoryDefinitions]) => (
        <section key={category} className="flex flex-col gap-4" aria-labelledby={`configuration-category-${category}`}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={`configuration-category-${category}`} className="text-xl font-semibold tracking-tight">{CATEGORY_LABELS[category] ?? category}</h2>
            <Badge variant="secondary">{categoryDefinitions.length} itens</Badge>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {categoryDefinitions.map((definition) => {
              const key = `${selectedScopeKey}:${definition.key}`;
              const billingIntegration = definition.key === "business.billing.environment"
                || definition.key.startsWith("business.billing.asaas.");
              const canEdit = billingIntegration ? canManageBilling && scope === "GLOBAL" : canManage;
              const baseValue = fallbackValue(definition, selectedScopeKey);
              const value = drafts[key] ?? displayValue(definition, baseValue);
              const hasOverride = definition.values.some((item) => item.scopeKey === selectedScopeKey);
              return (
                <Card key={definition.key}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle>{definition.label}</CardTitle>
                        <CardDescription className="mt-1 font-mono text-xs">{definition.key}</CardDescription>
                      </div>
                      <Badge variant={hasOverride ? "default" : "outline"}>{hasOverride ? "Valor salvo neste escopo" : selectedScopeKey === "GLOBAL" ? "Padrão do sistema" : "Sem substituição neste escopo"}</Badge>
                    </div>
                    {definition.description ? <p className="text-sm text-muted-foreground">{definition.description}</p> : null}
                  </CardHeader>
                  <CardContent>
                    <Field>
                      <FieldLabel htmlFor={`configuration-${definition.key}`}>Valor · {VALUE_TYPE_LABELS[definition.valueType]}</FieldLabel>
                      <FieldContent>
                        {definition.sensitive ? (
                          <Input
                            id={`configuration-${definition.key}`}
                            type="password"
                            value={String(drafts[key] ?? "")}
                            onChange={(event) => updateDraft(definition.key, event.target.value)}
                            placeholder={hasOverride ? "Segredo salvo — digite para substituir" : "Digite um novo segredo"}
                            autoComplete="new-password"
                            disabled={!definition.editable || !canEdit || pending}
                          />
                        ) : definition.valueType === "BOOLEAN" ? (
                          <div className="flex items-center gap-3">
                            <Switch id={`configuration-${definition.key}`} checked={Boolean(value)} onCheckedChange={(checked) => updateDraft(definition.key, checked)} disabled={!definition.editable || !canEdit || pending} />
                            <span className="text-sm text-muted-foreground">{Boolean(value) ? "Ativado" : "Desativado"}</span>
                          </div>
                        ) : definition.valueType === "JSON" ? (
                          <Textarea id={`configuration-${definition.key}`} value={String(value)} onChange={(event) => updateDraft(definition.key, event.target.value)} rows={8} disabled={!definition.editable || !canEdit || pending} />
                        ) : (
                          <Input id={`configuration-${definition.key}`} type={definition.valueType === "INTEGER" || definition.valueType === "DECIMAL" ? "number" : definition.valueType === "URL" ? "url" : "text"} step={definition.valueType === "DECIMAL" ? "any" : undefined} value={String(value)} onChange={(event) => updateDraft(definition.key, event.target.value)} disabled={!definition.editable || !canEdit || pending} />
                        )}
                        <FieldDescription>
                          {definition.sensitive ? "O segredo nunca é exibido." : hasOverride ? "Salvo neste escopo." : "Sem valor salvo neste escopo."}
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  </CardContent>
                  <CardFooter className="justify-end gap-2 border-t">
                    <Button type="button" variant="outline" size="sm" onClick={() => reset(definition)} disabled={!definition.editable || !canEdit || pending || !hasOverride}>
                      <RotateCcw data-icon="inline-start" />Remover valor deste escopo
                    </Button>
                    <Button type="button" size="sm" onClick={() => save(definition)} disabled={!definition.editable || !canEdit || pending || !scopeReady || (definition.sensitive && !String(drafts[key] ?? "").trim())}>
                      {pending ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}Salvar neste escopo
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
