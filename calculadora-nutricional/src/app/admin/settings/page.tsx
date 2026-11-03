import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Settings2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { AsaasApiCredentialsCard } from "@/features/billing/components/AsaasApiCredentialsCard";
import { AsaasWebhookSyncCard } from "@/features/billing/components/AsaasWebhookSyncCard";
import {
  getAsaasSettingsForAdmin,
  getAsaasSetupStatus,
  ASAAS_CONFIGURATION_PREFIX,
} from "@/features/billing/integrations/asaas/asaas-settings";
import { ConfigurationRegistryManager } from "@/features/configuration/components/ConfigurationRegistryManager";
import { INGREDIENT_QUANTITY_PRECISION_KEY } from "@/features/configuration/domain/ingredient-precision";
import { getConfigurationDefinitionsForAdmin } from "@/features/configuration/services/configuration-service";
import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import { authorizePlatformRequest, resolveCurrentPlatformAccess } from "@/features/platform-iam/services/platform-access";

const isAsaasDefinition = (key: string) => key === "business.billing.environment" || key.startsWith(ASAAS_CONFIGURATION_PREFIX);
const API_KEY_DEFINITION_KEYS = new Set([
  "business.billing.asaas.sandbox_api_key",
  "business.billing.asaas.production_api_key",
]);

