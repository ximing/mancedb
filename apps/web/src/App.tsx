import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import AuthPage from './pages/auth';
import { ConnectionListPage } from './pages/connections/connection-list';
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
        {/* Placeholder routes for future implementation */}
        <Route
          path="/connections/new"
          element={
            <ProtectedRoute>
              <div className="p-8">
                <h1 className="text-2xl font-bold">Create Connection</h1>
                <p className="mt-4 text-gray-600">Connection form coming soon (US-006).</p>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/connections/:id/login"
          element={
            <ProtectedRoute>
              <div className="p-8">
                <h1 className="text-2xl font-bold">Connection Login</h1>
                <p className="mt-4 text-gray-600">Connection login page coming soon (US-007).</p>
              </div>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
