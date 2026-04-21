const { app, BrowserWindow, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

// 配置日志
log.transports.file.level = "info";
autoUpdater.logger = log;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow;
let updateAvailable = false;
let updateDownloaded = false;

// 检测到更新
autoUpdater.on("checking-for-update", () => {
  log.info("检查更新中...");
  sendToRenderer("update-status", { status: "checking" });
});

autoUpdater.on("update-available", (info) => {
  log.info("有新版本可用:", info.version);
  updateAvailable = true;
  sendToRenderer("update-status", { status: "available", version: info.version });
});

autoUpdater.on("update-not-available", () => {
  log.info("已是最新版本");
  sendToRenderer("update-status", { status: "up-to-date" });
});

autoUpdater.on("download-progress", (progress) => {
  const pct = Math.round(progress.percent);
  log.info(`下载进度: ${pct}%`);
  sendToRenderer("update-status", { status: "downloading", progress: pct });
});

autoUpdater.on("update-downloaded", (info) => {
  log.info("下载完成，准备安装");
  updateDownloaded = true;
  sendToRenderer("update-status", { status: "ready", version: info.version });
});

autoUpdater.on("error", (err) => {
  log.error("更新错误:", err.message);
  sendToRenderer("update-status", { status: "error", error: err.message });
});

// 向渲染进程发送消息
function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

app.whenReady().then(() => {
  // 启动代理服务器
  try {
    require("./proxy-server.js");
  } catch (e) {
    log.error("[proxy-server] start failed:", e.message);
  }

  // 等服务器就绪后打开窗口
  setTimeout(() => {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: __dirname + "/preload.js",
      },
    });
    mainWindow.loadURL("http://localhost:3456");

    // 渲染进程就绪后，开始检查更新
    mainWindow.webContents.on("did-finish-load", () => {
      // 延迟一下，等页面初始化完成
      setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify().catch((err) => {
          log.error("检查更新失败:", err.message);
        });
      }, 3000);
    });

    // 窗口关闭时退出
    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  }, 1500);
});

// 渲染进程请求安装更新
ipcMain.on("install-update", () => {
  log.info("用户触发安装更新");
  autoUpdater.quitAndInstall();
});

// 检查更新（手动触发）
ipcMain.handle("check-update", async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return result;
  } catch (err) {
    return { error: err.message };
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
