import { app, type BrowserWindow, Menu, nativeImage, Tray } from "electron";

let tray: Tray | null = null;

export function setupTray(mainWindow: BrowserWindow) {
  // Create a 16x16 tray icon from a data URL (blue circle clock-like icon)
  const iconDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADSSURBVDiN1ZI9DoJAEIW/WVgiYmFhYWFh4RfwAHgCLS0dPYEPgJWVhYUfQD4AC0QsgriwECzCbpYd2F025s+8yWQG+B8q4c3MBGCCxq0DbEEXsAQWwBzIAo4OQA/oAgY4AWfgDlzE7xRYiR0oA8/ABbhLsAReQKqD7wA1IAMcgaJg2L/Y4zfgJn5HYAtUY4YOsAN2wEX87oCNmMkA2+C6qJ0D1mJGDRiJGTqAGXASP0NgLWasgL7YoQO8iN8esBGzLGBb7FABPsXvENiKmRawLXaoCF/i9wZYYqYFbIsdKsKX+P0AVgqGA8qC4YoAAAAASUVORK5CYII=";

  const trayIcon = nativeImage.createFromDataURL(iconDataUrl);
  tray = new Tray(trayIcon);
  tray.setToolTip("Time Tracker");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show App",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: "separator" },
    {
      label: "Start Timer",
      click: () => {
        // TODO: wire to timer IPC
        console.log("Start Timer clicked");
      },
    },
    {
      label: "Stop Timer",
      click: () => {
        // TODO: wire to timer IPC
        console.log("Stop Timer clicked");
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

  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    mainWindow.show();
    mainWindow.focus();
  });
}
