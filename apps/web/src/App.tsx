import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import AuthPage from './pages/auth';
import { ConnectionListPage } from './pages/connections/connection-list';
import { ConnectionFormPage } from './pages/connections/connection-form';
import { ConnectionLoginPage } from './pages/connection-login/connection-login';
import { ProtectedRoute } from './components/protected-route';

function App() {
  return (
    <BrowserRouter>
      <Routes>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
