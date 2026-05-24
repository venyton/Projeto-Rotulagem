import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: "E-mail é obrigatório." }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        // We return success even if user doesn't exist to prevent email enumeration
        if (!user) {
            return NextResponse.json({ success: true });
        }

        // Generate a random token
        const rawToken = crypto.randomBytes(32).toString("hex");
        
        // Hash the token for storage
        const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
        
        // Token expires in 1 hour
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: hashedToken,
                resetPasswordExpiresAt: expiresAt,
            },
        });

        const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${rawToken}`;

        // TODO: Send actual email using a provider like Resend or SendGrid
        // For now, we just mock the send by logging to the server console.
        console.log(`\n\n[MOCK EMAIL SEND]`);
        console.log(`To: ${user.email}`);
        console.log(`Subject: Redefinição de Senha - SolZI`);
        console.log(`Body: Clique no link para redefinir sua senha: ${resetUrl}`);
        console.log(`\n\n`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Forgot password error:", error);
        return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
    }
}
