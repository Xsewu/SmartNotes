import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sprawdź skrzynkę e-mail | SmartNotes",
};

export default function VerifyRequestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold mb-4">Sprawdź skrzynkę udostępnioną!</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          Wysłaliśmy link do logowania na Twój studencki adres e-mail.
          Kliknij w link w wiadomości, aby bezpiecznie wejść do aplikacji.
        </p>

        <Link
          href="/login"
          className="inline-block w-full text-zinc-900 dark:text-zinc-100 font-medium py-2 px-4 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          Wróć do logowania
        </Link>
      </div>
    </div>
  );
}
