import { useState } from 'react'
import { useAppStore } from '../store'
import ChapterList from '../components/editor/ChapterList'
import StoryCanvas from '../components/editor/StoryCanvas'
import ChapterEditor from '../components/editor/ChapterEditor'
import BranchEditor from '../components/editor/BranchEditor'
import RulesPanel from '../components/editor/RulesPanel'

export default function EditorPage() {
  const selectedChapterId = useAppStore((s) => s.selectedChapterId)
  const selectedBranchId = useAppStore((s) => s.selectedBranchId)
  const project = useAppStore((s) => s.project)
  const addChapter = useAppStore((s) => s.addChapter)
  const [showNewChapter, setShowNewChapter] = useState(false)
  const [newChapterName, setNewChapterName] = useState('')

  const handleCreateChapter = () => {
    if (newChapterName.trim()) {
      addChapter(newChapterName.trim())
      setNewChapterName('')
      setShowNewChapter(false)
    }
  }

  const selectedChapter = project.chapters.find((ch) => ch.id === selectedChapterId)
  const selectedBranch = selectedChapter?.branches.find((br) => br.id === selectedBranchId)

  return (
    <div className="editor-page">
      <div className="sidebar-left">
        <div className="sidebar-header">
          <span className="sidebar-title">📚 章节列表</span>
          <button className="btn btn-primary btn-small" onClick={() => setShowNewChapter(true)}>
            + 新建
          </button>
        </div>

        {showNewChapter && (
          <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>
            <input
              className="form-input"
              placeholder="输入场景名称..."
              value={newChapterName}
              onChange={(e) => setNewChapterName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateChapter()}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button className="btn btn-primary btn-small" onClick={handleCreateChapter} style={{ flex: 1 }}>
                创建
              </button>
              <button
                className="btn btn-secondary btn-small"
                onClick={() => {
                  setShowNewChapter(false)
                  setNewChapterName('')
                }}
                style={{ flex: 1 }}
              >
                取消
              </button>
            </div>
          </div>
        )}

        <div className="sidebar-content">
          <ChapterList />
          <RulesPanel />
        </div>
      </div>

      <div className="canvas-container">
        <StoryCanvas />
      </div>

      <div className="sidebar-right">
        {selectedBranch && selectedChapter ? (
          <BranchEditor chapter={selectedChapter} branch={selectedBranch} />
        ) : selectedChapter ? (
          <ChapterEditor chapter={selectedChapter} />
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">✍️</div>
            <div className="empty-state-text">选择一个章节或分支进行编辑</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              在左侧列表点击章节，或在画布中拖拽移动
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
