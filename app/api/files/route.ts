import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db/prisma";
import { Visibility } from "../../../app/generated/prisma/client";

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
 *  2. There is a SharePermission with visibility=USER targeting this userId.
 *  3. There is a SharePermission with visibility=GROUP targeting the user's studyGroup.
 *  4. There is a SharePermission with visibility=YEAR targeting the user's yearOfStudy.
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
          select: { id: true, email: true, indexNumber: true, studyGroup: true },
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
  user: { id: string; studyGroup: string; yearOfStudy: number },
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
        ? [{ name: { contains: search, mode: "insensitive" as const } }]
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
                visibility: Visibility.USER,
                targetValue: user.id,
              },
            },
          },
          // Rule 3 – same study group
          {
            sharePermissions: {
              some: {
                visibility: Visibility.GROUP,
                targetValue: user.studyGroup,
              },
            },
          },
          // Rule 4 – same year of study
          {
            sharePermissions: {
              some: {
                visibility: Visibility.YEAR,
                targetValue: String(user.yearOfStudy),
              },
            },
          },
        ],
      },
    ],
  };
}

// ─── Next.js Route Handler ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // In a real app this would come from the session / JWT.
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { error: "userId query parameter is required." },
        { status: 400 }
      );
    }

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

