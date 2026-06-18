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
      preload: path.join(__dirname, 'preload.js')
    }
  })

  if (windowState.maximized) {
    mainWindow.maximize()
  }

  let currentState = { ...windowState }

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

  mainWindow.on('close', () => {
    if (!mainWindow.isMaximized()) {
      const [width, height] = mainWindow.getSize()
      const [x, y] = mainWindow.getPosition()
      currentState.width = width
      currentState.height = height
      currentState.x = x
      currentState.y = y
    }
    currentState.maximized = mainWindow.isMaximized()
    saveWindowState(currentState)
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
