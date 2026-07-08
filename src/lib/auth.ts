import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import type { Adapter } from "next-auth/adapters";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role: string;
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: string;
    }
}

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma) as Adapter,
    session: {
        strategy: "jwt",
    },
    providers: [
        ((GoogleProvider as unknown as { default?: typeof GoogleProvider }).default || GoogleProvider)({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            authorization: { params: { prompt: "select_account" } },
        }),
        ((CredentialsProvider as unknown as { default?: typeof CredentialsProvider }).default || CredentialsProvider)({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials: Record<"email" | "password", string> | undefined) {
                const result = loginSchema.safeParse(credentials);
                if (!result.success) return null;

                const { email, password } = result.data;
                const user = await prisma.user.findUnique({ where: { email } });

                if (!user || !user.password) return null;

                const isValidPassword = await bcrypt.compare(password, user.password);
                if (!isValidPassword) return null;

                return { id: user.id, name: user.name, email: user.email, role: user.role };
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === "google" && user.email) {
                const existingUser = await prisma.user.findUnique({
                    where: { email: user.email },
                    include: { accounts: { where: { provider: "google" } } },
                });

                if (existingUser) {
                    // User exists — check if Google is already linked
                    if (existingUser.accounts.length === 0) {
                        // No Google account linked yet — safely link it now by exact email match
                        await prisma.account.create({
                            data: {
                                userId: existingUser.id,
                                type: account.type,
                                provider: account.provider,
                                providerAccountId: account.providerAccountId,
                                access_token: account.access_token,
                                refresh_token: account.refresh_token,
                                expires_at: account.expires_at,
                                token_type: account.token_type,
                                scope: account.scope,
                                id_token: account.id_token,
                                session_state: account.session_state as string | null,
                            },
                        });
                        // Override the user object so the session gets the right id/role
                        user.id = existingUser.id;
                        (user as { id: string; role?: string }).role = existingUser.role;
                    }
                    // If Google already linked, NextAuth proceeds normally
                    return true;
                }
                // No existing user → NextAuth/PrismaAdapter creates a new CUSTOMER automatically
            }
            return true;
        },

        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as { id: string; role?: string }).role ?? "CUSTOMER";
            }
            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
};