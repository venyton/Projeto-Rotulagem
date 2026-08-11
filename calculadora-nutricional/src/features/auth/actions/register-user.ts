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
import { LEGAL_DOCUMENT_VERSION } from "@/lib/legal";
import { OrganizationKind, Prisma } from "@prisma/client";
import {
    hashBrazilianDocument,
    isValidCnpj,
    isValidCpf,
    lastFourDigits,
} from "@/features/organizations/domain/brazilian-documents";
import { isValidEmail, normalizeEmail } from "@/lib/validation/contacts";

export async function registerUser(prevState: unknown, formData: FormData): Promise<{ error?: string }> {
    const name = ((formData.get("name") as string | null) ?? "").trim();
    const companyName = ((formData.get("companyName") as string | null) ?? "").trim();
    const tradeName = ((formData.get("tradeName") as string | null) ?? "").trim();
    const accountKind = formData.get("accountKind") === "COMPANY" ? "COMPANY" : "INDIVIDUAL";
    const cpf = ((formData.get("cpf") as string | null) ?? "").trim();
    const cnpj = ((formData.get("cnpj") as string | null) ?? "").trim();
    const phone = ((formData.get("phone") as string | null) ?? "").trim();
    const email = normalizeEmail(formData.get("email"));
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const legalAcceptance = formData.get("legalAcceptance") === "accepted";

    if (!email || !password || !name || !cpf || !phone || (accountKind === "COMPANY" && (!companyName || !cnpj))) {
        return { error: "Todos os campos são obrigatórios." };
    }

    if (!legalAcceptance) {
        return { error: "Aceite os Termos de Uso e a Política de Privacidade para criar a conta." };
    }

    const globalLimit = await consumePersistentRateLimit(
        "auth.register.global",
        "application",
        getRequestRateLimit("registrationGlobal"),
    );
    if (!globalLimit.allowed) return { error: "Muitas tentativas. Tente novamente mais tarde." };

    if (phone.length > 40) {
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

    if (!isValidEmail(email)) {
        return { error: "Informe um email válido." };
    }

    if (name.length < 2 || name.length > 80) {
        return { error: "O nome deve ter entre 2 e 80 caracteres." };
    }

    if (accountKind === "COMPANY" && (companyName.length < 2 || companyName.length > 120 || tradeName.length > 120)) {
        return { error: "Informe os dados da empresa." };
    }

    if (!isValidCpf(cpf)) return { error: "Informe um CPF válido." };
    if (accountKind === "COMPANY" && !isValidCnpj(cnpj)) return { error: "Informe um CNPJ válido." };

    if (password !== confirmPassword) {
        return { error: "As senhas não coincidem." };
    }

    const passwordError = validatePasswordStrength(password, { email, name });
    if (passwordError) {
        return { error: passwordError };
    }

    const cpfHash = hashBrazilianDocument("CPF", cpf);
    const cnpjHash = accountKind === "COMPANY" ? hashBrazilianDocument("CNPJ", cnpj) : null;
    const [existingUser, existingCpf, existingCnpj] = await Promise.all([
        prisma.user.findUnique({ where: { email }, select: { id: true } }),
        prisma.user.findUnique({ where: { cpfHash }, select: { id: true } }),
        cnpjHash ? prisma.organization.findUnique({ where: { cnpjHash }, select: { id: true } }) : Promise.resolve(null),
    ]);

    if (existingUser) {
        return { error: "Email já cadastrado." };
    }
    if (existingCpf) return { error: "CPF já cadastrado." };
    if (existingCnpj) return { error: "CNPJ já cadastrado." };

    const hashedPassword = await hash(password, PASSWORD_HASH_ROUNDS);

    try {
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                cpfHash,
                cpfLastFour: lastFourDigits(cpf),
                termsAcceptedAt: new Date(),
                privacyAcceptedAt: new Date(),
                legalDocumentVersion: LEGAL_DOCUMENT_VERSION,
            },
        });

        await ensureDefaultWorkspaceForUser(user, {
            organizationName: accountKind === "COMPANY" ? companyName : name,
            organizationKind: accountKind === "COMPANY" ? OrganizationKind.COMPANY : OrganizationKind.INDIVIDUAL,
            legalName: accountKind === "COMPANY" ? companyName : null,
            tradeName: accountKind === "COMPANY" ? tradeName : null,
            cnpjHash,
            cnpjLastFour: cnpjHash ? lastFourDigits(cnpj) : null,
            entitlementSource: "DEFAULT",
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return { error: "CPF, CNPJ ou email já cadastrado." };
        }
        throw error;
    }

    redirect("/login");
}
