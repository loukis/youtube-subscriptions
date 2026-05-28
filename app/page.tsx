import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (session?.accessToken) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center">
              <svg
                className="w-9 h-9 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-2.47 12.3 12.3 0 00-8.76 0A4.83 4.83 0 013.29 6.69 11.91 11.91 0 002 12a11.91 11.91 0 001.29 5.31 4.83 4.83 0 003.77 2.47 12.3 12.3 0 008.76 0 4.83 4.83 0 003.77-2.47A11.91 11.91 0 0021 12a11.91 11.91 0 00-1.41-5.31zM10 15.5v-7l5 3.5-5 3.5z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            YouTube Subscriptions
          </h1>
          <p className="text-gray-500">
            Δες τα πιο πρόσφατα videos από όλα τα κανάλια που ακολουθείς,
            οργανωμένα σε ένα καθαρό dashboard.
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 font-medium px-6 py-3 rounded-xl shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Σύνδεση με Google
          </button>
        </form>

        <p className="text-xs text-gray-400">
          Ζητείται μόνο read-only πρόσβαση στα YouTube subscriptions σου.
        </p>
      </div>
    </main>
  );
}
