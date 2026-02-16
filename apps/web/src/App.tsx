import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router';
import StartupModePage from './pages/startup';
import { ConnectionListPage } from './pages/connections/connection-list';
import { ConnectionFormPage } from './pages/connections/connection-form';
import { MainLayout } from './pages/database/components/main-layout';
import { DatabaseContent } from './pages/database/components/database-content';
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
        {/* Default route: Connection list page */}
        <Route path="/" element={<Navigate to="/connections" replace />} />
        {/* Connection list page */}
        <Route path="/connections" element={<ConnectionListPage />} />
        {/* Connection form routes */}
        <Route path="/connections/new" element={<ConnectionFormPage />} />
        <Route path="/connections/:id/edit" element={<ConnectionFormPage />} />
        {/* Database browser routes */}
        <Route
          path="/connections/:id/database"
          element={
            <ConnectionProtectedRoute>
              <MainLayout>
                <DatabaseContent />
              </MainLayout>
            </ConnectionProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/connections" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
