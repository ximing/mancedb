import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { bindServices, register, resolve, RSRoot, RSStrict } from '@rabjs/react';
import './index.css';
import App from './App.tsx';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { ConnectionAuthService } from './services/connection-auth.service';
import { ConnectionService } from './services/connection.service';
import { DatabaseService } from './services/database.service';

/**
 * Register services globally
 * These are accessible throughout the entire application
 */
const AppWithServices = bindServices(App, []);
register(AuthService);
register(ThemeService);
register(ConnectionAuthService)
register(ConnectionService)
register(DatabaseService)

// Initialize theme before rendering
resolve(ThemeService).loadTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RSRoot>
      <RSStrict>
        <AppWithServices />
      </RSStrict>
    </RSRoot>
  </StrictMode>
);
