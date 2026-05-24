import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import AzureADProvider from "next-auth/providers/azure-ad";
import { compare } from "bcryptjs";
import { MarketingEventType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { clearLoginFailures, getLoginRateLimitKey, isLoginRateLimited, recordLoginFailure } from "@/lib/security/rate-limit";
import {
    clearPersistentRateLimit,
    isPersistentRateLimited,
    recordPersistentRateLimitFailure,
} from "@/lib/security/persistent-rate-limit";
import { decryptTotpSecret, verifyTotpCode } from "@/lib/security/totp";
import { ensureDefaultWorkspaceForUser } from "@/features/saas/services/workspaces";

const DUMMY_PASSWORD_HASH = "$2b$10$E/sb7/5hCDw.Gg9UVayjV.VQLXXbbHDTd8N9Ste5adR46HA8QUsKy";

function normalizeEmail(value: string) {
    return value.trim().toLowerCase();
}

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
        }));
    }

    return providers;
}

async function recordAuthMarketingEvent(input: {
    organizationId: string;
    userId: string;
    eventType: MarketingEventType;
    provider: string;
}) {
    try {
        await prisma.marketingEvent.create({
            data: {
                organizationId: input.organizationId,
                userId: input.userId,
                eventType: input.eventType,
                metadata: {
                    provider: input.provider,
                },
            },
        });
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Falha ao registrar evento de autenticação.", error);
        }
    }
}

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
        maxAge: 60 * 60 * 12,
        updateAge: 60 * 60,
    },
    jwt: {
        maxAge: 60 * 60 * 12,
    },
    secret: process.env.NEXTAUTH_SECRET,
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
            async authorize(credentials) {
                try {
                    if (!credentials?.email || !credentials.password) {
                        return null;
                    }

                    const email = normalizeEmail(credentials.email);
                    const password = credentials.password;
                    const twoFactorCode = credentials.twoFactorCode ?? "";

                    if (email.length > 254 || password.length > 256 || twoFactorCode.length > 20) {
                        return null;
                    }

                    const rateLimitKey = getLoginRateLimitKey(email);
                    const persistentLimited = await isPersistentRateLimited("auth.login", rateLimitKey);
                    if (isLoginRateLimited(rateLimitKey) || persistentLimited) {
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
                        await recordPersistentRateLimitFailure("auth.login", rateLimitKey);
                        return null;
                    }

                    if (!user.password) {
                        recordLoginFailure(rateLimitKey);
                        await recordPersistentRateLimitFailure("auth.login", rateLimitKey);
                        return null;
                    }

                    const isPasswordValid = await compare(
                        password,
                        user.password
                    );

                    if (!isPasswordValid) {
                        recordLoginFailure(rateLimitKey);
                        await recordPersistentRateLimitFailure("auth.login", rateLimitKey);
                        return null;
                    }

                    if (user.twoFactorEnabled) {
                        if (!user.twoFactorSecret) {
                            recordLoginFailure(rateLimitKey);
                            await recordPersistentRateLimitFailure("auth.login", rateLimitKey);
                            return null;
                        }

                        const secret = decryptTotpSecret(user.twoFactorSecret);
                        const isTwoFactorValid = await verifyTotpCode(secret, twoFactorCode);

                        if (!isTwoFactorValid) {
                            recordLoginFailure(rateLimitKey);
                            await recordPersistentRateLimitFailure("auth.login", rateLimitKey);
                            return null;
                        }

                        await prisma.user.update({
                            where: { id: user.id },
                            data: { twoFactorLastUsedAt: new Date() },
                        });
                    }

                    clearLoginFailures(rateLimitKey);
                    await clearPersistentRateLimit("auth.login", rateLimitKey);

                    if (user.email !== email) {
                        return null;
                    }

                    const organization = await ensureDefaultWorkspaceForUser(user);
                    await recordAuthMarketingEvent({
                        organizationId: organization.id,
                        userId: user.id,
                        eventType: MarketingEventType.LOGIN,
                        provider: "credentials",
                    });

                    return {
                        id: user.id + "",
                        email: user.email,
                        name: user.name,
                    };
                } catch (error) {
                    if (process.env.NODE_ENV !== "production") {
                        console.error("Falha no login por credenciais.", error);
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

            const email = normalizeEmail(user.email || (profile as { email?: string } | undefined)?.email || "");
            if (!email) return false;

            const existingUser = await prisma.user.findUnique({
                where: { email },
                select: { id: true },
            });

            if (!existingUser) {
                return false;
            }

            const dbUser = await prisma.user.upsert({
                where: { email },
                create: {
                    email,
                    name: user.name || email.split("@")[0],
                    password: null,
                },
                update: {
                    name: user.name || undefined,
                },
                select: { id: true, email: true, name: true },
            });

            const organization = await ensureDefaultWorkspaceForUser(dbUser);
            await recordAuthMarketingEvent({
                organizationId: organization.id,
                userId: dbUser.id,
                eventType: existingUser ? MarketingEventType.LOGIN : MarketingEventType.SIGNUP_COMPLETED,
                provider: account.provider,
            });

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
