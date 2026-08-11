import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossOriginRequest } from "@/lib/security/request-origin";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { ModuleAccessError, requireModuleAccess } from "@/features/saas/services/entitlements";
import { consumeRequestRateLimit, getRequestRateLimit, rateLimitResponse } from "@/lib/security/request-rate-limit";
import { isDatabaseId } from "@/lib/validation/identifiers";

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const originError = rejectCrossOriginRequest(req);
    if (originError) return originError;

    const params = await props.params;
    if (!isDatabaseId(params.id)) {
        return NextResponse.json({ error: "Solicitação inválida" }, { status: 400 });
    }
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let context: Awaited<ReturnType<typeof requireModuleAccess>>;
    try {
        context = await requireModuleAccess(SAAS_MODULES.TABLES);
    } catch (error) {
        if (error instanceof ModuleAccessError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        throw error;
    }

    const requestLimit = await consumeRequestRateLimit(
        "table_writes",
        context.user.id,
        getRequestRateLimit("tableWrites"),
    );
    if (!requestLimit.allowed) {
        return rateLimitResponse(requestLimit, { error: "Limite temporário de alterações atingido." });
    }

    const deleted = await prisma.generatedTable.deleteMany({
        where: {
            id: params.id,
            organizationId: context.organization.id,
        },
    });

    if (deleted.count === 0) {
        return NextResponse.json({ error: "Tabela não encontrada" }, { status: 404 });
    }

    revalidatePath("/dashboard");
    return NextResponse.json({ success: true });
}
