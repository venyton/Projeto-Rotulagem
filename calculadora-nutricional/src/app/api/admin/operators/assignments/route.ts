import { NextRequest, NextResponse } from "next/server";

import {
  createPlatformOperatorAssignment,
  OperatorManagementError,
} from "@/features/platform-iam/services/operator-management";
import { ROLLOUT_FLAGS } from "@/features/rollout/domain/feature-flags";
import { isRolloutFeatureEnabled } from "@/features/rollout/services/feature-flags";
import { rejectCrossOriginRequest } from "@/lib/security/request-origin";
import { readBoundedJsonRequest } from "@/lib/security/request-body";
import { createPlatformAdminAssignmentRequestSchema } from "@/lib/validation/platform-iam";

export const dynamic = "force-dynamic";

const STATUS_BY_CODE: Record<OperatorManagementError["code"], number> = {
  UNAUTHENTICATED: 401,
  ACCESS_DENIED: 403,
  PRIVILEGED_SESSION_REQUIRED: 403,
  INVALID_EXPIRY: 422,
  NOT_FOUND: 404,
  TWO_FACTOR_REQUIRED: 422,
  ASSIGNMENT_EXISTS: 409,
  LAST_OWNER_REQUIRED: 409,
  ALREADY_REVOKED: 409,
};

export async function POST(request: NextRequest) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;
  if (!await isRolloutFeatureEnabled(ROLLOUT_FLAGS.CONTROL_PLANE)) {
    return NextResponse.json({ error: "Recurso não encontrado." }, { status: 404 });
  }

  const parsedBody = await readBoundedJsonRequest(request, 4096);
  if (!parsedBody.ok) {
    return NextResponse.json(
      { error: parsedBody.error === "TOO_LARGE" ? "Corpo da requisição excede o limite." : "Corpo JSON inválido." },
      { status: parsedBody.error === "TOO_LARGE" ? 413 : 400 },
    );
  }

  const parsed = createPlatformAdminAssignmentRequestSchema.safeParse(parsedBody.value);
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe um usuário, perfil e expiração válidos." }, { status: 400 });
  }

  try {
    const assignment = await createPlatformOperatorAssignment({
      userId: parsed.data.userId,
      platformRoleKey: parsed.data.roleKey,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    });

    return NextResponse.json({
      data: {
        id: assignment.id,
        userId: assignment.userId,
        roleKey: assignment.platformRole.key,
        status: assignment.status,
        startsAt: assignment.startsAt.toISOString(),
        expiresAt: assignment.expiresAt?.toISOString() ?? null,
      },
    }, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof OperatorManagementError) {
      return NextResponse.json({ error: error.message, code: error.code }, {
        status: STATUS_BY_CODE[error.code],
        headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.json({ error: "Não foi possível criar o perfil de administrador." }, {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
