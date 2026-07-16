import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossOriginRequest } from "@/lib/security/request-origin";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { ModuleAccessError, requireModuleAccess } from "@/features/saas/services/entitlements";

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const originError = rejectCrossOriginRequest(req);
    if (originError) return originError;

    const params = await props.params;
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(params.id)) {
        return NextResponse.json({ error: "Solicitação inválida" }, { status: 400 });
    }
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        await requireModuleAccess(SAAS_MODULES.TABLES);
    } catch (error) {
        if (error instanceof ModuleAccessError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        throw error;
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });

    if (!user) {
        return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const deleted = await prisma.generatedTable.deleteMany({
        where: {
            id: params.id,
            userId: user.id,
        },
    });

    if (deleted.count === 0) {
        return NextResponse.json({ error: "Tabela não encontrada" }, { status: 404 });
    }

    revalidatePath("/dashboard");
    return NextResponse.json({ success: true });
}
