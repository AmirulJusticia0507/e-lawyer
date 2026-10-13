import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(28rem,0.9fr)]">
      <section className="relative hidden overflow-hidden border-r border-[var(--border)] bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 top-24 h-80 w-80 rounded-full bg-blue-500/25 blur-3xl" />
        <div className="absolute -bottom-20 right-0 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-3 text-lg font-bold">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500 shadow-lg shadow-blue-500/30">
            eL
          </span>
          e-Lawyer
        </Link>
        <div className="relative max-w-xl">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-300">
            Litigasi digital terpadu
          </p>
          <h2 className="mt-5 text-5xl font-semibold leading-tight tracking-tight">
            Satu ruang kerja untuk perkara yang lebih terkendali.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
            Kelola klien, dokumen hukum, agenda sidang, dan integritas bukti dengan alur kerja yang
            aman dan terukur.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-4 text-sm text-slate-300">
          <span>Data terenkripsi</span>
          <span>Audit terstruktur</span>
          <span>Akses berbasis peran</span>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-10 flex items-center gap-3 font-bold lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent)] text-white">
              eL
            </span>
            e-Lawyer
          </Link>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{description}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-8 border-t border-[var(--border)] pt-6 text-center text-sm text-[var(--muted)]">
            {footer}
          </div>
        </div>
      </section>
    </main>
  );
}

export function PasswordInput({
  value,
  onChange,
  placeholder = 'Minimal 8 karakter',
  autoComplete = 'current-password',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <input
      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
      type="password"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      required
      minLength={8}
    />
  );
}

export const authInputClass =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20';
export const authButtonClass =
  'w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--accent-2)] disabled:cursor-not-allowed disabled:opacity-60';
