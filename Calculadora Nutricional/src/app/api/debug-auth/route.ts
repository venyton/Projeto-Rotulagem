import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const userCount = await prisma.user.count();
        const testUser = await prisma.user.findUnique({
            where: { email: 'teste@teste.com' },
            select: { id: true, email: true, createdAt: true } // Don't select password
        });

        return NextResponse.json({
            status: "ok",
            env: {
                NEXTAUTH_URL: process.env.NEXTAUTH_URL,
                NEXTAUTH_SECRET_SET: !!process.env.NEXTAUTH_SECRET,
                NODE_ENV: process.env.NODE_ENV,
                VERCEL_URL: process.env.VERCEL_URL,
            },
            database: {
                connected: true,
                userCount,
                testUserFound: !!testUser,
                testUserData: testUser
            }
        });
    } catch (error: any) {
        return NextResponse.json({
            status: "error",
            error: error.message,
            env: {
                NEXTAUTH_URL: process.env.NEXTAUTH_URL,
                NEXTAUTH_SECRET_SET: !!process.env.NEXTAUTH_SECRET,
            }
        }, { status: 500 });
    }
}
