import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError, api } from '../api';
import { AuthShell, PasswordInput, authButtonClass } from '../components/AuthShell';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password !== confirmation) {
      setError('Konfirmasi password tidak sama');
      return;
    }
    setLoading(true);
    try {
      const result = await api.resetPassword(token, password);
      setMessage(result.message);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Reset password gagal');
    } finally {
      setLoading(false);
    }
  };
  return (
    <AuthShell
      eyebrow="Keamanan akun"
      title="Atur password baru"
      description="Buat password baru yang kuat dan berbeda dari password sebelumnya."
      footer={
        <Link className="font-semibold text-[var(--accent)]" to="/login">
          Kembali ke halaman masuk
        </Link>
      }
    >
      {!token ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600">
          Tautan reset tidak lengkap. Silakan ajukan permintaan baru.
        </p>
      ) : message ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <strong className="text-emerald-600">Password berhasil diperbarui</strong>
          <p className="mt-2 text-sm text-[var(--muted)]">{message}</p>
          <Link
            className="mt-5 inline-flex rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white"
            to="/login"
          >
            Masuk sekarang
          </Link>
        </div>
      ) : (
        <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
          <label className="grid gap-2 text-sm font-semibold">
            Password baru
            <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Konfirmasi password
            <PasswordInput
              value={confirmation}
              onChange={setConfirmation}
              placeholder="Ulangi password baru"
              autoComplete="new-password"
            />
          </label>
          <p className="text-xs leading-5 text-[var(--muted)]">
            Minimal 8 karakter dan harus mengandung huruf serta angka.
          </p>
          {error && (
            <p
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600"
              role="alert"
            >
              {error}
            </p>
          )}
          <button className={authButtonClass} disabled={loading} type="submit">
            {loading ? 'Menyimpan…' : 'Simpan password baru'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
