import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { hash } from "bcryptjs";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { token, password } = body;

        if (!token || !password) {
            return NextResponse.json({ error: "Token e nova senha são obrigatórios." }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: "A senha deve ter no mínimo 8 caracteres." }, { status: 400 });
        }

        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const user = await prisma.user.findUnique({
            where: { resetPasswordToken: hashedToken },
        });

        if (!user) {
            return NextResponse.json({ error: "Token inválido ou expirado." }, { status: 400 });
        }

        if (user.resetPasswordExpiresAt && user.resetPasswordExpiresAt < new Date()) {
            return NextResponse.json({ error: "Token expirado. Por favor, solicite a redefinição de senha novamente." }, { status: 400 });
        }

        const newPasswordHash = await hash(password, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: newPasswordHash,
                resetPasswordToken: null,
                resetPasswordExpiresAt: null,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Reset password error:", error);
        return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
    }
}
