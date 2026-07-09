import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { currentPassword, newPassword } = await req.json();

        if (!newPassword || newPassword.length < 6) {
            return Response.json({ error: "New password must be at least 6 characters long." }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return Response.json({ error: "User not found." }, { status: 404 });
        }

        // If user already has a password, they must provide the correct current one
        if (user.password) {
            if (!currentPassword) {
                return Response.json({ error: "Current password is required." }, { status: 400 });
            }
            const isValid = await bcrypt.compare(currentPassword, user.password);
            if (!isValid) {
                return Response.json({ error: "Incorrect current password." }, { status: 400 });
            }
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashed },
        });

        return Response.json({ success: true });
    } catch (error) {
        console.error("Change password error:", error);
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { password: true },
        });

        return Response.json({ hasPassword: !!user?.password });
    } catch {
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
