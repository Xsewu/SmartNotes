import { auth } from "@/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { addFileShare, getFileShareRecipients } from "../app/actions/sharing";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("sharing actions", () => {
  const mockedAuth = auth as jest.MockedFunction<typeof auth>;
  const mockedGetSupabaseAdminClient = getSupabaseAdminClient as jest.MockedFunction<
    typeof getSupabaseAdminClient
  >;

  let supabaseMock: any;

  beforeEach(() => {
    jest.clearAllMocks();

    supabaseMock = {
      from: jest.fn(),
    };

    mockedGetSupabaseAdminClient.mockReturnValue(supabaseMock);
  });

  it("returns recipients only for files owned by the current user", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "owner-1" } } as never);

    const fileQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { authorId: "owner-1" },
        error: null,
      }),
    };

    const sharesQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };

    const usersQuery = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({
        data: [
          { id: "user-2", email: "friend@stud.prz.edu.pl", image: null },
        ],
        error: null,
      }),
    };

    fileQuery.select.mockReturnThis();
    sharesQuery.select.mockReturnThis();

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "File") return fileQuery;
      if (table === "SharePermission") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({
            data: [{ recipientId: "user-2" }],
            error: null,
          }),
        };
      }
      if (table === "User") return usersQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(getFileShareRecipients("file-1")).resolves.toEqual([
      {
        id: "user-2",
        email: "friend@stud.prz.edu.pl",
        image: null,
        permissionId: "user-2",
      },
    ]);
  });

  it("blocks sharing a file that the user does not own", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "owner-1" } } as never);

    const fileQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { authorId: "someone-else" },
        error: null,
      }),
    };

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "File") return fileQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(addFileShare("file-1", "friend@stud.prz.edu.pl")).rejects.toThrow(
      "Brak uprawnień do tego pliku"
    );
  });

  it("trims recipient email before lookup when sharing", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "owner-1" } } as never);

    const fileQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { authorId: "owner-1" },
        error: null,
      }),
    };

    const recipientQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: "user-2", email: "friend@stud.prz.edu.pl" },
        error: null,
      }),
    };

    const existingShareQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };

    const insertQuery = {
      insert: jest.fn().mockResolvedValue({ error: null }),
    };

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "File") return fileQuery;
      if (table === "User") return recipientQuery;
      if (table === "SharePermission") return existingShareQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    supabaseMock.from.mockReturnValueOnce(fileQuery).mockReturnValueOnce(recipientQuery).mockReturnValueOnce(existingShareQuery).mockReturnValueOnce(insertQuery);

    await expect(addFileShare("file-1", "  Friend@stud.prz.edu.pl  ")).resolves.toEqual({
      success: true,
      recipientEmail: "friend@stud.prz.edu.pl",
    });

    expect(recipientQuery.eq).toHaveBeenCalledWith("email", "friend@stud.prz.edu.pl");
  });
});
