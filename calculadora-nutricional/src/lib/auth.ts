import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
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
            },
            async authorize(credentials) {
                try {
                    const dbUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || "MISSING";
                    console.log("DB URL PREFIX:", dbUrl.substring(0, 10));
                    console.log("Authorizing user:", credentials?.email);
                    if (!credentials?.email || !credentials.password) {
                        return null;
                    }

                    const user = await prisma.user.findUnique({
                        where: {
                            email: credentials.email,
                        },
                    });

                    console.log("User found:", user ? "YES" : "NO");

                    if (!user) {
                        return null;
                    }

                    const isPasswordValid = await compare(
                        credentials.password,
                        user.password
                    );

                    console.log("Password valid:", isPasswordValid ? "YES" : "NO");

                    if (!isPasswordValid) {
                        return null;
                    }

                    return {
                        id: user.id + "",
                        email: user.email,
                        name: user.name,
                    };
                } catch (error) {
                    console.error("AUTHORIZE ERROR:", error);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
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
            return token;
        },
    },
};
