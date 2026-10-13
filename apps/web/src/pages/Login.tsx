import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api';
import { useAuth } from '../auth/AuthContext';
import { AuthShell, PasswordInput, authButtonClass, authInputClass } from '../components/AuthShell';
import HCaptcha from '../components/HCaptcha';

const SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY ?? '10000000-ffff-ffff-ffff-000000000001';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, captchaToken);
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Terjadi kesalahan, coba lagi');
    } finally {
      setLoading(false);
    }
  };

  const onCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  const onCaptchaExpire = () => {
    setCaptchaToken('');
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

        <div className="pt-2">
          <label className="block text-sm font-semibold mb-2">Verifikasi Keamanan</label>
          <HCaptcha
            siteKey={SITE_KEY}
            onVerify={onCaptchaVerify}
            onExpire={onCaptchaExpire}
            theme="light"
          />
          {!captchaToken && (
            <p className="mt-2 text-xs text-[var(--muted)]">
              Harap selesaikan verifikasi hCaptcha sebelum masuk.
            </p>
          )}
        </div>

        {error && (
          <p
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600"
            role="alert"
          >
            {error}
          </p>
        )}
        <button className={authButtonClass} disabled={loading || !captchaToken} type="submit">
          {loading ? 'Memverifikasi…' : 'Masuk ke e-Lawyer'}
        </button>
      </form>
    </AuthShell>
  );
}