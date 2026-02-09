const { app, BrowserWindow, ipcMain, Menu } = require("electron");

const path = require("path");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  mainWindow.loadFile("render/index.html");

  // ❌ Quitar menú superior
  Menu.setApplicationMenu(null);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* 🔹 OBTENER IMPRESORAS */
ipcMain.handle("get-printers", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return await win.webContents.getPrintersAsync();
});

/* 🔹 IMPRIMIR EN IMPRESORA SELECCIONADA */
ipcMain.handle("print-ticket", async (event, deviceName) => {
  const win = BrowserWindow.fromWebContents(event.sender);

  await win.webContents.print({
    silent: true,
    printBackground: true,
    deviceName: deviceName,
    margins: { marginType: "none" },
    pageSize: {
      width: 82000, // ✅ ancho calibrado real para tu impresora
      height: 150000, // largo tipo rollo
    },
  });

  return { ok: true };
});
