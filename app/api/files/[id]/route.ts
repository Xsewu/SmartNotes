import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db/prisma";
import { auth } from "@/auth";
import { Visibility } from "@prisma/client";

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

    if (!file || !file.url) {
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

    // Pobierz plik ze zdalnego adresu (Supabase Storage)
    const remoteResponse = await fetch(file.url);
    if (!remoteResponse.ok) {
       console.error("Failed to fetch from remote URL", remoteResponse.statusText);
       return new NextResponse("File not available remotely.", { status: 502 });
    }

    const fileBuffer = await remoteResponse.arrayBuffer();

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
