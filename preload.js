const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // 更新状态监听
  onUpdateStatus: (callback) => {
    ipcRenderer.on("update-status", (event, data) => callback(data));
  },

  // 触发安装更新
  installUpdate: () => ipcRenderer.send("install-update"),

  // 手动检查更新
  checkUpdate: () => ipcRenderer.invoke("check-update"),
});
