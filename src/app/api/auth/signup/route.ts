import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validations/auth";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const result = signupSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: result.error.issues[0].message },
                { status: 400 }
            );
        }

        const { name, email, password, token } = result.data;
        const hashedPassword = await bcrypt.hash(password, 10);

        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (existingUser) {
            if (existingUser.password) {
                // Already has a password — fully registered
                return NextResponse.json(
                    { error: "An account with this email already exists." },
                    { status: 409 }
                );
            }

            if (!token) {
                return NextResponse.json(
                    { error: "An invite token is required to complete registration for this email." },
                    { status: 403 }
                );
            }

            const verificationToken = await prisma.verificationToken.findUnique({
                where: { identifier_token: { identifier: email, token } },
            });

            if (!verificationToken || verificationToken.expires < new Date()) {
                return NextResponse.json(
                    { error: "Invalid or expired invite token." },
                    { status: 403 }
                );
            }

            // Invited user (exists in DB but no password yet) — set their password
            // and update name, but KEEP their assigned role (AGENT/ADMIN/CUSTOMER)
            let updated;
            try {
                [updated] = await prisma.$transaction([
                    prisma.user.update({
                        where: { email },
                        data: { name, password: hashedPassword },
                    }),
                    prisma.verificationToken.delete({
                        where: { identifier_token: { identifier: email, token } },
                    }),
                ]);
            } catch {
                return NextResponse.json(
                    { error: "Invalid or expired invite token." },
                    { status: 403 }
                );
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password: _, ...userWithoutPassword } = updated;
            return NextResponse.json({ user: userWithoutPassword }, { status: 200 });
        }

        // Brand new user
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword },
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userWithoutPassword } = user;
        return NextResponse.json({ user: userWithoutPassword }, { status: 201 });

    } catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}