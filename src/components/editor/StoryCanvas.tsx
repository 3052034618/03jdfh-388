import { useRef, useState, useEffect, type ReactElement } from 'react'
import { useAppStore } from '../../store'
import { OUTCOME_TYPE_CONFIG } from '../../types'
import type { Chapter, Branch } from '../../types'

type DragMode = 'node' | 'connect_branch' | 'new_branch' | null

interface DragState {
  mode: DragMode
  chapterId?: string
  branchId?: string
  offsetX?: number
  offsetY?: number
  startX?: number
  startY?: number
  currentX?: number
  currentY?: number
}

export default function StoryCanvas() {
  const chapters = useAppStore((s) => s.project.chapters)
  const selectedChapterId = useAppStore((s) => s.selectedChapterId)
  const selectedBranchId = useAppStore((s) => s.selectedBranchId)
  const setSelectedChapter = useAppStore((s) => s.setSelectedChapter)
  const setSelectedBranch = useAppStore((s) => s.setSelectedBranch)
  const updateChapter = useAppStore((s) => s.updateChapter)
  const updateBranch = useAppStore((s) => s.updateBranch)
  const addBranch = useAppStore((s) => s.addBranch)
  const addChapter = useAppStore((s) => s.addChapter)

  const containerRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragState>({ mode: null })
  const [showAddBranch, setShowAddBranch] = useState<string | null>(null)
  const [newBranchText, setNewBranchText] = useState('')
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    return {
      x: clientX - rect.left + containerRef.current.scrollLeft,
      y: clientY - rect.top + containerRef.current.scrollTop
    }
  }

  const chapterMap = new Map(chapters.map((ch) => [ch.id, ch]))

  const findChapterAt = (x: number, y: number): Chapter | null => {
    for (let i = chapters.length - 1; i >= 0; i--) {
      const ch = chapters[i]
      if (x >= ch.x && x <= ch.x + 240 && y >= ch.y && y <= ch.y + 200) {
        return ch
      }
    }
    return null
  }

  const handleChapterMouseDown = (e: React.MouseEvent, chapter: Chapter) => {
    e.stopPropagation()
    const target = e.target as HTMLElement
    if (target.closest('.branch-mini, .branch-drag-handle, button, input, .node-drag-handle')) return

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setDrag({
      mode: 'node',
      chapterId: chapter.id,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    })
    setSelectedChapter(chapter.id)
  }

  const handleNewBranchDragStart = (e: React.MouseEvent, chapter: Chapter) => {
    e.stopPropagation()
    const coords = getCanvasCoords(e.clientX, e.clientY)
    setDrag({
      mode: 'new_branch',
      chapterId: chapter.id,
      startX: chapter.x + 240,
      startY: chapter.y + 80,
      currentX: coords.x,
      currentY: coords.y
    })
    setSelectedChapter(chapter.id)
  }

  const handleBranchConnectStart = (e: React.MouseEvent, chapter: Chapter, branch: Branch) => {
    e.stopPropagation()
    const coords = getCanvasCoords(e.clientX, e.clientY)
    setDrag({
      mode: 'connect_branch',
      chapterId: chapter.id,
      branchId: branch.id,
      startX: chapter.x + 240,
      startY: chapter.y + 80,
      currentX: coords.x,
      currentY: coords.y
    })
    setSelectedChapter(chapter.id)
    setSelectedBranch(branch.id)
  }

  useEffect(() => {
    if (!drag.mode) return

    const handleMouseMove = (e: MouseEvent) => {
      const coords = getCanvasCoords(e.clientX, e.clientY)

      if (drag.mode === 'node' && drag.chapterId && drag.offsetX !== undefined && drag.offsetY !== undefined) {
        updateChapter(drag.chapterId, {
          x: Math.max(0, coords.x - drag.offsetX),
          y: Math.max(0, coords.y - drag.offsetY)
        })
      } else if (drag.mode === 'new_branch' || drag.mode === 'connect_branch') {
        setDrag(prev => ({ ...prev, currentX: coords.x, currentY: coords.y }))
        const target = findChapterAt(coords.x, coords.y)
        if (target && target.id !== drag.chapterId) {
          setDropTarget(target.id)
        } else {
          setDropTarget(null)
        }
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      const coords = getCanvasCoords(e.clientX, e.clientY)

      if (drag.mode === 'new_branch' && drag.chapterId) {
        const target = findChapterAt(coords.x, coords.y)
        if (target && target.id !== drag.chapterId) {
          const defaultText = `前往${target.sceneName || '下一章节'}`
          addBranch(drag.chapterId, defaultText, target.id)
        } else {
          const newChapterName = `新章节 ${chapters.length + 1}`
          const newX = Math.max(0, coords.x - 120)
          const newY = Math.max(0, coords.y - 50)
          addChapter(newChapterName, newX, newY)
          setTimeout(() => {
            const state = useAppStore.getState()
            const latestChapter = state.project.chapters[state.project.chapters.length - 1]
            if (latestChapter && drag.chapterId) {
              addBranch(drag.chapterId!, '新的选择', latestChapter.id)
            }
          }, 50)
        }
      } else if (drag.mode === 'connect_branch' && drag.chapterId && drag.branchId) {
        const target = findChapterAt(coords.x, coords.y)
        if (target && target.id !== drag.chapterId) {
          updateBranch(drag.chapterId, drag.branchId, { nextChapterId: target.id })
        }
      }

      setDrag({ mode: null })
      setDropTarget(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [drag, chapters, updateChapter, addBranch, addChapter, updateBranch])

  const handleAddBranch = (chapterId: string) => {
    if (newBranchText.trim()) {
      addBranch(chapterId, newBranchText.trim())
      setNewBranchText('')
      setShowAddBranch(null)
    }
  }

  const renderConnections = () => {
    const paths: ReactElement[] = []

    chapters.forEach((ch) => {
      ch.branches.forEach((br) => {
        if (!br.nextChapterId) return
        const target = chapterMap.get(br.nextChapterId)
        if (!target) return
        const x1 = ch.x + 240
        const y1 = ch.y + 80
        const x2 = target.x
        const y2 = target.y + 60
        const midX = (x1 + x2) / 2
        const color = OUTCOME_TYPE_CONFIG[br.outcomeType].borderColor
        const isSelected = selectedBranchId === br.id && selectedChapterId === ch.id

        paths.push(
          <path
            key={br.id}
            d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
            stroke={color}
            strokeWidth={isSelected ? 3 : 2}
            fill="none"
            markerEnd="url(#arrowhead)"
            opacity={isSelected ? 1 : 0.7}
            style={{ filter: isSelected ? `drop-shadow(0 0 6px ${color})` : 'none' }}
          />
        )
      })
    })

    if ((drag.mode === 'new_branch' || drag.mode === 'connect_branch') && drag.startX !== undefined && drag.startY !== undefined && drag.currentX !== undefined && drag.currentY !== undefined) {
      const midX = (drag.startX + drag.currentX) / 2
      paths.push(
        <path
          key="drag-line"
          d={`M ${drag.startX} ${drag.startY} C ${midX} ${drag.startY}, ${midX} ${drag.currentY}, ${drag.currentX} ${drag.currentY}`}
          stroke={dropTarget ? '#4a8b6b' : '#8b0000'}
          strokeWidth={3}
          strokeDasharray="8 4"
          fill="none"
          opacity={0.9}
          style={{ pointerEvents: 'none' }}
        />
      )
    }

    return paths
  }

  return (
    <div ref={containerRef} className="canvas-container">
      <svg className="connection-line" style={{ width: '3000px', height: '2000px', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#555566" />
          </marker>
        </defs>
        {renderConnections()}
      </svg>

      {dropTarget && (
        <div
          style={{
            position: 'absolute',
            left: chapterMap.get(dropTarget)?.x ?? 0,
            top: chapterMap.get(dropTarget)?.y ?? 0,
            width: 240,
            height: 200,
            border: '2px dashed #4a8b6b',
            borderRadius: 12,
            backgroundColor: 'rgba(74, 139, 107, 0.1)',
            pointerEvents: 'none',
            zIndex: 5
          }}
        />
      )}

      {chapters.map((chapter) => (
        <div
          key={chapter.id}
          className={`chapter-node ${selectedChapterId === chapter.id ? 'selected' : ''} ${chapter.isEnding ? 'ending' : ''} ${dropTarget === chapter.id ? 'animate-pulse-glow' : ''}`}
          style={{ left: chapter.x, top: chapter.y, zIndex: selectedChapterId === chapter.id ? 10 : 1 }}
          onMouseDown={(e) => handleChapterMouseDown(e, chapter)}
        >
          {!chapter.isEnding && (
            <div
              className="node-drag-handle"
              onMouseDown={(e) => handleNewBranchDragStart(e, chapter)}
              title="拖拽拉出创建新分支"
              style={{
                position: 'absolute',
                right: -10,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 20,
                height: 40,
                background: 'linear-gradient(90deg, var(--bg-card), var(--accent-blood))',
                borderRadius: '0 6px 6px 0',
                cursor: 'crosshair',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 14,
                fontWeight: 'bold',
                zIndex: 2
              }}
            >
              +
            </div>
          )}

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
                  className={`branch-mini ${branch.outcomeType}`}
                  style={{
                    cursor: 'pointer',
                    border: selectedBranchId === branch.id && selectedChapterId === chapter.id ? '1px solid var(--accent-blood)' : undefined,
                    position: 'relative'
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedChapter(chapter.id)
                    setSelectedBranch(branch.id)
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ flex: 1 }}>{branch.choiceText || '未命名选择'}</span>
                    <div
                      className="branch-drag-handle"
                      onMouseDown={(e) => handleBranchConnectStart(e, chapter, branch)}
                      title="拖拽连接到目标章节"
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: branch.nextChapterId ? OUTCOME_TYPE_CONFIG[branch.outcomeType].borderColor : 'var(--bg-tertiary)',
                        border: '1px solid var(--border-light)',
                        cursor: 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        marginLeft: 8
                      }}
                    >
                      →
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      {OUTCOME_TYPE_CONFIG[branch.outcomeType].label}
                    </span>
                    <span style={{
                      color: OUTCOME_TYPE_CONFIG[branch.outcomeType].color,
                      fontWeight: 600
                    }}>
                      {branch.curseDelta >= 0 ? '+' : ''}{branch.curseDelta}
                      {branch.nextChapterId ? ' · 已连接' : ' · 拖拽连接 →'}
                    </span>
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
                    + 添加分支（也可从右侧 + 拖拽拉出）
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      ))}

      {chapters.length === 0 && (
        <div className="empty-state" style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 400 }}>
          <div className="empty-state-icon">🖋</div>
          <div className="empty-state-text">开始构建你的恐怖故事</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            点击左侧"新建"创建第一个章节，或双击空白处创建
          </div>
        </div>
      )}
    </div>
  )
}
