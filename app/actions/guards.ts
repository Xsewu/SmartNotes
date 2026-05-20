import { auth } from "@/auth";

export async function getAuthenticatedUserId(unauthorizedMessage = "Nieautoryzowany") {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error(unauthorizedMessage);
  }

  return session.user.id;
}

export function assertOwner(ownerId: string | null | undefined, userId: string, forbiddenMessage: string) {
  if (!ownerId || ownerId !== userId) {
    throw new Error(forbiddenMessage);
  }
}