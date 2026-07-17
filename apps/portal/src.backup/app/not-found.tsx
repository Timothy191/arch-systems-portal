import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white">
      <h1 className="text-6xl font-bold text-gray-700">404</h1>
      <p className="mt-4 text-lg text-gray-400">Page not found</p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold transition hover:bg-sky-500"
      >
        Back to Dashboard
      </Link>
    </main>
  );
}
