import { Link, NavLink, useLocation } from 'react-router-dom';
import { ReactNode, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { hasPermission } from '../auth/permissions';
import { useTheme } from '../theme/ThemeContext';
import NotificationControl from './NotificationControl';

const navigation = [
  { label: 'Dashboard', path: '/', permission: 'READ:CASE' },
  { label: 'Perkara', path: '/perkara', permission: 'READ:CASE' },
  { label: 'Klien', path: '/klien', permission: 'READ:CLIENT' },
  { label: 'Peraturan', path: '/peraturan', permission: 'READ:REGULATION' },
  { label: 'Dokumen', path: '/dokumen', permission: 'READ:DOCUMENT' },
  { label: 'Sidang', path: '/sidang', permission: 'READ:HEARING' },
  { label: 'Konsultasi', path: '/konsultasi', permission: 'READ:CONSULTATION' },
  { label: 'Integritas', path: '/integritas', permission: 'READ:INTEGRITY' },
  { label: 'Keuangan', path: '/keuangan', permission: 'READ:INVOICE' },
  { label: 'SLA Timer', path: '/sla', permission: 'READ:HEARING' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNav = navigation.filter((item) => hasPermission(user, item.permission));

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      <a className="skip-link" href="#main-content">
        Lewati ke konten utama
      </a>

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-[var(--surface)] border-r border-[var(--border)] transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navigasi sidebar"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-[var(--border)] px-4">
            <Link to="/" className="text-xl font-bold text-[var(--accent)]">
              e-Lawyer
            </Link>
            <button
              className="lg:hidden p-2 rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              onClick={() => setSidebarOpen(false)}
              aria-label="Tutup sidebar"
            >
              ✕
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Menu utama">
            {filteredNav.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-[var(--border)] p-4">
            <div className="flex items-center gap-3 rounded-lg bg-[var(--surface-2)] p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text)] truncate">{user?.fullName}</p>
                <p className="text-xs text-[var(--muted)] truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-sm px-4 py-3 lg:px-6">
          <button
            className="lg:hidden p-2 rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka sidebar"
          >
            ☰
          </button>

          <h1 className="flex-1 text-lg font-semibold text-[var(--text)] truncate">
            {getPageTitle(location.pathname)}
          </h1>

          <div className="flex items-center gap-2">
            <NotificationControl />
            <button
              className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              onClick={toggleTheme}
              aria-label={`Aktifkan tema ${theme === 'dark' ? 'terang' : 'gelap'}`}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-sm text-[var(--muted)]">{user?.fullName}</span>
              <button
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                onClick={() => void logout()}
              >
                Keluar
              </button>
            </div>
          </div>
        </header>

        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 lg:p-6"
          tabIndex={-1}
        >
          {children}
        </main>

        <footer className="border-t border-[var(--border)] bg-[var(--surface)]/50 px-4 py-3 lg:px-6">
          <div className="flex flex-col items-center justify-between gap-2 text-sm text-[var(--muted)] sm:flex-row">
            <p>&copy; 2025 e-Lawyer. Hak cipta dilindungi.</p>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="hover:text-[var(--text)]">Kebijakan Privasi</Link>
              <Link to="/terms" className="hover:text-[var(--text)]">Syarat & Ketentuan</Link>
              <Link to="/contact" className="hover:text-[var(--text)]">Kontak</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/': 'Dashboard',
    '/perkara': 'Perkara',
    '/klien': 'Klien',
    '/peraturan': 'Peraturan',
    '/dokumen': 'Dokumen',
    '/sidang': 'Sidang',
    '/konsultasi': 'Konsultasi',
    '/integritas': 'Integritas',
    '/keuangan': 'Keuangan',
    '/sla': 'SLA Timer',
  };

  for (const [path, title] of Object.entries(titles)) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      return title;
    }
  }
  return 'e-Lawyer';
}