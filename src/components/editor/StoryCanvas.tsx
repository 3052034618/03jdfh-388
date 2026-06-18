import { useRef, useState, useEffect } from 'react'
import { useAppStore } from '../../store'
import { OUTCOME_TYPE_CONFIG } from '../../types'
import type { Chapter } from '../../types'

export default function StoryCanvas() {
  const chapters = useAppStore((s) => s.project.chapters)
  const selectedChapterId = useAppStore((s) => s.selectedChapterId)
  const selectedBranchId = useAppStore((s) => s.selectedBranchId)
  const setSelectedChapter = useAppStore((s) => s.setSelectedChapter)
  const setSelectedBranch = useAppStore((s) => s.setSelectedBranch)
  const updateChapter = useAppStore((s) => s.updateChapter)
  const addBranch = useAppStore((s) => s.addBranch)

  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null)
  const [showAddBranch, setShowAddBranch] = useState<string | null>(null)
  const [newBranchText, setNewBranchText] = useState('')

  const handleMouseDown = (e: React.MouseEvent, chapter: Chapter) => {
    if ((e.target as HTMLElement).closest('.branch-mini, button, input')) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setDragging({
      id: chapter.id,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    })
    setSelectedChapter(chapter.id)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging || !containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const newX = e.clientX - containerRect.left - dragging.offsetX + containerRef.current.scrollLeft
      const newY = e.clientY - containerRect.top - dragging.offsetY + containerRef.current.scrollTop
      updateChapter(dragging.id, { x: Math.max(0, newX), y: Math.max(0, newY) })
    }

    const handleMouseUp = () => {
      setDragging(null)
    }

    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, updateChapter])

  const handleAddBranch = (chapterId: string) => {
    if (newBranchText.trim()) {
      addBranch(chapterId, newBranchText.trim())
      setNewBranchText('')
      setShowAddBranch(null)
    }
  }

  const chapterMap = new Map(chapters.map((ch) => [ch.id, ch]))

  return (
    <div ref={containerRef} className="canvas-container">
      <svg className="connection-line" style={{ width: '3000px', height: '2000px', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#555566" />
          </marker>
        </defs>
        {chapters.map((ch) =>
          ch.branches.map((br) => {
            if (!br.nextChapterId) return null
            const target = chapterMap.get(br.nextChapterId)
            if (!target) return null
            const x1 = ch.x + 240
            const y1 = ch.y + 80
            const x2 = target.x
            const y2 = target.y + 60
            const midX = (x1 + x2) / 2
            const color = OUTCOME_TYPE_CONFIG[br.outcomeType].borderColor
            return (
              <path
                key={br.id}
                d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                stroke={color}
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrowhead)"
                opacity={0.7}
              />
            )
          })
        )}
      </svg>

      {chapters.map((chapter) => (
        <div
          key={chapter.id}
          className={`chapter-node ${selectedChapterId === chapter.id ? 'selected' : ''} ${chapter.isEnding ? 'ending' : ''}`}
          style={{ left: chapter.x, top: chapter.y }}
          onMouseDown={(e) => handleMouseDown(e, chapter)}
        >
          <div className="chapter-node-header">
            <span className="chapter-node-title">
              {chapter.isEnding && '🏁 '}
              {chapter.sceneName || '未命名'}
            </span>
            <span className="chapter-node-curse">诅咒 {chapter.currentCurseLevel}</span>
          </div>
          <div className="chapter-node-body">
            {chapter.narrativeText ? (
              <div className="chapter-node-text">{chapter.narrativeText}</div>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>暂无剧情文本</div>
            )}

            <div className="chapter-node-branches">
              {chapter.branches.map((branch) => (
                <div
                  key={branch.id}
                  className={`branch-mini ${branch.outcomeType} ${selectedBranchId === branch.id && selectedChapterId === chapter.id ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedChapter(chapter.id)
                    setSelectedBranch(branch.id)
                  }}
                  style={{ cursor: 'pointer', border: selectedBranchId === branch.id && selectedChapterId === chapter.id ? '1px solid var(--accent-blood)' : undefined }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ flex: 1 }}>{branch.choiceText || '未命名选择'}</span>
                    <span style={{
                      fontSize: '10px',
                      color: OUTCOME_TYPE_CONFIG[branch.outcomeType].color,
                      marginLeft: '8px',
                      fontWeight: '600'
                    }}>
                      {branch.curseDelta >= 0 ? '+' : ''}{branch.curseDelta}
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {OUTCOME_TYPE_CONFIG[branch.outcomeType].label}
                    {branch.nextChapterId ? ' → 有后续' : ' · 未收束'}
                  </div>
                </div>
              ))}

              {showAddBranch === chapter.id ? (
                <div style={{ marginTop: '8px' }}>
                  <input
                    className="form-input"
                    placeholder="输入选择内容，如：烧掉照片"
                    value={newBranchText}
                    onChange={(e) => setNewBranchText(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddBranch(chapter.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <button
                      className="btn btn-primary btn-small"
                      style={{ flex: 1 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddBranch(chapter.id)
                      }}
                    >
                      添加
                    </button>
                    <button
                      className="btn btn-secondary btn-small"
                      style={{ flex: 1 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowAddBranch(null)
                        setNewBranchText('')
                      }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                !chapter.isEnding && (
                  <button
                    className="btn btn-ghost btn-small"
                    style={{ justifyContent: 'center', width: '100%', marginTop: '4px' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowAddBranch(chapter.id)
                    }}
                  >
                    + 添加分支
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
