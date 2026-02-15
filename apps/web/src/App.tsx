import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import AuthPage from './pages/auth';
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
              <div className="p-8">
                <h1 className="text-2xl font-bold">LanceDB Admin</h1>
                <p className="mt-4 text-gray-600">Welcome to LanceDB Admin. Connection management coming soon.</p>
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
