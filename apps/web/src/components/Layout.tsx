import { Link, NavLink } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { hasPermission } from '../auth/permissions';
import { useTheme } from '../theme/ThemeContext';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div>
      <a className="skip-link" href="#main-content">
        Lewati ke konten utama
      </a>
      <nav className="nav" aria-label="Navigasi utama">
        <Link to="/" className="brand">
          e-Lawyer
        </Link>
        {hasPermission(user, 'READ:CASE') && <NavLink to="/perkara">Perkara</NavLink>}
        {hasPermission(user, 'READ:CLIENT') && <NavLink to="/klien">Klien</NavLink>}
        {hasPermission(user, 'READ:REGULATION') && <NavLink to="/peraturan">Peraturan</NavLink>}
        {hasPermission(user, 'READ:DOCUMENT') && <NavLink to="/dokumen">Dokumen</NavLink>}
        {hasPermission(user, 'READ:HEARING') && <NavLink to="/sidang">Sidang</NavLink>}
        {hasPermission(user, 'READ:CONSULTATION') && <NavLink to="/konsultasi">Konsultasi</NavLink>}
        {hasPermission(user, 'READ:INTEGRITY') && <NavLink to="/integritas">Integritas</NavLink>}
        <span className="spacer" />
        <button
          className="btn btn-ghost btn-sm theme-toggle"
          type="button"
          onClick={toggleTheme}
          aria-label={`Aktifkan tema ${theme === 'dark' ? 'terang' : 'gelap'}`}
        >
          {theme === 'dark' ? '☀ Tema terang' : '☾ Tema gelap'}
        </button>
        {user ? (
          <>
            <span className="muted">{user.fullName}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => void logout()}>
              Keluar
            </button>
          </>
        ) : (
          <NavLink to="/login">Masuk</NavLink>
        )}
      </nav>
      <main className="container" id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
