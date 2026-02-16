/**
 * TypeDI Container Configuration for Electron Main Process
 * Sets up dependency injection for the client application
 */

import { Container } from 'typedi';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize the DI container by importing all service files
 * This ensures all @Service() decorated classes are registered
 */
export async function initContainer(): Promise<void> {
  // Import all service files to register them with TypeDI
  // The import statements will execute the @Service() decorators

  const servicesDir = path.join(__dirname, 'services');

  // Check if services directory exists
  if (!fs.existsSync(servicesDir)) {
    console.log('[Container] Services directory not found, skipping auto-import');
    return;
  }

  // Get all .ts/.js files in the services directory
  const files = fs.readdirSync(servicesDir)
    .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
    .filter(file => !file.endsWith('.d.ts')); // Exclude type definition files

  for (const file of files) {
    try {
      const filePath = path.join(servicesDir, file);
      // Dynamic import to trigger @Service() decorators
      await import(filePath);
      console.log(`[Container] Imported service: ${file}`);
    } catch (error) {
      console.warn(`[Container] Failed to import ${file}:`, error);
    }
  }

  console.log('[Container] DI Container initialized');
}

/**
 * Get a service instance from the container
 */
export function getService<T>(serviceClass: new (...args: unknown[]) => T): T {
  return Container.get(serviceClass);
}

export { Container };
