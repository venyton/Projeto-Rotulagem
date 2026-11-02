import "server-only";

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import AzureADProvider from "next-auth/providers/azure-ad";
import { compare } from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { clearLoginFailures, getLoginRateLimitKey, isLoginRateLimited, recordLoginFailure } from "@/lib/security/rate-limit";
import {
    clearPersistentRateLimit,
    consumePersistentRateLimit,
} from "@/lib/security/persistent-rate-limit";
import { getClientAddress, getRequestRateLimit } from "@/lib/security/request-rate-limit";
import { readBoundedBytesResponse } from "@/lib/security/request-body";
import { decryptTotpSecret, verifyTotpCodeWithReplay } from "@/lib/security/totp";
import { MAX_PASSWORD_LENGTH } from "@/lib/security/password";
import {
    ensureDefaultWorkspaceForUser,
    ensureOrganizationEntitlementsForUser,
} from "@/features/saas/services/workspaces";
import { logEvent } from "@/lib/observability/logger";
import { emailSchema, normalizeEmail } from "@/lib/validation/contacts";
import { verifiedOAuthEmail } from "@/lib/security/oauth-identity";
import { LEGAL_DOCUMENT_VERSION } from "@/lib/legal";

const DUMMY_PASSWORD_HASH = "$2b$10$E/sb7/5hCDw.Gg9UVayjV.VQLXXbbHDTd8N9Ste5adR46HA8QUsKy";
const authSecret = process.env.NEXTAUTH_SECRET;
if (process.env.NODE_ENV === "production" && (!authSecret || authSecret.length < 32)) {
    throw new Error("NEXTAUTH_SECRET deve ter pelo menos 32 caracteres em produção.");
}
const useSecureCookies = process.env.NODE_ENV === "production"
    || process.env.SESSION_COOKIE_SECURE === "true";

function configuredOAuthProviders() {
    const providers = [];

    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        providers.push(GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }));
    }

    if (process.env.META_CLIENT_ID && process.env.META_CLIENT_SECRET) {
        providers.push(FacebookProvider({
            clientId: process.env.META_CLIENT_ID,
            clientSecret: process.env.META_CLIENT_SECRET,
        }));
    }

    const microsoftClientId = process.env.MICROSOFT_ENTRA_ID_CLIENT_ID || process.env.OUTLOOK_CLIENT_ID;
    const microsoftClientSecret = process.env.MICROSOFT_ENTRA_ID_CLIENT_SECRET || process.env.OUTLOOK_CLIENT_SECRET;
    if (microsoftClientId && microsoftClientSecret) {
        providers.push(AzureADProvider({
            clientId: microsoftClientId,
            clientSecret: microsoftClientSecret,
            tenantId: process.env.MICROSOFT_ENTRA_TENANT_ID || "common",
            // Preserve the optional avatar while bounding the fixed Graph request.
            profile: async (profile, tokens) => {
                let image: string | null = null;
                try {
                    const response = await fetch("https://graph.microsoft.com/v1.0/me/photos/48x48/$value", {
                        headers: { Authorization: `Bearer ${tokens.access_token}` },
                        redirect: "error",
                        signal: AbortSignal.timeout(2_500),
                    });
                    const mediaType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
                    if (response.ok && mediaType === "image/jpeg") {
                        const photo = await readBoundedBytesResponse(response, 64 * 1024);
                        if (photo.ok) image = `data:image/jpeg;base64,${Buffer.from(photo.value).toString("base64")}`;
                    }
                } catch {
                    // The photo is optional; network failure must not block login.
                }

                return {
                    id: profile.sub,
                    name: profile.name,
                    email: profile.email,
                    image,
                };
            },
        }));
    }

    return providers;
}

