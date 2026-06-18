import { useEffect, useRef } from 'react'
import { useAppStore } from './store'
import EditorPage from './pages/EditorPage'
import ValidatorPage from './pages/ValidatorPage'
import PlaythroughPage from './pages/PlaythroughPage'
import { loadSampleProject } from './utils/sampleData'

const CURRENT_PAGE_STORAGE_KEY = 'story_planner_currentPage'
const PROJECT_STORAGE_KEY = 'curseweaver-project'
type PageType = 'editor' | 'validator' | 'playthrough'

function App() {
  const currentPage = useAppStore((s) => s.currentPage)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)
  const loadProject = useAppStore((s) => s.loadProject)
  const getProjectForSave = useAppStore((s) => s.getProjectForSave)

  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    let projectToLoad
    const savedProjectStr = localStorage.getItem(PROJECT_STORAGE_KEY)
    if (savedProjectStr) {
      try {
        projectToLoad = JSON.parse(savedProjectStr)
      } catch (e) {
        console.error('解析保存的项目失败:', e)
        projectToLoad = loadSampleProject()
      }
    } else {
      projectToLoad = loadSampleProject()
    }
    loadProject(projectToLoad)

    setTimeout(() => {
      const savedPage = localStorage.getItem(CURRENT_PAGE_STORAGE_KEY) as PageType | null
      const project = useAppStore.getState().project
      if (savedPage && (savedPage === 'editor' || savedPage === 'validator' || savedPage === 'playthrough')) {
        setCurrentPage(savedPage)
      } else if (project.uiState?.currentPage) {
        setCurrentPage(project.uiState.currentPage)
      }
    }, 0)
  }, [])

  useEffect(() => {
    if (!initializedRef.current) return
    localStorage.setItem(CURRENT_PAGE_STORAGE_KEY, currentPage)
    const state = useAppStore.getState()
    state.project.uiState = {
      ...state.project.uiState,
      currentPage
    }
  }, [currentPage])

  const handleSave = async () => {
    if ((window as any).electronAPI) {
      const data = getProjectForSave()
      const result = await (window as any).electronAPI.saveProject(data)
      if (result.success) {
        console.log('保存成功:', result.path)
      }
    } else {
      const data = getProjectForSave()
      localStorage.setItem('curseweaver-project', JSON.stringify(data))
      console.log('已保存到本地存储')
    }
  }

  const handleLoad = async () => {
    if ((window as any).electronAPI) {
      const result = await (window as any).electronAPI.loadProject()
      if (result.success) {
        loadProject(result.data)
      }
    } else {
      const saved = localStorage.getItem('curseweaver-project')
      if (saved) {
        loadProject(JSON.parse(saved))
      }
    }
  }

  return (
    <div className="app-container">
      <div className="top-bar">
        <div className="app-title">
          <div className="app-title-icon">☠</div>
          <span>CurseWeaver · 分支诅咒剧情编排器</span>
        </div>
        <div className="top-bar-actions">
          <button className="btn btn-secondary btn-small" onClick={handleLoad}>
            📂 加载项目
          </button>
          <button className="btn btn-primary btn-small" onClick={handleSave}>
            💾 保存项目
          </button>
        </div>
      </div>

      <div className="nav-tabs">
        <button
          className={`nav-tab ${currentPage === 'editor' ? 'active' : ''}`}
          onClick={() => setCurrentPage('editor')}
        >
          🖋 剧情编排
        </button>
        <button
          className={`nav-tab ${currentPage === 'validator' ? 'active' : ''}`}
          onClick={() => setCurrentPage('validator')}
        >
          🔍 断点检查
        </button>
        <button
          className={`nav-tab ${currentPage === 'playthrough' ? 'active' : ''}`}
          onClick={() => setCurrentPage('playthrough')}
        >
          🎮 试玩阅读
        </button>
      </div>

      <div className="page-content">
        {currentPage === 'editor' && <EditorPage />}
        {currentPage === 'validator' && <ValidatorPage />}
        {currentPage === 'playthrough' && <PlaythroughPage />}
      </div>
    </div>
  )
}

export default App
