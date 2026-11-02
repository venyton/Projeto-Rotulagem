import { ConfigurationScope } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import {
  resetConfigurationValue,
  setConfigurationValue,
} from "@/features/configuration/services/configuration-service";
import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import { ASAAS_CONFIGURATION_PREFIX } from "@/features/billing/integrations/asaas/asaas-settings";
import { authorizePlatformRequest } from "@/features/platform-iam/services/platform-access";
import { authorizePrivilegedPlatformRequest } from "@/features/platform-iam/services/privileged-sessions";
import { rejectCrossOriginRequest } from "@/lib/security/request-origin";
import { readBoundedJsonRequest } from "@/lib/security/request-body";

type ConfigurationRequestBody = {
  scope?: unknown;
  organizationId?: unknown;
  userId?: unknown;
  value?: unknown;
};

function bodyRecord(value: unknown): ConfigurationRequestBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as ConfigurationRequestBody;
}

function scopeFromBody(body: ConfigurationRequestBody) {
  if (body.scope === ConfigurationScope.GLOBAL) return { scope: ConfigurationScope.GLOBAL } as const;
  if (body.scope === ConfigurationScope.ORGANIZATION && typeof body.organizationId === "string") {
    return { scope: ConfigurationScope.ORGANIZATION, organizationId: body.organizationId } as const;
  }
  if (body.scope === ConfigurationScope.USER && typeof body.userId === "string") {
    return { scope: ConfigurationScope.USER, userId: body.userId } as const;
  }
  return null;
}

function statusForCode(code: string) {
  if (code === "NOT_FOUND") return 404;
  if (code === "READ_ONLY" || code === "INVALID_SCOPE" || code === "INVALID_VALUE") return 422;
  return 409;
}

function isAsaasConfiguration(key: string) {
  return key === "business.billing.environment" || key.startsWith(ASAAS_CONFIGURATION_PREFIX);
}

async function authorizeConfigurationMutation(key: string) {
  if (isAsaasConfiguration(key)) {
    return authorizePrivilegedPlatformRequest({
      permission: PLATFORM_PERMISSIONS.BILLING_CONFIGURATION_MANAGE,
      action: "platform.configuration.mutation.requested",
      targetType: "ASAAS_CONFIGURATION",
      targetId: "GLOBAL",
    });
  }
  return authorizePlatformRequest({
    permission: PLATFORM_PERMISSIONS.CONFIGURATION_MANAGE,
    action: "platform.configuration.mutation.requested",
    targetType: "CONFIGURATION",
    targetId: key,
  });
}

function mutationDenied(access: Awaited<ReturnType<typeof authorizeConfigurationMutation>>) {
  if ("permissionRiskLevel" in access && access.permissionRiskLevel === "HIGH") {
    return NextResponse.json({
      error: "Crie uma sessão privilegiada ativa com 2FA para Configurar integração financeira, alvo ASAAS_CONFIGURATION / GLOBAL.",
      code: "PRIVILEGED_SESSION_REQUIRED",
    }, { status: 403 });
  }
  return NextResponse.json({ error: "Acesso administrativo não autorizado." }, { status: 403 });
}

function privilegedSessionId(access: Awaited<ReturnType<typeof authorizeConfigurationMutation>>) {
  if (!("privilegedSessionId" in access) || typeof access.privilegedSessionId !== "string") return null;
  return access.privilegedSessionId;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;

  try {
    const { key } = await params;
    const access = await authorizeConfigurationMutation(key);
    if (!access.allowed || !access.user) return mutationDenied(access);

    const parsedBody = await readBoundedJsonRequest(request, 16_384);
    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: parsedBody.error === "TOO_LARGE" ? "Corpo da requisição excede o limite." : "Corpo inválido." },
        { status: parsedBody.error === "TOO_LARGE" ? 413 : 400 },
      );
    }
    const body = bodyRecord(parsedBody.value);
    if (!body || !("value" in body)) return NextResponse.json({ error: "Informe um valor." }, { status: 422 });
    const scope = scopeFromBody(body);
    if (!scope) return NextResponse.json({ error: "Escopo inválido." }, { status: 422 });
    const result = await setConfigurationValue({
      key,
      value: body.value,
      scope,
      updatedById: access.user.id,
      privilegedSessionId: privilegedSessionId(access),
    });
    if (!result.ok) return NextResponse.json({ error: result.message, code: result.code }, { status: statusForCode(result.code) });
    return NextResponse.json({ data: result.data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar a configuração." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;

  try {
    const { key } = await params;
    const access = await authorizeConfigurationMutation(key);
    if (!access.allowed || !access.user) return mutationDenied(access);

    const parsedBody = await readBoundedJsonRequest(request, 16_384);
    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: parsedBody.error === "TOO_LARGE" ? "Corpo da requisição excede o limite." : "Corpo inválido." },
        { status: parsedBody.error === "TOO_LARGE" ? 413 : 400 },
      );
    }
    const body = bodyRecord(parsedBody.value);
    const scope = scopeFromBody(body ?? {});
    if (!scope) return NextResponse.json({ error: "Escopo inválido." }, { status: 422 });
    const result = await resetConfigurationValue({
      key,
      scope,
      updatedById: access.user.id,
      privilegedSessionId: privilegedSessionId(access),
    });
    if (!result.ok) return NextResponse.json({ error: result.message, code: result.code }, { status: statusForCode(result.code) });
    return NextResponse.json({ data: result.data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível restaurar a configuração." }, { status: 500 });
  }
}