export const authOptions: NextAuthOptions = {
    useSecureCookies,
    cookies: {
        sessionToken: {
            name: useSecureCookies ? "__Secure-next-auth.session-token" : "next-auth.session-token",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: useSecureCookies,
            },
        },
    },
    session: {
        strategy: "jwt",
        maxAge: 60 * 60 * 12,
        updateAge: 60 * 60,
    },
    jwt: {
        maxAge: 60 * 60 * 12,
    },
    secret: authSecret,
    pages: {
        signIn: "/login",
        error: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "Sign in",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                twoFactorCode: { label: "2FA", type: "text" },
            },
            async authorize(credentials, request) {
                try {
                    if (!credentials?.email || !credentials.password) {
                        return null;
                    }

                    const email = normalizeEmail(credentials.email);
                    const password = credentials.password;
                    const twoFactorCode = credentials.twoFactorCode ?? "";

                    if (email.length > 254 || password.length > MAX_PASSWORD_LENGTH || twoFactorCode.length > 20) {
                        return null;
                    }

                    const rateLimitKey = getLoginRateLimitKey(email);
                    const ipLimit = await consumePersistentRateLimit(
                        "auth.login.ip",
                        getClientAddress(request),
                        getRequestRateLimit("loginIp"),
                    );
                    if (!ipLimit.allowed) {
                        await compare(password, DUMMY_PASSWORD_HASH);
                        return null;
                    }
                    const persistentLimit = await consumePersistentRateLimit("auth.login", rateLimitKey, {
                        maxAttempts: 8,
                        windowMs: 15 * 60 * 1000,
                    });
                    if (isLoginRateLimited(rateLimitKey) || !persistentLimit.allowed) {
                        await compare(password, DUMMY_PASSWORD_HASH);
                        return null;
                    }

                    const user = await prisma.user.findUnique({
                        where: {
                            email,
                        },
                    });

                    if (!user) {
                        await compare(password, DUMMY_PASSWORD_HASH);
                        recordLoginFailure(rateLimitKey);
                        return null;
                    }

                    if (!user.password) {
                        await compare(password, DUMMY_PASSWORD_HASH);
                        recordLoginFailure(rateLimitKey);
                        return null;
                    }

                    const isPasswordValid = await compare(
                        password,
                        user.password
                    );

                    if (!isPasswordValid) {
                        recordLoginFailure(rateLimitKey);
                        return null;
                    }

                    if (user.twoFactorEnabled) {
                        if (!twoFactorCode) {
                            throw new Error("2FA_REQUIRED");
                        }
                        
                        if (!user.twoFactorSecret) {
                            recordLoginFailure(rateLimitKey);
                            return null;
                        }

                        const secret = decryptTotpSecret(user.twoFactorSecret);
                        const twoFactorResult = await verifyTotpCodeWithReplay(
                            secret,
                            twoFactorCode,
                            user.twoFactorLastUsedStep,
                        );

                        if (!twoFactorResult.valid) {
                            recordLoginFailure(rateLimitKey);
                            throw new Error("2FA_INVALID");
                        }

                        const claimedTimeStep = await prisma.user.updateMany({
                            where: {
                                id: user.id,
                                OR: [
                                    { twoFactorLastUsedStep: null },
                                    { twoFactorLastUsedStep: { lt: twoFactorResult.timeStep } },
                                ],
                            },
                            data: {
                                twoFactorLastUsedAt: new Date(),
                                twoFactorLastUsedStep: twoFactorResult.timeStep,
                            },
                        });
                        if (claimedTimeStep.count !== 1) {
                            recordLoginFailure(rateLimitKey);
                            throw new Error("2FA_INVALID");
                        }
                    }

                    clearLoginFailures(rateLimitKey);
                    await clearPersistentRateLimit("auth.login", rateLimitKey);

                    if (user.email !== email) {
                        return null;
                    }

                    await ensureDefaultWorkspaceForUser(user);
                    await ensureOrganizationEntitlementsForUser(user.id);

                    return {
                        id: user.id + "",
                        email: user.email,
                        name: user.name,
                    };
                } catch (error) {
                    if (error instanceof Error && (error.message === "2FA_REQUIRED" || error.message === "2FA_INVALID")) {
                        throw error;
                    }
                    if (process.env.NODE_ENV !== "production") {
                        logEvent("warn", "auth.credentials_login_failed", {
                            error: error instanceof Error ? error.name : "unknown",
                        });
                    }
                    return null;
                }
            },
        }),
        ...configuredOAuthProviders(),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            if (!account || account.provider === "credentials") return true;

            const providerAccountId = account.providerAccountId.trim();
            if (!providerAccountId || providerAccountId.length > 255) return false;

            const identity = await prisma.externalIdentity.findUnique({
                where: {
                    provider_providerAccountId: {
                        provider: account.provider,
                        providerAccountId,
                    },
                },
                select: { userId: true },
            });
            let dbUser = identity
                ? await prisma.user.findUnique({
                    where: { id: identity.userId },
                    select: { id: true, email: true, twoFactorEnabled: true },
                })
                : null;

            if (!identity) {
                const verifiedEmail = emailSchema.safeParse(
                    verifiedOAuthEmail(profile, user.email) ?? "",
                );

                // Only link an unknown provider identity by email when the
                // provider explicitly asserts that the address is verified.
                if (!verifiedEmail.success) return false;

                const email = normalizeEmail(verifiedEmail.data);
                dbUser = await prisma.user.findUnique({
                    where: { email },
                    select: { id: true, email: true, twoFactorEnabled: true },
                });

                if (dbUser?.twoFactorEnabled) return false;

                if (!dbUser) {
                    const acceptedAt = new Date();
                    try {
                        dbUser = await prisma.user.create({
                            data: {
                                email,
                                name: user.name || email.split("@")[0],
                                password: null,
                                termsAcceptedAt: acceptedAt,
                                privacyAcceptedAt: acceptedAt,
                                legalDocumentVersion: LEGAL_DOCUMENT_VERSION,
                            },
                            select: { id: true, email: true, twoFactorEnabled: true },
                        });
                    } catch {
                        // A concurrent verified sign-in may have created this user.
                        dbUser = await prisma.user.findUnique({
                            where: { email },
                            select: { id: true, email: true, twoFactorEnabled: true },
                        });
                    }
                }

                if (!dbUser || dbUser.twoFactorEnabled) return false;

                try {
                    await prisma.externalIdentity.create({
                        data: {
                            provider: account.provider,
                            providerAccountId,
                            userId: dbUser.id,
                        },
                    });
                } catch {
                    // Only continue if a concurrent callback linked this exact
                    // provider identity to the same account.
                    const concurrentIdentity = await prisma.externalIdentity.findUnique({
                        where: {
                            provider_providerAccountId: {
                                provider: account.provider,
                                providerAccountId,
                            },
                        },
                        select: { userId: true },
                    });
                    if (concurrentIdentity?.userId !== dbUser.id) return false;
                }
            }

            // Credentials enforces TOTP in authorize(); OAuth has no equivalent
            // step-up flow and must not bypass a user's enabled second factor.
            if (!dbUser || dbUser.twoFactorEnabled) return false;

            await ensureDefaultWorkspaceForUser(dbUser);
            await ensureOrganizationEntitlementsForUser(dbUser.id);

            user.id = dbUser.id;
            user.email = dbUser.email;
            return true;
        },
        async session({ session, token }) {
            return {
                ...session,
                user: {
                    ...session.user,
                    id: token.id,
                },
            };
        },
        async jwt({ token, user }) {
            if (user) {
                return {
                    ...token,
                    id: user.id,
                };
            }

            if (token.email) {
                const dbUser = await prisma.user.findUnique({
                    where: { email: normalizeEmail(token.email) },
                    select: { id: true },
                });

                if (dbUser) token.id = dbUser.id;
            }

            return token;
        },
    },
};
