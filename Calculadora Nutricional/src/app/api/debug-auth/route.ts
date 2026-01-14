import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        secret_exists: !!process.env.NEXTAUTH_SECRET,
        secret_length: process.env.NEXTAUTH_SECRET?.length || 0,
        database_url_exists: !!process.env.POSTGRES_PRISMA_URL,
        node_env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
}
