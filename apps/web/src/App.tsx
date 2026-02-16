import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router';
import AuthPage from './pages/auth';
import StartupModePage from './pages/startup';
import { ConnectionListPage } from './pages/connections/connection-list';
import { ConnectionFormPage } from './pages/connections/connection-form';
import { ConnectionLoginPage } from './pages/connection-login/connection-login';
import { MainLayout } from './pages/database/components/main-layout';
import { DatabaseContent } from './pages/database/components/database-content';
import { ProtectedRoute } from './components/protected-route';
import { ConnectionProtectedRoute } from './components/connection-protected-route';
import { isElectron } from './utils/environment';

// Use HashRouter in Electron (file:// protocol doesn't support History API)
// Use BrowserRouter in normal web environment
const Router = isElectron() ? HashRouter : BrowserRouter;

function App() {
  return (
    <Router>
      <Routes>
        {/* Startup mode selection (Electron only) */}
        <Route path="/startup" element={<StartupModePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ConnectionListPage />
            </ProtectedRoute>
          }
        />
        {/* Connection form routes */}
        <Route
          path="/connections/new"
          element={
            <ProtectedRoute>
              <ConnectionFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/connections/:id/edit"
          element={
            <ProtectedRoute>
              <ConnectionFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/connections/:id/login"
          element={
            <ProtectedRoute>
              <ConnectionLoginPage />
            </ProtectedRoute>
          }
        />
        {/* Database browser routes */}
        <Route
          path="/connections/:id/database"
          element={
            <ProtectedRoute>
              <ConnectionProtectedRoute>
                <MainLayout>
                  <DatabaseContent />
                </MainLayout>
              </ConnectionProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
