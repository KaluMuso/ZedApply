import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Zed CV</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Local Next.js frontend for the Zed CV API.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/login"
          className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        >
          <div className="text-sm font-semibold">Sign in</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">WhatsApp OTP</div>
        </Link>
        <Link
          href="/profile"
          className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        >
          <div className="text-sm font-semibold">Profile</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">CV upload, skills, subscription</div>
        </Link>
        <Link
          href="/jobs"
          className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        >
          <div className="text-sm font-semibold">Jobs</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Browse listings</div>
        </Link>
        <Link
          href="/pricing"
          className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        >
          <div className="text-sm font-semibold">Pricing</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Mwana / Mwezi / Bwino</div>
        </Link>
      </div>
    </main>
  );
}
