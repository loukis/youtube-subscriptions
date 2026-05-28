import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import Dashboard from "@/components/Dashboard";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.accessToken) {
    redirect("/");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 15.5v-7l5 3.5-5 3.5z" />
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-2.47 12.3 12.3 0 00-8.76 0A4.83 4.83 0 013.29 6.69 11.91 11.91 0 002 12a11.91 11.91 0 001.29 5.31 4.83 4.83 0 003.77 2.47 12.3 12.3 0 008.76 0 4.83 4.83 0 003.77-2.47A11.91 11.91 0 0021 12a11.91 11.91 0 00-1.41-5.31z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900 text-sm">
              YouTube Subscriptions
            </span>
          </div>
          <div className="flex items-center gap-3">
            {session.user?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name ?? "User"}
                className="w-7 h-7 rounded-full"
              />
            )}
            <span className="text-sm text-gray-600 hidden sm:block">
              {session.user?.name}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
              >
                Αποσύνδεση
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <Dashboard />
      </main>
    </div>
  );
}
