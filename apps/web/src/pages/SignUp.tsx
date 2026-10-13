import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api';
import { useAuth } from '../auth/AuthContext';
import { AuthShell, PasswordInput, authButtonClass, authInputClass } from '../components/AuthShell';

export default function SignUp() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmation: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (form.password !== form.confirmation) {
      setError('Konfirmasi password tidak sama');
      return;
    }
    setLoading(true);
    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      });
      navigate('/', { replace: true });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Pendaftaran gagal');
    } finally {
      setLoading(false);
    }
  };
  return (
    <AuthShell
      eyebrow="Mulai sekarang"
      title="Buat akun e-Lawyer"
      description="Siapkan ruang kerja litigasi digital Anda dalam beberapa langkah."
      footer={
        <>
          Sudah punya akun?{' '}
          <Link className="font-semibold text-[var(--accent)]" to="/login">
            Masuk
          </Link>
        </>
      }
    >
      <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
        <label className="grid gap-2 text-sm font-semibold">
          Nama lengkap
          <input
            className={authInputClass}
            value={form.fullName}
            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
            placeholder="Nama sesuai identitas"
            autoComplete="name"
            minLength={2}
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Email profesional
          <input
            className={authInputClass}
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="nama@firma.com"
            autoComplete="email"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Nomor telepon <span className="font-normal text-[var(--muted)]">(opsional)</span>
          <input
            className={authInputClass}
            type="tel"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            placeholder="08xxxxxxxxxx"
            autoComplete="tel"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Password
          <PasswordInput
            value={form.password}
            onChange={(password) => setForm({ ...form, password })}
            autoComplete="new-password"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Konfirmasi password
          <PasswordInput
            value={form.confirmation}
            onChange={(confirmation) => setForm({ ...form, confirmation })}
            placeholder="Ulangi password"
            autoComplete="new-password"
          />
        </label>
        <p className="text-xs leading-5 text-[var(--muted)]">
          Gunakan minimal 8 karakter dengan kombinasi huruf dan angka.
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
          {loading ? 'Membuat akun…' : 'Buat akun'}
        </button>
      </form>
    </AuthShell>
  );
}
