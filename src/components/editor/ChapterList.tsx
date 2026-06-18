import { useAppStore } from '../../store'
import type { Chapter } from '../../types'

export default function ChapterList() {
  const chapters = useAppStore((s) => s.project.chapters)
  const selectedChapterId = useAppStore((s) => s.selectedChapterId)
  const setSelectedChapter = useAppStore((s) => s.setSelectedChapter)
  const duplicateChapter = useAppStore((s) => s.duplicateChapter)
  const deleteChapter = useAppStore((s) => s.deleteChapter)

  const getChapterStatus = (ch: Chapter) => {
    if (ch.isEnding) return '结局'
    if (ch.branches.length === 0) return '无分支'
    const unresolved = ch.branches.filter((b) => !b.nextChapterId).length
    if (unresolved > 0) return `${unresolved} 条未收束`
    return `${ch.branches.length} 条分支`
  }

  return (
    <div>
      {chapters.length === 0 ? (
        <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
          暂无章节，点击上方"新建"创建
        </div>
      ) : (
        chapters.map((chapter, index) => (
          <div
            key={chapter.id}
            className={`chapter-list-item ${selectedChapterId === chapter.id ? 'active' : ''}`}
            onClick={() => setSelectedChapter(chapter.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="chapter-list-item-title">
                  {index + 1}. {chapter.sceneName || '未命名章节'}
                </div>
                <div className="chapter-list-item-meta">
                  <span>{getChapterStatus(chapter)}</span>
                  <span>诅咒 {chapter.currentCurseLevel}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  className="btn btn-ghost btn-small"
                  onClick={(e) => {
                    e.stopPropagation()
                    duplicateChapter(chapter.id)
                  }}
                  title="复制章节"
                >
                  📋
                </button>
                <button
                  className="btn btn-ghost btn-small"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`确定删除章节"${chapter.sceneName}"？`)) {
                      deleteChapter(chapter.id)
                    }
                  }}
                  title="删除章节"
                >
                  🗑
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
