const { app, BrowserWindow } = require("electron");

let mainWindow;

app.whenReady().then(() => {
  // 直接在主进程启动代理服务器
  try {
    require("./proxy-server.js");
  } catch (e) {
    console.error("[proxy-server] start failed:", e.message);
  }

  // 等服务器就绪后打开窗口
  setTimeout(() => {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });
    mainWindow.loadURL("http://localhost:3456");
  }, 1500);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
