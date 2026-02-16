import { bindServices } from '@rabjs/react';
import { StartupModePage } from './startup-mode';

/**
 * Startup mode page entry - allows users to choose between remote/local mode
 */
const StartupModePageWithServices = bindServices(StartupModePage, []);
export default StartupModePageWithServices;
