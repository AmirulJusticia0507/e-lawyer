import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../api';
import { AuthShell, authButtonClass, authInputClass } from '../components/AuthShell';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.forgotPassword(email);
      setMessage(result.message);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Permintaan gagal');
    } finally {
      setLoading(false);
    }
  };
  return (
    <AuthShell
      eyebrow="Pemulihan akun"
      title="Lupa password?"
      description="Masukkan email akun Anda. Kami akan mengirim tautan aman yang berlaku selama 30 menit."
      footer={
        <Link className="font-semibold text-[var(--accent)]" to="/login">
          Kembali ke halaman masuk
        </Link>
      }
    >
      {message ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <strong className="text-emerald-600">Periksa email Anda</strong>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{message}</p>
        </div>
      ) : (
        <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
          <label className="grid gap-2 text-sm font-semibold">
            Email
            <input
              className={authInputClass}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@firma.com"
              autoComplete="email"
              required
            />
          </label>
          {error && (
            <p
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600"
              role="alert"
            >
              {error}
            </p>
          )}
          <button className={authButtonClass} disabled={loading} type="submit">
            {loading ? 'Mengirim…' : 'Kirim tautan reset'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
