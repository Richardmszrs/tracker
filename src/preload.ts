import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "./constants";

window.addEventListener("message", (event) => {
  if (event.data === IPC_CHANNELS.START_ORPC_SERVER) {
    const [serverPort] = event.ports;

    ipcRenderer.postMessage(IPC_CHANNELS.START_ORPC_SERVER, null, [serverPort]);
  }
});

// Expose IPC for main -> renderer events (idle detection, update ready)
contextBridge.exposeInMainWorld("electronEvents", {
  onIdleDetected: (callback: () => void) => {
    ipcRenderer.on(IPC_CHANNELS.IDLE_DETECTED, callback);
  },
  onUpdateReady: (callback: () => void) => {
    ipcRenderer.on("update-ready", callback);
  },
});
