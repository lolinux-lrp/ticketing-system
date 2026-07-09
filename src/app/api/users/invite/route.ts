import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { sendInviteEmail } from "@/lib/email";
import { randomBytes } from "crypto";
import { can } from "@/lib/auth/policy";

const inviteSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["AGENT", "ADMIN"]),
});

const ROLE_RANK: Record<string, number> = { CUSTOMER: 0, AGENT: 1, ADMIN: 2 };

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !can(session.user, "user:invite")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const result = inviteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 },
      );
    }

    const { name, email, role } = result.data;
    const APP_BASE_URL = process.env.APP_BASE_URL;
    if (!APP_BASE_URL) {
      throw new Error("Missing required environment variable: APP_BASE_URL");
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      const currentRank = ROLE_RANK[existingUser.role] ?? 0;
      const targetRank = ROLE_RANK[role] ?? 0;

      // Already has the exact role being invited to
      if (existingUser.role === role) {
        return NextResponse.json(
          { error: `This user is already ${role === "ADMIN" ? "an Admin" : "an Agent"}.` },
          { status: 409 },
        );
      }

      // Trying to invite an ADMIN to become an AGENT — that's a demotion, refuse it
      if (targetRank < currentRank) {
        return NextResponse.json(
          { error: `Cannot invite an ${existingUser.role} to a lower role (${role}). Change their role manually if needed.` },
          { status: 409 },
        );
      }

      // Role upgrade (e.g. CUSTOMER → AGENT, CUSTOMER → ADMIN, AGENT → ADMIN)
      const updated = await prisma.user.update({
        where: { email },
        data: { role },
      });

      try {
        await sendInviteEmail({ name: updated.name ?? name, email, role, isUpgrade: true });
      } catch (emailError) {
        // Rollback role upgrade if email fails to send
        await prisma.user.update({
          where: { email },
          data: { role: existingUser.role },
        });
        throw emailError;
      }

      return NextResponse.json({
        message: `${updated.name ?? email}'s role has been upgraded to ${role}. They have been notified.`,
        user: updated,
      }, { status: 200 });
    }

    // New user — create with no password, then issue a single-use invite token
    const newUser = await prisma.user.create({
      data: { name, email, role, password: null },
    });

    // Generate a 32-byte random token bound to this email, valid for 48 hours
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    // Signup URL embeds token so only the recipient can claim the account
    const signupUrl = `${APP_BASE_URL}/signup?token=${token}&email=${encodeURIComponent(email)}`;
    
    try {
      await sendInviteEmail({ name, email, role, signupUrl, isUpgrade: false });
    } catch (emailError) {
      // Rollback: delete the token and user if email fails to send
      await prisma.verificationToken.delete({ 
        where: { 
          identifier_token: { identifier: email, token } 
        } 
      });
      await prisma.user.delete({ where: { email } });
      throw emailError;
    }

    return NextResponse.json({ user: newUser }, { status: 201 });

  } catch (error) {
    console.error("Error inviting user:", error);
    return NextResponse.json(
      { error: "Failed to process invite. Please try again." },
      { status: 500 },
    );
  }
}
