import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db/prisma";
import { Visibility } from "../../../app/generated/prisma/client";
import { auth } from "@/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
// @ts-ignore
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export interface GetFilesOptions {
  /** The ID of the requesting user. */
  userId: string;
  /** Optional tag filter (e.g. "egzamin"). */
  tag?: string;
  /** Optional free-text search on file name. */
  search?: string;
  /** Page number (1-based). Defaults to 1. */
  page?: number;
  /** Items per page. Defaults to 20. */
  pageSize?: number;
}

/**
 * Returns all files that `userId` is allowed to see.
 *
 * Access rules (OR-combined):
 *  1. The user is the file author (owns the file).
 *  2. The file is directly shared with the user via SharePermission.recipientId.
 *  3. The file has GROUP/YEAR visibility (global audience bucket).
 *
 * Prisma performs the necessary JOINs so we never load data for files the
 * user cannot access.
 */
export async function getAccessibleFiles(options: GetFilesOptions) {
  const { userId, tag, search, page = 1, pageSize = 20 } = options;

  // 1. Resolve the requesting user to get their group / year for the JOIN.
  const requestingUser = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, studyGroup: true, yearOfStudy: true },
  });

  const skip = (page - 1) * pageSize;

  const [files, total] = await Promise.all([
    prisma.file.findMany({
      where: buildAccessFilter(requestingUser, tag, search),
      include: {
        author: {
          select: { id: true, email: true, studentIndex: true, studyGroup: true },
        },
        tags: { include: { tag: true } },
        sharePermissions: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.file.count({
      where: buildAccessFilter(requestingUser, tag, search),
    }),
  ]);

  return {
    files,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function buildAccessFilter(
  user: { id: string; studyGroup: string | null; yearOfStudy: number | null },
  tag?: string,
  search?: string
) {
  return {
    AND: [
      // Optional tag filter
      ...(tag
        ? [
            {
              tags: {
                some: {
                  tag: { name: { equals: tag, mode: "insensitive" as const } },
                },
              },
            },
          ]
        : []),
      // Optional name search
      ...(search
        ? [{ title: { contains: search, mode: "insensitive" as const } }]
        : []),
      // Visibility / access-control filter
      {
        OR: [
          // Rule 1 – author
          { authorId: user.id },
          // Rule 2 – direct user share
          {
            sharePermissions: {
              some: {
                recipientId: user.id,
              },
            },
          },
          // Rule 3 – broadcast-style visibility buckets
          { visibility: Visibility.GROUP },
          { visibility: Visibility.YEAR },
        ],
      },
    ],
  };
}

// ─── Next.js Route Handler ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);

    const tag = searchParams.get("tag") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "20");

    const result = await getAccessibleFiles({
      userId,
      tag,
      search,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/files]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const title = (formData.get("title") as string) || file.name;
    const categoryName = (formData.get("category") as string) || "Inne";
    const subjectIdStr = formData.get("subjectId") as string;
    const subjectId = subjectIdStr ? parseInt(subjectIdStr, 10) : undefined;
    const visibilityStr = formData.get("visibility") as string;

    let visibility: Visibility = Visibility.PRIVATE;
    if (visibilityStr === "Moja Grupa") visibility = Visibility.GROUP;
    if (visibilityStr === "Cały Rocznik") visibility = Visibility.YEAR;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileId = uuidv4();

    // Save locally to an 'uploads' directory, OUTSIDE of the 'public' folder
    const uploadDir = join(process.cwd(), "uploads");
    await mkdir(uploadDir, { recursive: true });

    const filePath = join(uploadDir, fileId);

    await writeFile(filePath, buffer);

    let pages = 1;
    try {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const pdfData = await pdfParse(buffer);
        pages = pdfData.numpages || 1;
      }
    } catch (err) {
      console.warn("Nie udalo sie zliczyc stron PDF:", err);
    }

    // The URL points to our new authenticated endpoint!
    const fileUrl = `/api/files/${fileId}`;

    // Upsert Tag
    const tagRecord = await prisma.tag.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName },
    });

    const newFile = await prisma.file.create({
      data: {
        id: fileId,
        title,
        url: fileUrl,
        format: file.type || "application/octet-stream",
        visibility,
        pages,
        authorId: session.user.id,
        subjectId,
        tags: {
          create: [{ tagId: tagRecord.id }],
        },
      },
    });

    return NextResponse.json({ success: true, file: newFile });
  } catch (error) {
    console.error("[POST /api/files]", error);
    return NextResponse.json(
      { error: "Internal server error during upload." },
      { status: 500 }
    );
  }
}

