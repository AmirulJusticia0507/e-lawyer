import { Navigate, Route, Routes } from 'react-router-dom';
import { ReactNode } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Layout from './components/Layout';
import CaseDetail from './pages/CaseDetail';
import Cases from './pages/Cases';
import ClientDetail from './pages/ClientDetail';
import Clients from './pages/Clients';
import ConsultationDetail from './pages/ConsultationDetail';
import Consultations from './pages/Consultations';
import Home from './pages/Home';
import Integritas from './pages/Integritas';
import Login from './pages/Login';
import Regulations from './pages/Regulations';
import RegulationDetail from './pages/RegulationDetail';
import Documents from './pages/Documents';
import Hearings from './pages/Hearings';
import { hasPermission } from './auth/permissions';

function RequireAuth({ children, permission }: { children: ReactNode; permission?: string }) {
  const { user, ready } = useAuth();
  if (!ready) return <p role="status">Memuat sesi…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasPermission(user, permission)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout>
                <Home />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/klien"
          element={
            <RequireAuth permission="READ:CLIENT">
              <Layout>
                <Clients />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/klien/:id"
          element={
            <RequireAuth permission="READ:CLIENT">
              <Layout>
                <ClientDetail />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/perkara"
          element={
            <RequireAuth permission="READ:CASE">
              <Layout>
                <Cases />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/perkara/:id"
          element={
            <RequireAuth permission="READ:CASE">
              <Layout>
                <CaseDetail />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/peraturan"
          element={
            <RequireAuth permission="READ:REGULATION">
              <Layout>
                <Regulations />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/peraturan/:slug"
          element={
            <RequireAuth permission="READ:REGULATION">
              <Layout>
                <RegulationDetail />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/konsultasi"
          element={
            <RequireAuth permission="READ:CONSULTATION">
              <Layout>
                <Consultations />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/konsultasi/:id"
          element={
            <RequireAuth permission="READ:CONSULTATION">
              <Layout>
                <ConsultationDetail />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/integritas"
          element={
            <RequireAuth permission="READ:INTEGRITY">
              <Layout>
                <Integritas />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/dokumen"
          element={
            <RequireAuth permission="READ:DOCUMENT">
              <Layout>
                <Documents />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/sidang"
          element={
            <RequireAuth permission="READ:HEARING">
              <Layout>
                <Hearings />
              </Layout>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
