import { Link, NavLink } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div>
      <nav className="nav">
        <Link to="/" className="brand">
          e-Lawyer
        </Link>
        <NavLink to="/perkara">Perkara</NavLink>
        <NavLink to="/klien">Klien</NavLink>
        <NavLink to="/peraturan">Peraturan</NavLink>
        <NavLink to="/dokumen">Dokumen</NavLink>
        <NavLink to="/konsultasi">Konsultasi</NavLink>
        <NavLink to="/integritas">Integritas</NavLink>
        <span className="spacer" />
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
      <div className="container">{children}</div>
    </div>
  );
}