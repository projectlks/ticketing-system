import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f7f3ef] via-white to-[#e7f1ff] text-slate-900">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-sky-200/70 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 grid-overlay opacity-40" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col items-start justify-center px-6 py-16 sm:px-10">
        <span className="text-xs font-semibold uppercase tracking-[0.45em] text-slate-500">
          404 Error
        </span>

        <div className="mt-4 text-[clamp(4.5rem,16vw,10rem)] font-semibold leading-none text-slate-900/90">
          404
        </div>

        <h1 className="mt-4 text-3xl font-semibold text-slate-900 sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-3 max-w-xl text-base text-slate-600">
          We couldn&apos;t find the page you&apos;re looking for. Double-check
          the URL, or use one of the links below to get back on track.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/helpdesk"
            className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/auth/signin"
            className="rounded-xl border border-slate-300 bg-white/80 px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span>Need help? support@eastwindmyanmar.com.mm</span>
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          <span>Ticketing System</span>
        </div>
      </main>
    </div>
  );
}
