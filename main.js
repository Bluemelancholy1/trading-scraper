const { app, BrowserWindow, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");

let mainWindow;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on("update-available", (info) => {
  if (mainWindow) {
    mainWindow.webContents.send("update-available", info);
  }
  dialog.showMessageBox({
    type: "info",
    title: "有可用更新",
    message: "发现新版本 v" + info.version + "，是否立即下载？",
    buttons: ["下载", "稍后"]
  }).then((r) => {
    if (r.response === 0) autoUpdater.downloadUpdate();
  });
});

autoUpdater.on("update-downloaded", () => {
  dialog.showMessageBox({
    type: "info",
    title: "更新已就绪",
    message: "更新已下载完成，应用将在重启后自动安装。",
    buttons: ["重启更新", "取消"]
  }).then((r) => {
    if (r.response === 0) autoUpdater.quitAndInstall();
  });
});

autoUpdater.on("error", (err) => {
  console.error("Update error:", err);
});

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  mainWindow.loadFile("index.html");
  if (process.env.NODE_ENV !== "production") {
    autoUpdater.checkForUpdates().catch((e) => console.error("Check error:", e));
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
