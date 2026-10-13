import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api';
import { useAuth } from '../auth/AuthContext';
import { AuthShell, PasswordInput, authButtonClass, authInputClass } from '../components/AuthShell';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Terjadi kesalahan, coba lagi');
    } finally {
      setLoading(false);
    }
  };
  return (
    <AuthShell
      eyebrow="Selamat datang kembali"
      title="Masuk ke ruang kerja"
      description="Lanjutkan pekerjaan perkara Anda dengan akun yang terverifikasi."
      footer={
        <>
          Belum punya akun?{' '}
          <Link className="font-semibold text-[var(--accent)]" to="/signup">
            Daftar sekarang
          </Link>
        </>
      }
    >
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
        <label className="grid gap-2 text-sm font-semibold">
          <span className="flex justify-between gap-4">
            <span>Password</span>
            <Link className="font-medium text-[var(--accent)]" to="/forgot-password">
              Lupa password?
            </Link>
          </span>
          <PasswordInput value={password} onChange={setPassword} />
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
          {loading ? 'Memverifikasi…' : 'Masuk ke e-Lawyer'}
        </button>
      </form>
    </AuthShell>
  );
}
