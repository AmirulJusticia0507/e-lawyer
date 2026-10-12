import { Link, NavLink } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { hasPermission } from '../auth/permissions';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div>
      <nav className="nav">
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
