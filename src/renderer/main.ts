import type { LauncherApi } from '../shared/types';
import { App } from './App.js';

declare global {
  interface Window {
    /** Exposed by the preload script. */
    api: LauncherApi;
  }
}

new App().start();
