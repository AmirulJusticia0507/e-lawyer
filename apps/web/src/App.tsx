import { Link, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';

export default function App() {
  return (
    <div>
      <nav
        style={{
          display: 'flex',
          gap: '1.5rem',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <Link to="/" style={{ fontWeight: 700 }}>
          e-Lawyer
        </Link>
        <Link to="/login">Masuk</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </div>
  );
}