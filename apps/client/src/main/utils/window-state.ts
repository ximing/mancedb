import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized?: boolean;
  isFullScreen?: boolean;
}

const defaultState: WindowState = {
  width: 1400,
  height: 900,
};

function getStatePath(): string {
  return path.join(app.getPath('userData'), 'window-state.json');
}

export function loadWindowState(): WindowState {
  try {
    const statePath = getStatePath();
    if (fs.existsSync(statePath)) {
      const data = fs.readFileSync(statePath, 'utf-8');
      const parsed = JSON.parse(data) as WindowState;
      // Validate the parsed state
      if (parsed.width && parsed.height) {
        return { ...defaultState, ...parsed };
      }
    }
  } catch (error) {
    console.error('Failed to load window state:', error);
  }
  return { ...defaultState };
}

export function saveWindowState(state: WindowState): void {
  try {
    const statePath = getStatePath();
    fs.writeFileSync(statePath, JSON.stringify(state), 'utf-8');
  } catch (error) {
    console.error('Failed to save window state:', error);
  }
}