export default async function AdminSettingsPage() {
  const candidate = await resolveCurrentPlatformAccess(PLATFORM_PERMISSIONS.CONFIGURATION_READ);
  const pagePermission = candidate.allowed
    ? PLATFORM_PERMISSIONS.CONFIGURATION_READ
    : PLATFORM_PERMISSIONS.BILLING_READ;
  const access = await authorizePlatformRequest({
    permission: pagePermission,
    action: "platform.configurations.page.viewed",
    targetType: "ADMIN_ROUTE",
    targetId: "/admin/settings",
  });
  if (!access.allowed) {
    if (!access.user) redirect("/login?callbackUrl=/admin/settings");
    redirect("/dashboard");
  }

  const canReadAll = access.permissionKeys.includes(PLATFORM_PERMISSIONS.CONFIGURATION_READ);
  const allDefinitions = await getConfigurationDefinitionsForAdmin();
  const definitions = canReadAll ? allDefinitions : allDefinitions.filter((definition) => isAsaasDefinition(definition.key));
  const [setup, settings] = await Promise.all([getAsaasSetupStatus(), getAsaasSettingsForAdmin()]);
  const serializableDefinitions = definitions.map((definition) => ({
    ...definition,
    values: definition.values.map((value) => ({ ...value, updatedAt: value.updatedAt.toISOString() })),
  }));
  const asaasDefinitions = serializableDefinitions.filter((definition) =>
    isAsaasDefinition(definition.key) && !API_KEY_DEFINITION_KEYS.has(definition.key),
  );
  const otherDefinitions = serializableDefinitions.filter((definition) => !isAsaasDefinition(definition.key) && definition.key !== INGREDIENT_QUANTITY_PRECISION_KEY);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        title="Configurações"
        description="Credenciais e parâmetros do Asaas ficam no registro global, criptografados no banco."
        actions={<Badge variant="secondary">{definitions.length} definições visíveis</Badge>}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="size-5 text-primary" aria-hidden="true" />
            <CardTitle>Conexão Asaas</CardTitle>
          </div>
          <CardDescription>
            A URL oficial é derivada do ambiente. Sandbox e Produção usam chaves separadas e a Produção exige autorização no próprio registro e runtime produtivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Ambiente</p><p className="font-medium">{setup.environment === "sandbox" ? "Sandbox" : "Produção"}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Base URL efetiva</p><p className="break-all font-mono text-sm">{setup.baseUrl}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Chave ativa</p><p className="font-medium">{setup.configured ? "Armazenada" : "Pendente ou bloqueada"}</p></div>
        </CardContent>
      </Card>

      {!setup.configured ? (
        <Alert>
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>{setup.errorCode
            ? settings.environment === "production" ? "Ambiente bloqueado pela proteção de Produção" : "Credencial ou parâmetro do Asaas inválido"
            : "Asaas sem chave ativa"}</AlertTitle>
          <AlertDescription>
            {setup.errorCode
              ? settings.environment === "production"
                ? "Use Sandbox para configurar e validar. Produção requer runtime produtivo e a opção de Produção habilitada no registro."
                : "Confira o prefixo da chave do ambiente selecionado e os requisitos do token do webhook."
              : "Cadastre a chave do ambiente escolhido. O checkout e as chamadas externas permanecem indisponíveis até existir uma chave válida."}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>Chave ativa armazenada com segurança</AlertTitle>
          <AlertDescription>O segredo é descriptografado somente no servidor e nunca volta para o navegador.</AlertDescription>
        </Alert>
      )}

      <AsaasApiCredentialsCard
        sandboxApiKeyConfigured={access.permissionKeys.includes(PLATFORM_PERMISSIONS.BILLING_CONFIGURATION_MANAGE)
          ? settings.credentials.sandboxApiKeyConfigured
          : null}
        productionApiKeyConfigured={access.permissionKeys.includes(PLATFORM_PERMISSIONS.BILLING_CONFIGURATION_MANAGE)
          ? settings.credentials.productionApiKeyConfigured
          : null}
        canManage={access.permissionKeys.includes(PLATFORM_PERMISSIONS.BILLING_CONFIGURATION_MANAGE)}
      />

      {settings.environment === "production" && settings.productionEnabled ? (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Produção habilitada</AlertTitle>
          <AlertDescription>Alterações de webhook afetam os próximos eventos financeiros da conta. Revise URL, token e eventos antes de sincronizar.</AlertDescription>
        </Alert>
      ) : null}

      <Alert>
        <AlertTitle>Chave mestra de criptografia</AlertTitle>
        <AlertDescription>
          O banco armazena os valores Asaas cifrados. Mantenha a chave mestra dedicada <code>SECRET_ENCRYPTION_KEY</code> em um secret manager do runtime; ela protege os dados cifrados e não é uma credencial da integração. Nunca a coloque no mesmo banco.
        </AlertDescription>
      </Alert>

      {access.permissionKeys.includes(PLATFORM_PERMISSIONS.BILLING_CONFIGURATION_MANAGE) ? (
        <Alert>
          <AlertTitle>Alterações financeiras exigem sessão privilegiada</AlertTitle>
          <AlertDescription>
            Antes de salvar credenciais ou sincronizar o webhook, solicite uma sessão com 2FA para “Configurar integração financeira” e alvo <code>ASAAS_CONFIGURATION / GLOBAL</code>. A sessão expira em até 15 minutos. <Link className="font-medium underline underline-offset-4" href="/admin/security/privileged-sessions">Abrir acessos temporários</Link>.
          </AlertDescription>
        </Alert>
      ) : null}

      <ConfigurationRegistryManager
        definitions={asaasDefinitions}
        canManage={access.permissionKeys.includes(PLATFORM_PERMISSIONS.CONFIGURATION_MANAGE)}
        canManageBilling={access.permissionKeys.includes(PLATFORM_PERMISSIONS.BILLING_CONFIGURATION_MANAGE)}
        globalScopeOnly
      />

      <AsaasWebhookSyncCard
        environment={settings.environment}
        apiConfigured={setup.configured}
        webhookConfigured={settings.webhook.authTokenConfigured}
        webhookId={settings.webhook.id}
        canManage={access.permissionKeys.includes(PLATFORM_PERMISSIONS.BILLING_CONFIGURATION_MANAGE)}
      />

      {otherDefinitions.length > 0 ? (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Outras configurações</h2>
            <p className="text-sm text-muted-foreground">Parâmetros globais, de organização e de usuário do restante da plataforma.</p>
          </div>
          <ConfigurationRegistryManager
            definitions={otherDefinitions}
            canManage={access.permissionKeys.includes(PLATFORM_PERMISSIONS.CONFIGURATION_MANAGE)}
            canManageBilling={access.permissionKeys.includes(PLATFORM_PERMISSIONS.BILLING_CONFIGURATION_MANAGE)}
          />
        </section>
      ) : null}
    </div>
  );
}
