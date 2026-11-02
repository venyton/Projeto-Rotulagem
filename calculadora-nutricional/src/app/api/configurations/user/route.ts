import { ConfigurationScope } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { setConfigurationValue } from "@/features/configuration/services/configuration-service";
import { getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { rejectCrossOriginRequest } from "@/lib/security/request-origin";
import { readBoundedJsonRequest } from "@/lib/security/request-body";

const USER_CONFIGURATION_KEYS = new Set(["ui.interface.scale"]);

export async function PUT(request: NextRequest) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;

  const context = await getCurrentSaaSContext();
  if (!context) return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });

  const bodyResult = await readBoundedJsonRequest(request, 4096);
  if (!bodyResult.ok) {
    return NextResponse.json(
      { error: "Corpo inválido." },
      { status: bodyResult.error === "TOO_LARGE" ? 413 : 400 },
    );
  }

  const body = bodyResult.value;
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Corpo inválido." }, { status: 422 });
  const record = body as Record<string, unknown>;
  if (typeof record.key !== "string" || !USER_CONFIGURATION_KEYS.has(record.key)) return NextResponse.json({ error: "Configuração de usuário não permitida." }, { status: 422 });

  const result = await setConfigurationValue({
    key: record.key,
    value: record.value,
    scope: { scope: ConfigurationScope.USER, userId: context.user.id },
    updatedById: context.user.id,
  });
  if (!result.ok) return NextResponse.json({ error: result.message, code: result.code }, { status: result.code === "NOT_FOUND" ? 404 : 422 });
  return NextResponse.json({ data: result.data }, { headers: { "Cache-Control": "private, no-store" } });
}
