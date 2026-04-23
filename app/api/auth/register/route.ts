import { NextResponse } from "next/server";
import { UserRole } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { validatePrzEmail } from "@/lib/validators/email";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

interface RegisterBody {
  email?: unknown;
  password?: unknown;
  yearOfStudy?: unknown;
  studyGroup?: unknown;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RegisterBody;
    const { email, password, yearOfStudy, studyGroup } = body;

    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Email jest wymagany." },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.trim().length < 6) {
      return NextResponse.json(
        { error: "Hasło jest wymagane i musi mieć co najmniej 6 znaków." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    let validationResult;
    try {
      validationResult = validatePrzEmail(normalizedEmail);
    } catch {
      return NextResponse.json(
        { error: "Nie udało się zwalidować adresu email." },
        { status: 400 }
      );
    }

    if (!validationResult.valid) {
      return NextResponse.json(
        {
          error:
            validationResult.reason ??
            "Nieprawidłowy email. Użyj adresu w domenie stud.prz.edu.pl.",
        },
        { status: 400 }
      );
    }

    if (
      typeof yearOfStudy !== "number" ||
      !Number.isInteger(yearOfStudy) ||
      yearOfStudy < 1
    ) {
      return NextResponse.json(
        { error: "yearOfStudy musi być liczbą całkowitą większą od 0." },
        { status: 400 }
      );
    }

    if (typeof studyGroup !== "string" || !studyGroup.trim()) {
      return NextResponse.json(
        { error: "studyGroup jest wymagane." },
        { status: 400 }
      );
    }

    const localPart = normalizedEmail.split("@")[0] ?? "";
    const studentIndexMatch = localPart.match(/\d+/);
    const studentIndex = studentIndexMatch?.[0];

    if (!studentIndex) {
      return NextResponse.json(
        { error: "Nie udało się wyciągnąć numeru indeksu z adresu email." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { studentIndex }],
      },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Użytkownik o podanym emailu lub indeksie już istnieje." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const createdUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        studentIndex,
        yearOfStudy,
        studyGroup: studyGroup.trim(),
        isVerified: false,
        role: UserRole.STUDENT,
      },
      select: {
        id: true,
        email: true,
        studentIndex: true,
        yearOfStudy: true,
        studyGroup: true,
        isVerified: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // Ważny przez 24h

    await prisma.verificationToken.create({
      data: {
        identifier: createdUser.email,
        token,
        expires,
      },
    });

    try {
      await sendVerificationEmail(createdUser.email, token);
    } catch (emailError) {
      console.error("[Email sending error]", emailError);
      // Mimo błędu wysyłki powiadamiamy użytkownika sukcesem rejestracji (albo usuwamy i prosimy znowu, zależy od UX)
    }

    return NextResponse.json(createdUser, { status: 201 });
  } catch (error) {
    console.error("[POST /api/auth/register]", error);
    return NextResponse.json(
      { error: "Wewnętrzny błąd serwera." },
      { status: 500 }
    );
  }
}
