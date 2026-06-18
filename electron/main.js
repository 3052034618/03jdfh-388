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

const getRecentProjectPath = () => {
  return path.join(app.getPath('userData'), 'recent-project.json')
}

const loadRecentProjectInfo = () => {
  try {
    const projectPath = getRecentProjectPath()
    if (fs.existsSync(projectPath)) {
      const data = fs.readFileSync(projectPath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (err) {
    console.error('读取最近项目信息失败:', err)
  }
  return null
}

const saveRecentProjectInfo = (info) => {
  try {
    const projectPath = getRecentProjectPath()
    fs.writeFileSync(projectPath, JSON.stringify(info, null, 2), 'utf-8')
  } catch (err) {
    console.error('保存最近项目信息失败:', err)
  }
}

const getAssetPath = (...paths) => {
  return path.join(app.getAppPath(), ...paths)
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

const ERROR_HTML_FALLBACK = `data:text/html;charset=utf-8,` + encodeURIComponent(
  `<!DOCTYPE html>
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
      max-width: 500px;
    }
    .icon { font-size: 64px; margin-bottom: 20px; }
    .title { font-size: 24px; margin-bottom: 12px; color: #ff6b6b; }
    .desc { font-size: 14px; color: #a0a0b0; margin-bottom: 16px; line-height: 1.8; }
    .error-detail {
      font-size: 12px;
      color: #6b6b80;
      background: #15151f;
      padding: 12px;
      border-radius: 6px;
      text-align: left;
      word-break: break-all;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚠️</div>
    <div class="title">应用启动失败</div>
    <div class="desc">
      页面资源加载失败，请尝试重启应用。<br>
      如果问题持续存在，请重新安装或联系开发者。
    </div>
    <div class="error-detail" id="errorInfo">请查看应用控制台日志获取详细错误信息。</div>
  </div>
</body>
</html>`
)

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

  if (!app.isPackaged) {
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.log('页面加载失败:', errorCode, errorDescription)
      if (errorCode !== -3) {
        loadDevURL(mainWindow)
      }
    })
    loadDevURL(mainWindow)
    mainWindow.webContents.openDevTools()
  } else {
    const indexPath = getAssetPath('dist', 'index.html')
    console.log('Loading production page from:', indexPath)
    mainWindow.loadFile(indexPath).then(() => {
      console.log('Production page loaded successfully')
    }).catch((err) => {
      console.error('loadFile failed with error:', err)
      console.error('Attempted path:', indexPath)
      console.error('app.getAppPath():', app.getAppPath())
      try {
        const dirToCheck = path.dirname(indexPath)
        if (fs.existsSync(dirToCheck)) {
          const files = fs.readdirSync(dirToCheck)
          console.error('Directory contents:', files)
        } else {
          console.error('Directory does not exist:', dirToCheck)
        }
      } catch (checkErr) {
        console.error('Error checking directory:', checkErr)
      }
      mainWindow.loadURL(ERROR_HTML_FALLBACK)
    })
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
    const fileName = path.basename(result.filePath)
    saveRecentProjectInfo({
      filePath: result.filePath,
      projectFileName: fileName,
      lastOpenedAt: Date.now()
    })
    return { success: true, path: result.filePath, fileName }
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
    const fileName = path.basename(result.filePaths[0])
    saveRecentProjectInfo({
      filePath: result.filePaths[0],
      projectFileName: fileName,
      lastOpenedAt: Date.now()
    })
    return { success: true, data: JSON.parse(content), path: result.filePaths[0], fileName }
  }
  return { success: false }
})

ipcMain.handle('save-recent-project', async (event, filePath, fileName) => {
  try {
    saveRecentProjectInfo({
      filePath,
      projectFileName: fileName,
      lastOpenedAt: Date.now()
    })
    return { success: true }
  } catch (err) {
    console.error('save-recent-project error:', err)
    return { success: false, error: err.message }
  }
})

ipcMain.handle('get-recent-project', async () => {
  try {
    const info = loadRecentProjectInfo()
    return { success: true, data: info }
  } catch (err) {
    console.error('get-recent-project error:', err)
    return { success: false, error: err.message }
  }
})

ipcMain.handle('load-recent-project', async () => {
  try {
    const info = loadRecentProjectInfo()
    if (!info || !info.filePath) {
      return { success: false, reason: 'no-recent-project' }
    }
    if (!fs.existsSync(info.filePath)) {
      return { success: false, reason: 'file-not-found', data: info }
    }
    const content = fs.readFileSync(info.filePath, 'utf-8')
    return {
      success: true,
      data: JSON.parse(content),
      path: info.filePath,
      fileName: info.projectFileName
    }
  } catch (err) {
    console.error('load-recent-project error:', err)
    return { success: false, error: err.message }
  }
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
