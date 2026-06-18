const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow

const getWindowStatePath = () => {
  return path.join(app.getPath('userData'), 'window-state.json')
}

const loadWindowState = () => {
  try {
    const statePath = getWindowStatePath()
    if (fs.existsSync(statePath)) {
      const data = fs.readFileSync(statePath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (err) {
    console.error('读取窗口状态失败:', err)
  }
  return null
}

const saveWindowState = (state) => {
  try {
    const statePath = getWindowStatePath()
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8')
  } catch (err) {
    console.error('保存窗口状态失败:', err)
  }
}

const getAssetPath = (...paths) => {
  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'app')
    : path.join(__dirname, '..')
  return path.join(RESOURCES_PATH, ...paths)
}

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

const ERROR_HTML = `data:text/html;charset=utf-8,
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>加载失败</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0a0a0f;
      color: #e8e8f0;
      font-family: 'Microsoft YaHei', sans-serif;
    }
    .container {
      text-align: center;
      padding: 40px;
    }
    .icon { font-size: 64px; margin-bottom: 20px; }
    .title { font-size: 24px; margin-bottom: 12px; color: #ff6b6b; }
    .desc { font-size: 14px; color: #a0a0b0; margin-bottom: 24px; line-height: 1.6; }
    button {
      padding: 10px 24px;
      background: linear-gradient(135deg, #8b0000, #6b2d8b);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
    }
    button:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚠️</div>
    <div class="title">加载失败</div>
    <div class="desc">页面加载出现错误，请重启应用或重试。<br>如果问题持续存在，请联系开发者。</div>
    <button onclick="location.reload()">重试</button>
  </div>
</body>
</html>`.replace(/\n/g, '').trim()

function createWindow() {
  const savedState = loadWindowState()
  const defaultState = {
    width: 1400,
    height: 900,
    x: undefined,
    y: undefined,
    maximized: false
  }
  const windowState = savedState ? { ...defaultState, ...savedState } : defaultState

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0a0a0f',
    title: 'CurseWeaver - 分支诅咒剧情编排器',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  if (windowState.maximized) {
    mainWindow.maximize()
  }

  let currentState = { ...windowState }
  let windowStateSaved = false

  const saveFinalState = () => {
    if (windowStateSaved) return
    windowStateSaved = true
    if (!mainWindow.isDestroyed()) {
      if (!mainWindow.isMaximized()) {
        try {
          const [width, height] = mainWindow.getSize()
          const [x, y] = mainWindow.getPosition()
          currentState.width = width
          currentState.height = height
          currentState.x = x
          currentState.y = y
        } catch (e) {}
      }
      currentState.maximized = mainWindow.isMaximized()
    }
    saveWindowState(currentState)
  }

  mainWindow.on('resize', () => {
    const [width, height] = mainWindow.getSize()
    currentState.width = width
    currentState.height = height
    saveWindowState(currentState)
  })

  mainWindow.on('move', () => {
    const [x, y] = mainWindow.getPosition()
    currentState.x = x
    currentState.y = y
    saveWindowState(currentState)
  })

  mainWindow.on('maximize', () => {
    currentState.maximized = true
    saveWindowState(currentState)
  })

  mainWindow.on('unmaximize', () => {
    currentState.maximized = false
    saveWindowState(currentState)
  })

  mainWindow.on('close', (e) => {
    saveFinalState()
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
      const indexPath = getAssetPath('dist', 'index.html')
      console.log('加载生产页面:', indexPath)
      mainWindow.loadFile(indexPath).catch((err) => {
        console.error('loadFile 失败:', err)
        mainWindow.loadURL(ERROR_HTML)
      })
    } catch (err) {
      console.error('加载生产页面失败:', err)
      try {
        mainWindow.loadURL(ERROR_HTML)
      } catch (fallbackErr) {
        console.error('加载错误页面也失败:', fallbackErr)
      }
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
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
