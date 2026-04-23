import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      studentIndex?: string | null;
      studyGroup?: string | null;
      yearOfStudy?: number | null;
      role?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    studentIndex?: string | null;
    studyGroup?: string | null;
    yearOfStudy?: number | null;
    role?: string | null;
  }
}