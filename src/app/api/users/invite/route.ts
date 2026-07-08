import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import nodemailer from "nodemailer";

const inviteSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["AGENT", "ADMIN"]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const result = inviteSchema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 },
      );
    }

    const { name, email, role } = result.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
      },
    });

    // Send Invite Email via Ethereal (Development)
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const hostUrl = req.nextUrl.origin;
    const loginUrl = `${hostUrl}/login`;

    const info = await transport.sendMail({
      to: email,
      from: "noreply@ticketing-system.local",
      subject: `You have been invited to join as an ${role}!`,
      text: `Hello ${name},\n\nYou have been invited to the ticketing system as an ${role}.\nGo to ${loginUrl} and sign in with your email to receive a Magic Link.\n\nWelcome!`,
      html: `<p>Hello ${name},</p><p>You have been invited to the ticketing system as an <strong>${role}</strong>.</p><p>Go to <a href="${loginUrl}">${loginUrl}</a> and sign in with your email to receive a Magic Link.</p>`,
    });

    console.log("=========================================");
    console.log("📬 INVITE EMAIL SENT! ");
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    console.log("=========================================");

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
}
