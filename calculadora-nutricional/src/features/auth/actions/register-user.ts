'use server'

import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { PASSWORD_HASH_ROUNDS, validatePasswordStrength } from "@/lib/security/password";
import { ensureDefaultWorkspaceForUser } from "@/features/saas/services/workspaces";
import {
    consumePersistentRateLimit,
} from "@/lib/security/persistent-rate-limit";
import { getRequestRateLimit } from "@/lib/security/request-rate-limit";

export async function registerUser(prevState: unknown, formData: FormData): Promise<{ error?: string }> {
    const name = ((formData.get("name") as string | null) ?? "").trim();
    const companyName = ((formData.get("companyName") as string | null) ?? "").trim();
    const phone = ((formData.get("phone") as string | null) ?? "").trim();
    const email = ((formData.get("email") as string | null) ?? "").trim().toLowerCase();
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!email || !password || !name || !companyName || !phone) {
        return { error: "Todos os campos são obrigatórios." };
    }

    const globalLimit = await consumePersistentRateLimit(
        "auth.register.global",
        "application",
        getRequestRateLimit("registrationGlobal"),
    );
    if (!globalLimit.allowed) return { error: "Muitas tentativas. Tente novamente mais tarde." };

    if (email.length > 254 || phone.length > 40) {
        return { error: "Dados de cadastro inválidos." };
    }

    const rateLimitScope = "auth.register";
    const rateLimit = await consumePersistentRateLimit(rateLimitScope, email, {
        maxAttempts: 5,
        windowMs: 60 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
        return { error: "Muitas tentativas. Tente novamente mais tarde." };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { error: "Informe um email válido." };
    }

    if (name.length < 2 || name.length > 80) {
        return { error: "O nome deve ter entre 2 e 80 caracteres." };
    }

    if (companyName.length < 2 || companyName.length > 120) {
        return { error: "Informe o nome da empresa." };
    }

    if (password !== confirmPassword) {
        return { error: "As senhas não coincidem." };
    }

    const passwordError = validatePasswordStrength(password, { email, name });
    if (passwordError) {
        return { error: passwordError };
    }

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        return { error: "Email já cadastrado." };
    }

    const hashedPassword = await hash(password, PASSWORD_HASH_ROUNDS);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
        },
    });

    await ensureDefaultWorkspaceForUser(user, {
        organizationName: companyName,
        entitlementSource: "DEFAULT",
    });

    redirect("/login");
}
