import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-slate-950 p-8 text-center">
      <h1 className="text-3xl font-semibold text-slate-50">Ticketing System</h1>
      <p className="max-w-md text-slate-400">
        Sign in to view and manage your support tickets.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-md bg-slate-50 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-200"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-md border border-slate-800 px-4 py-2 text-sm font-medium text-slate-50 hover:bg-slate-900"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
