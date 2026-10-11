const features = [
  'Manajemen Perkara & Klien',
  'Konsultasi Legal Digital',
  'Basis Peraturan & Sitasi Pasal',
  'Integritas & Anti-Manipulasi',
  'Otomatisasi Dokumen & Putusan',
  'Jadwal Sidang & Anti-Molor',
  'Waktu, Billing & Pembayaran',
  'AI Legal Analytics',
];

export default function Home() {
  return (
    <main
      style={{
        minHeight: 'calc(100vh - 57px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2rem',
        padding: '3rem 1.5rem',
      }}
    >
      <header style={{ textAlign: 'center', maxWidth: 720 }}>
        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>e-Lawyer Platform</h1>
        <p style={{ color: 'var(--muted)', fontSize: '1.125rem' }}>
          Platform litigasi digital terpadu yang menghubungkan advokat, pengadilan, dan klien.
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.75rem',
          width: '100%',
          maxWidth: 960,
        }}
      >
        {features.map((feature) => (
          <div
            key={feature}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '1rem 1.25rem',
            }}
          >
            {feature}
          </div>
        ))}
      </div>

      <footer style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
        Status: <strong>F0 — Fondasi & Setup</strong>
      </footer>
    </main>
  );
}