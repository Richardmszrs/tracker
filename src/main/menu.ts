import { app, BrowserWindow, Menu, shell } from "electron";

export function setupMenu(mainWindow: BrowserWindow) {
  const isMac = process.platform === "darwin";

  // Helper to create menu items with proper typing
  const menuItem = (
    options: Electron.MenuItemConstructorOptions
  ): Electron.MenuItemConstructorOptions => options;

  const template: Electron.MenuItemConstructorOptions[] = [];

  // App menu (macOS only)
  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        menuItem({ label: `About ${app.name}`, role: "about" }),
        menuItem({ type: "separator" }),
        menuItem({
          label: "Preferences...",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            mainWindow.webContents.send("open-settings");
          },
        }),
        menuItem({ type: "separator" }),
        menuItem({ label: `Hide ${app.name}`, role: "hide" }),
        menuItem({ label: "Hide Others", role: "hideOthers" }),
        menuItem({ label: "Show All", role: "unhide" }),
        menuItem({ type: "separator" }),
        menuItem({ label: `Quit ${app.name}`, role: "quit" }),
      ],
    });
  }

  // Edit menu
  template.push({
    label: "Edit",
    submenu: [
      menuItem({ role: "undo" }),
      menuItem({ role: "redo" }),
      menuItem({ type: "separator" }),
      menuItem({ role: "cut" }),
      menuItem({ role: "copy" }),
      menuItem({ role: "paste" }),
      ...(isMac
        ? [
            menuItem({ role: "pasteAndMatchStyle" }),
            menuItem({ role: "delete" }),
            menuItem({ role: "selectAll" }),
          ]
        : [
            menuItem({ role: "delete" }),
            menuItem({ type: "separator" }),
            menuItem({ role: "selectAll" }),
          ]),
    ],
  });

  // View menu
  template.push({
    label: "View",
    submenu: [
      menuItem({ role: "reload" }),
      menuItem({ role: "forceReload" }),
      menuItem({ role: "toggleDevTools" }),
      menuItem({ type: "separator" }),
      menuItem({ role: "resetZoom" }),
      menuItem({ role: "zoomIn" }),
      menuItem({ role: "zoomOut" }),
      menuItem({ type: "separator" }),
      menuItem({ role: "togglefullscreen" }),
    ],
  });

  // Window menu
  template.push({
    label: "Window",
    submenu: [
      menuItem({ role: "minimize" }),
      menuItem({ role: "zoom" }),
      ...(isMac
        ? [
            menuItem({ type: "separator" }),
            menuItem({ label: "Bring All to Front", role: "front" }),
            menuItem({ type: "separator" }),
            menuItem({ role: "close" }),
          ]
        : [menuItem({ role: "close" })]),
    ],
  });

  // Help menu
  template.push({
    label: "Help",
    submenu: [
      menuItem({
        label: "Documentation",
        click: async () => {
          await shell.openExternal(
            "https://github.com/LuanRoger/electron-shadcn"
          );
        },
      }),
      menuItem({
        label: "Report Issue",
        click: async () => {
          await shell.openExternal(
            "https://github.com/LuanRoger/electron-shadcn/issues"
          );
        },
      }),
    ],
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
