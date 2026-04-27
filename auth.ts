import NextAuth, { CredentialsSignin } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

class CustomAuthError extends CredentialsSignin {
  code: string;
  constructor(message: string) {
    super(message);
    this.code = message;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" }, // Wymagane przy wariancie CredentialsProvider
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "123456@stud.prz.edu.pl" },
        password: { label: "Hasło", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new CustomAuthError("Brakujące dane logowania.");
        }
        
        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email).toLowerCase() }
        });

        if (!user || !user.passwordHash) {
          throw new CustomAuthError("Nieprawidłowy email lub hasło.");
        }

        const isValidPassword = await bcrypt.compare(
          String(credentials.password),
          user.passwordHash
        );

        if (!isValidPassword) {
          throw new CustomAuthError("Nieprawidłowy email lub hasło.");
        }

        if (!user.isVerified) {
          throw new CustomAuthError("Konto nie zostało jeszcze aktywowane. Sprawdź swoją skrzynkę email.");
        }

        return {
          id: user.id,
          email: user.email,
        };
      }
    })
  ],
  pages: {
    signIn: '/login',
    error: '/login', // Wymagane, by błędy autoryzacji wracały na Twoją stronę, a nie domyślną
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        
        // Dynamiczne sprawdzanie uprawnień i grupy na starcie sesji
        const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (dbUser) {
          session.user.studentIndex = dbUser.studentIndex;
          session.user.studyGroup = dbUser.studyGroup;
          session.user.yearOfStudy = dbUser.yearOfStudy;
          session.user.role = dbUser.role;
          session.user.image = dbUser.image;
        }
      }
      return session;
    },
  },
});