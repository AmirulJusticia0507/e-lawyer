export default function Login() {
  return (
    <main
      style={{
        minHeight: 'calc(100vh - 57px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '2rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', margin: '0 0 1.5rem' }}>Masuk</h1>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{ display: 'grid', gap: '0.375rem' }}>
            Email
            <input
              type="email"
              name="email"
              required
              style={inputStyle}
              placeholder="nama@firma.com"
            />
          </label>
          <label style={{ display: 'grid', gap: '0.375rem' }}>
            Password
            <input type="password" name="password" required style={inputStyle} />
          </label>
          <button type="submit" style={buttonStyle}>
            Masuk
          </button>
        </form>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '1rem' }}>
          Terhubung dengan endpoint /api/auth/login pada e-Lawyer API.
        </p>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '0.625rem 0.75rem',
  fontSize: '1rem',
};

const buttonStyle: React.CSSProperties = {
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '0.75rem 1rem',
  fontSize: '1rem',
  cursor: 'pointer',
};