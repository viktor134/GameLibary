import { app } from 'electron';
import { LauncherApp } from './LauncherApp';

app.whenReady().then(() => new LauncherApp().start());
app.on('window-all-closed', () => app.quit());
