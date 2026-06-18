const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow

app.commandLine.appendSwitch('disable-gpu', 'true')

async function loadDevURL(window, retries = 10, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await window.loadURL('http://localhost:5175')
      return
    } catch (err) {
      console.log(`加载开发服务器失败 (尝试 ${i + 1}/${retries})，${delay}ms 后重试...`, err.message)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  console.error('无法加载开发服务器，请确认 Vite 开发服务器已在端口 5175 启动')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0a0a0f',
    title: 'CurseWeaver - 分支诅咒剧情编排器',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  const isDev = !app.isPackaged

  if (isDev) {
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.log('页面加载失败:', errorCode, errorDescription)
      if (errorCode !== -3) {
        loadDevURL(mainWindow)
      }
    })
    loadDevURL(mainWindow)
    mainWindow.webContents.openDevTools()
  } else {
    try {
      mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))
    } catch (err) {
      console.error('加载生产页面失败:', err)
    }
  }
}

ipcMain.handle('save-project', async (event, data) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '保存项目',
    defaultPath: 'curse-project.json',
    filters: [{ name: 'JSON 文件', extensions: ['json'] }]
  })

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8')
    return { success: true, path: result.filePath }
  }
  return { success: false }
})

ipcMain.handle('load-project', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '加载项目',
    filters: [{ name: 'JSON 文件', extensions: ['json'] }],
    properties: ['openFile']
  })

  if (!result.canceled && result.filePaths.length > 0) {
    const content = fs.readFileSync(result.filePaths[0], 'utf-8')
    return { success: true, data: JSON.parse(content), path: result.filePaths[0] }
  }
  return { success: false }
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
