import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  app,
  BrowserWindow,
  globalShortcut,
  Notification,
  powerMonitor,
} from "electron";
import { ipcMain } from "electron/main";
import {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";
import { UpdateSourceType, updateElectronApp } from "update-electron-app";
import { ipcContext } from "@/ipc/context";
import { IPC_CHANNELS } from "./constants";
import { timerStateMachine } from "./main/timer";
import { settingsStore } from "./main/settings";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inDevelopment = process.env.NODE_ENV === "development";

function createWindow() {
  const preload = path.join(__dirname, "preload.js");
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      devTools: inDevelopment,
      contextIsolation: true,
      nodeIntegration: true,
      nodeIntegrationInSubFrames: false,

      preload,
    },
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    trafficLightPosition:
      process.platform === "darwin" ? { x: 5, y: 5 } : undefined,
  });

  // macOS vibrancy glass effect
  if (process.platform === "darwin") {
    mainWindow.setVibrancy("sidebar");
  }
  ipcContext.setMainWindow(mainWindow);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  return mainWindow;
}

async function installExtensions() {
  try {
    const result = await installExtension(REACT_DEVELOPER_TOOLS);
    console.log(`Extensions installed successfully: ${result.name}`);
  } catch {
    console.error("Failed to install extensions");
  }
}

function checkForUpdates() {
  updateElectronApp({
    updateSource: {
      type: UpdateSourceType.ElectronPublicUpdateService,
      repo: "LuanRoger/electron-shadcn",
    },
  });
}

async function setupORPC() {
  const { rpcHandler } = await import("./ipc/handler");

  ipcMain.on(IPC_CHANNELS.START_ORPC_SERVER, (event) => {
    const [serverPort] = event.ports;

    serverPort.start();
    rpcHandler.upgrade(serverPort);
  });
}

function setupIdleDetection(mainWindow: BrowserWindow) {
  const thresholdMinutes = settingsStore.get("idleThresholdMinutes");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (powerMonitor as any).on("idle", () => {
    const state = timerStateMachine.getState();
    if (!state.running) return;

    if (Notification.isSupported()) {
      new Notification({
        title: "Time Tracker",
        body: `Timer still running — you've been idle for ${thresholdMinutes} min`,
      }).show();
    }
    mainWindow.webContents.send(IPC_CHANNELS.IDLE_DETECTED, {
      idleStartTime: Date.now(),
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (powerMonitor as any).on("active", () => {
    mainWindow.webContents.send(IPC_CHANNELS.IDLE_DISMISSED);
  });
}

app.whenReady().then(async () => {
  try {
    // Run migrations before creating window
    const { runMigrations } = await import("./main/db/migrate");
    runMigrations();

    const mainWindow = createWindow();
    await installExtensions();
    checkForUpdates();
    await setupORPC();
    // Setup system tray after window is created
    const { setupTray } = await import("./main/tray");
    setupTray(mainWindow);

    // Setup idle detection
    setupIdleDetection(mainWindow);

    // Register global shortcut Cmd+Shift+T to toggle timer
    globalShortcut.register("Cmd+Shift+T", () => {
      const state = timerStateMachine.getState();
      if (state.running) {
        const result = timerStateMachine.stop();
        if (result && Notification.isSupported()) {
          new Notification({ title: "Timer Stopped", body: "Time entry saved." }).show();
        }
      } else {
        timerStateMachine.start("Quick timer", null);
        if (Notification.isSupported()) {
          new Notification({ title: "Timer Started", body: "Timer is now running." }).show();
        }
      }
    });
  } catch (error) {
    console.error("Error during app initialization:", error);
  }
});

// osX only
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
//osX only ends
