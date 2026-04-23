import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Brak tokenu weryfikacyjnego." },
        { status: 400 }
      );
    }

    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        token,
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Nieprawidłowy token weryfikacyjny." },
        { status: 400 }
      );
    }

    if (verificationToken.expires < new Date()) {
      return NextResponse.json(
        { error: "Token weryfikacyjny wygasł. Zarejestruj się ponownie lub poproś o nowy link." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Użytkownik nie istnieje." },
        { status: 404 }
      );
    }

    if (user.isVerified) {
      return NextResponse.redirect(
        new URL("/login?verified=true", process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000")
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        emailVerified: new Date(),
      },
    });

    await prisma.verificationToken.delete({
      where: { token },
    });

    return NextResponse.redirect(
      new URL("/login?verified=true", process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000")
    );
  } catch (error) {
    console.error("[GET /api/auth/verify]", error);
    return NextResponse.json(
      { error: "Wewnętrzny błąd serwera." },
      { status: 500 }
    );
  }
}
