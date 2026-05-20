import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { changeUserRole } from "@/app/actions/admin";

export async function POST(req: Request) {
  const me = await auth();
  if (!me?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { targetUserId, newRole } = body;
  if (!targetUserId || !newRole) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const result = await changeUserRole(targetUserId, newRole);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ success: true });
}
