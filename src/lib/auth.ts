import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import nodemailer from "nodemailer";
import type { Adapter } from "next-auth/adapters";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma) as Adapter,
    session: {
        strategy: "jwt",
    },
    providers: [
        EmailProvider({
            server: {
                host: "smtp.ethereal.email",
                port: 587,
                auth: {
                    user: "ynwdhd73522u3jon@ethereal.email",
                    pass: "PYJWCzzgj4S9wkM13D",
                },
            },
            from: "noreply@ticketing-system.local",
            sendVerificationRequest: async ({ identifier, url, provider }) => {
                const { host } = new URL(url);
                const transport = nodemailer.createTransport(provider.server);
                const result = await transport.sendMail({
                    to: identifier,
                    from: provider.from,
                    subject: `Sign in to ${host}`,
                    text: `Sign in to ${host}\n${url}\n\n`,
                    html: `<p>Sign in to <strong>${host}</strong></p><p><a href="${url}">Click here to sign in</a></p>`,
                });
                
                // For development, we print the Ethereal link directly to the console
                // so the user doesn't have to log into Ethereal to click the link!
                console.log("=========================================");
                console.log("📬 MAGIC LINK GENERATED! ");
                console.log("Direct Link (Click to login): %s", url);
                console.log("Ethereal Preview URL: %s", nodemailer.getTestMessageUrl(result));
                console.log("=========================================");
            }
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const result = loginSchema.safeParse(credentials);

                if (!result.success) {
                    return null;
                }

                const { email, password } = result.data;

                const user = await prisma.user.findUnique({
                    where: { email },
                });

                if (!user || !user.password) {
                    return null;
                }

                const isValidPassword = await bcrypt.compare(password, user.password);

                if (!isValidPassword) {
                    return null;
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role || "CUSTOMER"; // Default to customer if not set
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
};