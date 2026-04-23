import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db/prisma";
import { auth } from "@/auth";
import { readFile } from "fs/promises";
import { join } from "path";
import { Visibility } from "../../../../app/generated/prisma/client";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return new NextResponse("Unauthorized. Please log in.", { status: 401 });
    }

    const params = await props.params;
    const { id } = params;

    const file = await prisma.file.findUnique({
      where: { id },
      include: { sharePermissions: true },
    });

    if (!file) {
      return new NextResponse("File not found.", { status: 404 });
    }

    // Access control: Only serve the file if user has permissions
    const isAuthor = file.authorId === session.user.id;
    const isSharedDirectly = file.sharePermissions.some(
      (p) => p.recipientId === session.user.id
    );
    const isGroupOrYearOrPublic = 
      file.visibility === Visibility.GROUP || 
      file.visibility === Visibility.YEAR;

    if (!isAuthor && !isSharedDirectly && !isGroupOrYearOrPublic) {
      return new NextResponse("Forbidden. You don't have access to this file.", { status: 403 });
    }

    // Read file from the server's private 'uploads' folder
    const filePath = join(process.cwd(), "uploads", id);
    const fileBuffer = await readFile(filePath);

    // Serve the file to the browser
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": file.format || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.title)}"`,
      },
    });
  } catch (error) {
    console.error(`[GET /api/files/[id]]`, error);
    return new NextResponse("Internal server error.", { status: 500 });
  }
}
