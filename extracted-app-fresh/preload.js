const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tnewsWidget", {
  getConfig: () => ipcRenderer.invoke("get-config"),
  loadNews: () => ipcRenderer.invoke("load-news"),
  openLink: (url) => ipcRenderer.invoke("open-link", url),
  minimize: () => ipcRenderer.send("window-minimize"),
  onNewsUpdated: (callback) => {
    ipcRenderer.on("news-updated", (_event, payload) => callback(payload));
  },
});
