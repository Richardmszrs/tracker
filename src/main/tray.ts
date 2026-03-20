import {
  app,
  type BrowserWindow,
  Menu,
  nativeImage,
  Notification,
  Tray,
} from "electron";
import { timerStateMachine } from "./timer";

let tray: Tray | null = null;
let mainWindowRef: BrowserWindow | null = null;

export function setupTray(mainWindow: BrowserWindow) {
  mainWindowRef = mainWindow;

  const iconDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADSSURBVDiN1ZI9DoJAEIW/WVgiYmFhYWFh4RfwAHgCLS0dPYEPgJWVhYUfQD4AC0QsgriwECzCbpYd2F025s+8yWQG+B8q4c3MBGCCxq0DbEEXsAQWwBzIAo4OQA/oAgY4AWfgDlzE7xRYiR0oA8/ABbhLsAReQKqD7wA1IAMcgaJg2L/Y4zfgJn5HYAtUY4YOsAN2wEX87oCNmMkA2+C6qJ0D1mJGDRiJGTqAGXASP0NgLWasgL7YoQO8iN8esBGzLGBb7FABPsXvENiKmRawLXaoCF/i9wZYYqYFbIsdKsKX+P0AVgqGA8qC4YoAAAAASUVORK5CYII=";

  const trayIcon = nativeImage.createFromDataURL(iconDataUrl);
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
