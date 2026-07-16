import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import type { Adapter } from "next-auth/adapters";

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

                if (!email) {
                    throw new Error("Email is required for authentication");
                }

                const user = await prisma.user.findUnique({ where: { email } });

                if (!user || !user.password) return null;

                const isValidPassword = await bcrypt.compare(password, user.password);
                if (!isValidPassword) return null;

                return { id: user.id, name: user.name, email: user.email, role: user.role };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, account }) {
            if (user && account) {
                if (!user.email) {
                    throw new Error("Authentication failed: Provider did not return an email address.");
                }

                // Fresh login — look up the user strictly by email to get their DB id + role.
                // This is the single source of truth and prevents any token cross-contamination.
                const dbUser = await prisma.user.findUnique({
                    where: { email: user.email },
                    select: { id: true, role: true, email: true },
                });

                if (!dbUser) {
                    // Brand-new OAuth user: the adapter may not have committed them yet.
                    // Throw to abort the session rather than risk falling back to a stale id.
                    throw new Error("Authentication failed: User record not found after sign-in.");
                }

                token.id = dbUser.id;
                token.role = dbUser.role;
                token.email = dbUser.email;
            } else if (!user && token.id) {
                if (typeof token.id !== "string") {
                    throw new Error("Authentication failed: Invalid session token ID.");
                }

                // Token refresh — re-validate against DB to prevent stale sessions
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id },
                    select: { id: true, role: true, email: true },
                });

                if (!dbUser) {
                    // User was deleted — invalidate the token
                    return {} as typeof token;
                }

                token.role = dbUser.role;
                token.email = dbUser.email;
            }
            return token;
        },

        async session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.email = token.email as string;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
};