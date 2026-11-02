import Link from "next/link";
import { AlertCircle, CheckCircle2, Layers3, PackageOpen, Plus, Tags } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout/page-header";
import { Textarea } from "@/components/ui/textarea";
import { CatalogSubmitButton } from "@/features/commercial-catalog/components/CatalogSubmitButton";
import { listCommercialCatalog } from "@/features/commercial-catalog/services/catalog-management";
import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import { requirePlatformPagePermission } from "@/features/platform-iam/services/platform-access";

import { createPlanDraftAction, publishPlanVersionAction } from "./actions";

const planStatusLabel = { DRAFT: "Rascunho", ACTIVE: "Ativo", ARCHIVED: "Arquivado" } as const;
const versionStatusLabel = { DRAFT: "Rascunho", PUBLISHED: "Publicada", RETIRED: "Retirada" } as const;
const intervalLabel = { MONTHLY: "mensal", QUARTERLY: "trimestral", SEMIANNUAL: "semestral", YEARLY: "anual" } as const;
const featureTypeLabel = { BOOLEAN: "Sim ou não", QUOTA: "Limite contratado", METERED: "Uso medido", SEAT_LIMIT: "Vagas" } as const;

function formatPrice(amountMinor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amountMinor / 100);
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [access, catalog, feedback] = await Promise.all([
    requirePlatformPagePermission({
      permission: PLATFORM_PERMISSIONS.CATALOG_READ,
      action: "platform.catalog.page.accessed",
      targetId: "/admin/catalog",
    }),
    listCommercialCatalog(),
    searchParams,
  ]);
  const canManage = access.permissionKeys.includes(PLATFORM_PERMISSIONS.CATALOG_MANAGE);
  const canPublish = access.permissionKeys.includes(PLATFORM_PERMISSIONS.CATALOG_PUBLISH);
  const activeFeatures = catalog.features.filter((feature) => feature.isActive);
  const publishedVersions = catalog.plans.flatMap((plan) => plan.versions)
    .filter((version) => version.status === "PUBLISHED").length;
  const error = typeof feedback.error === "string" ? feedback.error : null;
  const success = typeof feedback.created === "string"
    ? "Pacote e versão 1 criados como rascunho. Revise os acessos e preços antes de publicar."
    : typeof feedback.published === "string"
      ? "Versão publicada e protegida contra alteração material."
      : null;

  return (
    <>
      <PageHeader
        title="Pacotes e acessos"
        description="Defina os recursos incluídos e os valores de cada ciclo de cobrança."
        actions={canManage ? (
          <Button asChild>
            <Link href="#create-package"><Plus data-icon="inline-start" />Criar pacote</Link>
          </Button>
        ) : null}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Catálogo não alterado</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {success ? (
        <Alert>
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>Operação concluída</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}

      <section aria-label="Resumo do catálogo" className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Pacotes cadastrados</CardDescription><CardTitle>{catalog.plans.length}</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Versões publicadas</CardDescription><CardTitle>{publishedVersions}</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Recursos cadastrados</CardDescription><CardTitle>{catalog.features.length}</CardTitle></CardHeader>
        </Card>
      </section>

      {canManage ? (
        <Card id="create-package" className="scroll-mt-6">
          <CardHeader>
            <CardTitle>Criar pacote</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createPlanDraftAction} className="flex flex-col gap-6">
              <FieldGroup className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="plan-code">Identificador do pacote</FieldLabel>
                  <Input id="plan-code" name="code" required minLength={2} maxLength={64} pattern="[a-z0-9]+(?:_[a-z0-9]+)*" placeholder="starter_2026" />
                  <FieldDescription>Use letras minúsculas, números e sublinhados.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="plan-name">Nome comercial</FieldLabel>
                  <Input id="plan-name" name="name" required minLength={2} maxLength={120} placeholder="Standard" />
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="plan-description">Descrição</FieldLabel>
                  <Textarea id="plan-description" name="description" maxLength={2000} placeholder="Para quem é este pacote e o que ele oferece." />
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="commercial-model">Tipo do pacote</FieldLabel>
                  <NativeSelect id="commercial-model" name="commercialModel" defaultValue="paid" className="max-w-md">
                    <option value="paid">Pago</option>
                    <option value="free">Gratuito</option>
                  </NativeSelect>
                </Field>

                <FieldSet className="gap-3 sm:col-span-2">
                  <FieldLegend variant="label">Valores por ciclo (BRL)</FieldLegend>
                  <FieldDescription>Pacotes pagos precisam de ao menos um valor. Para pacotes gratuitos, deixe todos em branco.</FieldDescription>
                  <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Field>
                      <FieldLabel htmlFor="monthly-price">Mensal</FieldLabel>
                      <Input id="monthly-price" name="monthlyPrice" inputMode="decimal" placeholder="129,90" />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="quarterly-price">Trimestral</FieldLabel>
                      <Input id="quarterly-price" name="quarterlyPrice" inputMode="decimal" placeholder="349,90" />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="semiannual-price">Semestral</FieldLabel>
                      <Input id="semiannual-price" name="semiannualPrice" inputMode="decimal" placeholder="649,90" />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="yearly-price">Anual</FieldLabel>
                      <Input id="yearly-price" name="yearlyPrice" inputMode="decimal" placeholder="1299,00" />
                    </Field>
                  </FieldGroup>
                </FieldSet>
              </FieldGroup>

              <Separator />

              <FieldSet className="gap-3">
                <FieldLegend variant="label">Acessos incluídos</FieldLegend>
                <FieldDescription>Selecione ao menos um acesso. Recursos com limite exigem uma cota inteira não negativa.</FieldDescription>
                {activeFeatures.length === 0 ? (
                  <Alert>
                    <PackageOpen aria-hidden="true" />
                    <AlertTitle>Nenhum acesso ativo disponível</AlertTitle>
                    <AlertDescription>É necessário ter ao menos um recurso ativo antes de criar um pacote.</AlertDescription>
                  </Alert>
                ) : (
                  <FieldGroup className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {activeFeatures.map((feature) => (
                      <div key={feature.id} className="rounded-lg border p-3">
                        <Field orientation="horizontal" className="items-start">
                          <Checkbox id={`feature-${feature.id}`} name="featureDefinitionId" value={feature.id} className="mt-0.5" />
                          <FieldContent>
                            <FieldLabel htmlFor={`feature-${feature.id}`} className="flex flex-wrap items-center gap-2 font-medium">
                              {feature.name}<Badge variant="secondary">{featureTypeLabel[feature.type]}</Badge>
                            </FieldLabel>
                            <FieldDescription>{feature.description}</FieldDescription>
                          </FieldContent>
                        </Field>
                        {feature.type !== "BOOLEAN" ? (
                          <Field className="ml-7 mt-3">
                            <FieldLabel htmlFor={`limit-${feature.id}`}>Limite incluído ({feature.unit ?? "unidades"})</FieldLabel>
                            <Input id={`limit-${feature.id}`} name={`featureLimit:${feature.id}`} type="number" min={0} step={1} placeholder="0" />
                          </Field>
                        ) : null}
                      </div>
                    ))}
                  </FieldGroup>
                )}
              </FieldSet>

              <Alert>
                <Layers3 aria-hidden="true" />
                <AlertTitle>Rascunho editável · versão publicada imutável</AlertTitle>
                <AlertDescription>
                  Após publicar, alteração material exige nova versão e mudança de valor exige novo preço. Assinaturas antigas continuam vinculadas ao contrato histórico.
                </AlertDescription>
              </Alert>
              <CatalogSubmitButton disabled={activeFeatures.length === 0} pendingLabel="Criando pacote…">Criar pacote e versão 1</CatalogSubmitButton>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <PackageOpen aria-hidden="true" />
          <AlertTitle>Consulta somente</AlertTitle>
          <AlertDescription>Seu perfil permite consultar o catálogo, mas não criar ou alterar rascunhos.</AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="catalog-plans-title" className="flex flex-col gap-3">
        <div>
          <h2 id="catalog-plans-title" className="text-lg font-semibold">Pacotes e versões</h2>
        </div>
        {catalog.plans.length === 0 ? (
          <Card><CardContent className="flex min-h-32 flex-col items-center justify-center gap-2 text-center"><PackageOpen aria-hidden="true" /><p className="font-medium">Nenhum pacote configurado</p></CardContent></Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {catalog.plans.map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><CardTitle>{plan.name}</CardTitle><CardDescription>{plan.code}</CardDescription></div>
                    <div className="flex gap-2"><Badge variant="outline">{planStatusLabel[plan.status]}</Badge><Badge variant="secondary">{plan.isPaid ? "Pago" : "Gratuito"}</Badge></div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {plan.versions.map((version) => (
                    <div key={version.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">Versão {version.versionNumber}</p>
                        <Badge variant={version.status === "PUBLISHED" ? "default" : "outline"}>{versionStatusLabel[version.status]}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {version._count.features} recursos · {version._count.prices} preços · {version._count.subscriptions} assinaturas
                      </p>
                      {version.prices.length > 0 ? (
                        <ul className="mt-2 flex flex-col gap-1 text-sm">
                          {version.prices.map((price) => <li key={price.id}>{formatPrice(price.amountMinor)} / {intervalLabel[price.billingInterval]}</li>)}
                        </ul>
                      ) : null}
                      {version.status === "DRAFT" && canPublish ? (
                        <form action={publishPlanVersionAction} className="mt-4 flex flex-col gap-3 rounded-md bg-muted/50 p-3">
                          <input type="hidden" name="planVersionId" value={version.id} />
                          <label className="flex items-start gap-2 text-sm">
                            <input type="checkbox" name="confirmPublish" value="yes" required className="mt-1 size-4 accent-primary" />
                            <span>Confirmo a publicação. Esta versão não poderá ser alterada.</span>
                          </label>
                          <CatalogSubmitButton pendingLabel="Publicando…" variant="secondary">Publicar versão</CatalogSubmitButton>
                        </form>
                      ) : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="catalog-features-title" className="flex flex-col gap-3">
        <div className="flex items-center gap-2"><Tags aria-hidden="true" /><h2 id="catalog-features-title" className="text-lg font-semibold">Recursos disponíveis</h2></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {catalog.features.map((feature) => (
            <Card key={feature.id}>
              <CardHeader className="pb-3"><div className="flex items-start justify-between gap-2"><CardTitle className="text-base">{feature.name}</CardTitle><Badge variant={feature.isActive ? "secondary" : "outline"}>{feature.isActive ? "Ativa" : "Inativa"}</Badge></div><CardDescription>{feature.key}</CardDescription></CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm"><p>{feature.description}</p><p className="text-muted-foreground">{feature.moduleKey.replaceAll("_", " ")} · {featureTypeLabel[feature.type]}{feature.unit ? ` · ${feature.unit}` : ""}</p></CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
