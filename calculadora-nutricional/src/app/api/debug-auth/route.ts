import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export async function GET() {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    return NextResponse.json({
        secret_configured: Boolean(process.env.NEXTAUTH_SECRET),
        database_configured: Boolean(process.env.POSTGRES_PRISMA_URL),
        node_env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
}
