import {
  app,
  type BrowserWindow,
  Menu,
  nativeImage,
  Notification,
  Tray,
} from "electron";
import path from "node:path";
import { UpdateSourceType, updateElectronApp } from "update-electron-app";
import { timerStateMachine } from "./timer";

let tray: Tray | null = null;
let mainWindowRef: BrowserWindow | null = null;

export function setupTray(mainWindow: BrowserWindow) {
  mainWindowRef = mainWindow;

  // Use extraResource icons in packaged app, otherwise use build folder
  const trayIconPath = app.isPackaged
    ? path.join(process.resourcesPath, "tray-icon.png")
    : path.join(__dirname, "../../build/tray-icon.png");

  const trayIcon = nativeImage.createFromPath(trayIconPath);
  tray = new Tray(trayIcon);
  tray.setToolTip("Time Tracker");

  updateTrayMenu();

  tray.setContextMenu(buildContextMenu());

  tray.on("click", () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

function buildContextMenu(): Menu {
  const state = timerStateMachine.getState();
  return Menu.buildFromTemplate([
    {
      label: "Show App",
      click: () => {
        mainWindowRef?.show();
        mainWindowRef?.focus();
      },
    },
    { type: "separator" },
    {
      label: state.running ? "Stop Timer" : "Start Timer",
      click: () => {
        if (state.running) {
          const result = timerStateMachine.stop();
          if (result) {
            showNotification("Timer Stopped", "Time entry saved.");
          }
        } else {
          timerStateMachine.start("Quick timer", null);
          showNotification("Timer Started", "Timer is now running.");
        }
        updateTrayMenu();
      },
    },
    { type: "separator" },
    {
      label: "Check for Updates",
      click: () => {
        updateElectronApp({
          updateSource: {
            type: UpdateSourceType.ElectronPublicUpdateService,
            repo: "LuanRoger/electron-shadcn",
          },
        });
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);
}

function updateTrayMenu() {
  if (tray) {
    tray.setContextMenu(buildContextMenu());
  }
}

function showNotification(title: string, body: string) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

export { updateTrayMenu };
