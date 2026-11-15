import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { GameUpdate, IpcChannel, IpcContract, LauncherApi } from '../shared/types';

/** Type-safe wrapper around ipcRenderer.invoke. */
function invoke<C extends IpcChannel>(channel: C, ...args: IpcContract[C]['args']): Promise<IpcContract[C]['result']> {
  return ipcRenderer.invoke(channel, ...args);
}

const api: LauncherApi = {
  games: () => invoke('games'),
  launch: (id) => invoke('launch', id),
  searchArt: (term) => invoke('search-art', term),
  setArt: (id, appid) => invoke('set-art', id, appid),
  customCover: (id) => invoke('custom-cover', id),
  rename: (id, name) => invoke('rename', id, name),
  addGames: (paths) => invoke('add-games', paths),
  remove: (id) => invoke('remove', id),
  openFolder: () => invoke('open-folder'),
  fullscreen: () => invoke('fullscreen'),
  quit: () => invoke('quit'),
  pathForFile: (file) => webUtils.getPathForFile(file),
  onGameUpdated: (callback) => {
    ipcRenderer.on('game-updated', (_event, update: GameUpdate) => callback(update));
  },
};

contextBridge.exposeInMainWorld('api', api);
