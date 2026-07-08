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
            allowDangerousEmailAccountLinking: true,
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
        async jwt({ token, user }) {
            if (user) {
                // Fresh login — look up from DB to get authoritative id + role
                const dbUser = await prisma.user.findUnique({
                    where: { email: user.email! },
                    select: { id: true, role: true },
                });
                if (dbUser) {
                    token.id = dbUser.id;
                    token.role = dbUser.role;
                } else {
                    // Fallback for brand-new OAuth users not yet in DB
                    token.id = user.id;
                    token.role = user.role ?? "CUSTOMER";
                }
                // Tag the token with the email so we can detect mismatches on refresh
                token.email = user.email;
            } else if (token.id) {
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
                // Ensure the session email always matches the DB user
                session.user.email = token.email as string;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
};