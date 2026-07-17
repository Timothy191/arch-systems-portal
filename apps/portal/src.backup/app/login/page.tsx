import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in | Arch Systems",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
        {/* Logo / wordmark */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Arch Systems
          </h1>
          <p className="mt-1 text-sm text-gray-400">Operations Portal</p>
        </div>

        {/* Placeholder form — wire up auth provider here */}
        <form className="space-y-4" aria-label="Sign in form">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          Arch Systems — Industrial Operations Platform
        </p>
      </div>
    </main>
  );
}
