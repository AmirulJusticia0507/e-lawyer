import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, ReactNode, Suspense } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { hasPermission } from './auth/permissions';

const Layout = lazy(() => import('./components/Layout'));
const CaseDetail = lazy(() => import('./pages/CaseDetail'));
const Cases = lazy(() => import('./pages/Cases'));
const ClientDetail = lazy(() => import('./pages/ClientDetail'));
const Clients = lazy(() => import('./pages/Clients'));
const ConsultationDetail = lazy(() => import('./pages/ConsultationDetail'));
const Consultations = lazy(() => import('./pages/Consultations'));
const Documents = lazy(() => import('./pages/Documents'));
const Hearings = lazy(() => import('./pages/Hearings'));
const Hearings = lazy(() => import('./pages/Hearings'));
const Home = lazy(() => import('./pages/Home'));
const Integritas = lazy(() => import('./pages/Integritas'));
const Login = lazy(() => import('./pages/Login'));
const BillingDashboard = lazy(() => import('./pages/BillingDashboard'));
const RegulationDetail = lazy(() => import('./pages/RegulationDetail'));
const Regulations = lazy(() => import('./pages/Regulations'));

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
      <Suspense fallback={<p role="status">Memuat halaman…</p>}>
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
            path="/sidang"
            element={
              <RequireAuth permission="READ:HEARING">
                <Layout>
                  <Hearings />
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
            path="/keuangan"
            element={
              <RequireAuth permission="READ:INVOICE">
                <Layout>
                  <BillingDashboard />
                </Layout>
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
