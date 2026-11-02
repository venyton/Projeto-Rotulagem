import { NextRequest, NextResponse } from "next/server";

import { BillingProviderError } from "@/features/billing/domain/billing-provider";
import { synchronizeAsaasWebhook } from "@/features/billing/integrations/asaas/asaas-webhook-setup";
import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import { authorizePrivilegedPlatformRequest } from "@/features/platform-iam/services/privileged-sessions";
import { rejectCrossOriginRequest } from "@/lib/security/request-origin";

export const runtime = "nodejs";

function statusForError(error: unknown) {
  if (!(error instanceof BillingProviderError)) return 500;
  if (error.code === "INVALID_CONFIGURATION" || error.code === "VALIDATION_ERROR") return 422;
  if (error.code === "NOT_CONFIGURED" || error.code === "NOT_FOUND" || error.code === "DUPLICATE_REMOTE_MAPPING") return 409;
  return 502;
}

export async function POST(request: NextRequest) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;

  const access = await authorizePrivilegedPlatformRequest({
    permission: PLATFORM_PERMISSIONS.BILLING_CONFIGURATION_MANAGE,
    action: "platform.billing.asaas.webhook.sync.requested",
    targetType: "ASAAS_CONFIGURATION",
    targetId: "GLOBAL",
  });
  if (!access.allowed || !access.user) {
    if (access.permissionRiskLevel === "HIGH") {
      return NextResponse.json({
        error: "Crie uma sessão privilegiada ativa com 2FA para Configurar integração financeira, alvo ASAAS_CONFIGURATION / GLOBAL.",
        code: "PRIVILEGED_SESSION_REQUIRED",
      }, { status: 403 });
    }
    return NextResponse.json({ error: "Acesso administrativo não autorizado." }, { status: 403 });
  }

  try {
    const data = await synchronizeAsaasWebhook(access.user.id, access.privilegedSessionId);
    return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = statusForError(error);
    const message = error instanceof BillingProviderError
      ? `Sincronização do webhook não concluída (${error.code}).`
      : "Sincronização do webhook não concluída. Verifique a configuração e tente novamente.";
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
