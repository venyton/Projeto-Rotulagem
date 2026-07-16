import { Braces } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { ModuleGateMessage } from "@/features/saas/components/ModuleGateMessage";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { contextHasModuleAccess, getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { ApiAccessTokenManager } from "@/features/api-access/components/ApiAccessTokenManager";
import { prisma } from "@/lib/prisma";

export default async function ApiAccessPage() {
  const context = await getCurrentSaaSContext();
  if (!context || !contextHasModuleAccess(context, SAAS_MODULES.API_ACCESS)) {
    return <ModuleGateMessage moduleKey={SAAS_MODULES.API_ACCESS} />;
  }

  const tokens = await prisma.apiAccessToken.findMany({
    where: { organizationId: context.organization.id, userId: context.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      lastFour: true,
      expiresAt: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  return (
    <div className="app-page flex flex-col gap-6">
      <PageHeader
        eyebrow="Integrações"
        icon={Braces}
        title="API externa"
        description="Crie credenciais para automações e consulte as tabelas nutricionais da conta."
      />

      <div className="rounded-lg border bg-muted/25 p-4 text-sm">
        <p className="font-medium">Endpoint disponível</p>
        <code className="mt-2 block overflow-x-auto rounded bg-background px-3 py-2 text-xs">GET /api/v1/tables</code>
        <p className="mt-2 text-muted-foreground">Envie o token no cabeçalho Authorization: Bearer SEU_TOKEN.</p>
      </div>

      <ApiAccessTokenManager
        tokens={tokens.map((token) => ({
          ...token,
          expiresAt: token.expiresAt?.toISOString() ?? null,
          lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
          revokedAt: token.revokedAt?.toISOString() ?? null,
          createdAt: token.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
