import { useRef, useState, useEffect, type ReactElement } from 'react'
import { useAppStore } from '../../store'
import { OUTCOME_TYPE_CONFIG } from '../../types'
import type { Chapter, Branch } from '../../types'

type DragMode = 'node' | 'connect_branch' | 'new_branch' | 'marquee' | 'drag_selection' | null

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
  lastMoveX?: number
  lastMoveY?: number
}

const CHAPTER_WIDTH = 240
const CHAPTER_HEIGHT = 200

export default function StoryCanvas() {
  const chapters = useAppStore((s) => s.project.chapters)
  const selectedChapterId = useAppStore((s) => s.selectedChapterId)
  const selectedChapterIds = useAppStore((s) => s.selectedChapterIds)
  const selectedBranchId = useAppStore((s) => s.selectedBranchId)
  const setSelectedChapter = useAppStore((s) => s.setSelectedChapter)
  const setSelectedBranch = useAppStore((s) => s.setSelectedBranch)
  const toggleChapterSelection = useAppStore((s) => s.toggleChapterSelection)
  const clearChapterSelection = useAppStore((s) => s.clearChapterSelection)
  const selectAllChapters = useAppStore((s) => s.selectAllChapters)
  const moveSelectedChapters = useAppStore((s) => s.moveSelectedChapters)
  const duplicateSelectedChapters = useAppStore((s) => s.duplicateSelectedChapters)
  const alignSelectedChapters = useAppStore((s) => s.alignSelectedChapters)
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
      if (x >= ch.x && x <= ch.x + CHAPTER_WIDTH && y >= ch.y && y <= ch.y + CHAPTER_HEIGHT) {
        return ch
      }
    }
    return null
  }

  const findChaptersInRect = (x1: number, y1: number, x2: number, y2: number): string[] => {
    const minX = Math.min(x1, x2)
    const maxX = Math.max(x1, x2)
    const minY = Math.min(y1, y2)
    const maxY = Math.max(y1, y2)
    const result: string[] = []
    for (const ch of chapters) {
      const chLeft = ch.x
      const chRight = ch.x + CHAPTER_WIDTH
      const chTop = ch.y
      const chBottom = ch.y + CHAPTER_HEIGHT
      const overlaps = !(chRight < minX || chLeft > maxX || chBottom < minY || chTop > maxY)
      if (overlaps) {
        result.push(ch.id)
      }
    }
    return result
  }

  const handleChapterMouseDown = (e: React.MouseEvent, chapter: Chapter) => {
    e.stopPropagation()
    const target = e.target as HTMLElement
    if (target.closest('.branch-mini, .branch-drag-handle, button, input, .node-drag-handle')) return

    const isCtrlPressed = e.ctrlKey || e.metaKey
    const isSelected = selectedChapterIds.includes(chapter.id)

    if (isCtrlPressed) {
      toggleChapterSelection(chapter.id)
    } else if (!isSelected) {
      clearChapterSelection()
      setSelectedChapter(chapter.id)
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const coords = getCanvasCoords(e.clientX, e.clientY)
    const isMultiSelect = selectedChapterIds.length > 1 || (selectedChapterIds.includes(chapter.id) && selectedChapterIds.length > 0)

    if (isMultiSelect && selectedChapterIds.includes(chapter.id)) {
      setDrag({
        mode: 'drag_selection',
        chapterId: chapter.id,
        startX: coords.x,
        startY: coords.y,
        lastMoveX: coords.x,
        lastMoveY: coords.y
      })
    } else {
      setDrag({
        mode: 'node',
        chapterId: chapter.id,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top
      })
      if (!isCtrlPressed) {
        setSelectedChapter(chapter.id)
      }
    }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return
    e.stopPropagation()
    const coords = getCanvasCoords(e.clientX, e.clientY)
    setDrag({
      mode: 'marquee',
      startX: coords.x,
      startY: coords.y,
      currentX: coords.x,
      currentY: coords.y
    })
  }

  const handleNewBranchDragStart = (e: React.MouseEvent, chapter: Chapter) => {
    e.stopPropagation()
    const coords = getCanvasCoords(e.clientX, e.clientY)
    setDrag({
      mode: 'new_branch',
      chapterId: chapter.id,
      startX: chapter.x + CHAPTER_WIDTH,
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
      startX: chapter.x + CHAPTER_WIDTH,
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
      } else if (drag.mode === 'drag_selection' && drag.lastMoveX !== undefined && drag.lastMoveY !== undefined) {
        const dx = coords.x - drag.lastMoveX
        const dy = coords.y - drag.lastMoveY
        moveSelectedChapters(dx, dy)
        setDrag(prev => ({ ...prev, lastMoveX: coords.x, lastMoveY: coords.y }))
      } else if (drag.mode === 'marquee') {
        setDrag(prev => ({ ...prev, currentX: coords.x, currentY: coords.y }))
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
      } else if (drag.mode === 'marquee' && drag.startX !== undefined && drag.startY !== undefined && drag.currentX !== undefined && drag.currentY !== undefined) {
        const ids = findChaptersInRect(drag.startX, drag.startY, drag.currentX, drag.currentY)
        clearChapterSelection()
        if (ids.length > 0) {
          ids.forEach(id => toggleChapterSelection(id))
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
  }, [drag, chapters, updateChapter, addBranch, addChapter, updateBranch, moveSelectedChapters, clearChapterSelection, toggleChapterSelection])

  const handleAddBranch = (chapterId: string) => {
    if (newBranchText.trim()) {
      addBranch(chapterId, newBranchText.trim())
      setNewBranchText('')
      setShowAddBranch(null)
    }
  }

  const getMarqueeRect = () => {
    if (drag.mode !== 'marquee' || drag.startX === undefined || drag.startY === undefined || drag.currentX === undefined || drag.currentY === undefined) {
      return null
    }
    return {
      left: Math.min(drag.startX, drag.currentX),
      top: Math.min(drag.startY, drag.currentY),
      width: Math.abs(drag.currentX - drag.startX),
      height: Math.abs(drag.currentY - drag.startY)
    }
  }

  const marqueeRect = getMarqueeRect()
  const isMultiSelected = selectedChapterIds.length > 1
  const hasSelection = selectedChapterIds.length > 0

  const renderConnections = () => {
    const paths: ReactElement[] = []

    chapters.forEach((ch) => {
      ch.branches.forEach((br) => {
        if (!br.nextChapterId) return
        const target = chapterMap.get(br.nextChapterId)
        if (!target) return
        const x1 = ch.x + CHAPTER_WIDTH
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

  const toolbarButtonStyle: React.CSSProperties = {
    padding: '6px 12px',
    fontSize: '12px',
    border: '1px solid var(--border-light)',
    borderRadius: '6px',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s'
  }

  return (
    <div ref={containerRef} className="canvas-container" onMouseDown={handleCanvasMouseDown}>
      <svg className="connection-line" style={{ width: '3000px', height: '2000px', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#555566" />
          </marker>
        </defs>
        {renderConnections()}
      </svg>

      {marqueeRect && (
        <div
          style={{
            position: 'absolute',
            left: marqueeRect.left,
            top: marqueeRect.top,
            width: marqueeRect.width,
            height: marqueeRect.height,
            border: '1px dashed #8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            borderRadius: '2px',
            pointerEvents: 'none',
            zIndex: 20
          }}
        />
      )}

      {dropTarget && (
        <div
          style={{
            position: 'absolute',
            left: chapterMap.get(dropTarget)?.x ?? 0,
            top: chapterMap.get(dropTarget)?.y ?? 0,
            width: CHAPTER_WIDTH,
            height: CHAPTER_HEIGHT,
            border: '2px dashed #4a8b6b',
            borderRadius: 12,
            backgroundColor: 'rgba(74, 139, 107, 0.1)',
            pointerEvents: 'none',
            zIndex: 5
          }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 100,
          padding: '12px',
          background: 'rgba(20, 20, 30, 0.95)',
          border: '1px solid var(--border-light)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          minWidth: '240px',
          backdropFilter: 'blur(8px)'
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>多选操作</span>
          <span style={{ fontSize: '11px', color: hasSelection ? '#8b5cf6' : 'var(--text-muted)', fontWeight: 500 }}>
            已选中 {selectedChapterIds.length} 个章节
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            style={toolbarButtonStyle}
            onClick={selectAllChapters}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
          >
            全选
          </button>
          <button
            style={{ ...toolbarButtonStyle, opacity: hasSelection ? 1 : 0.5, cursor: hasSelection ? 'pointer' : 'not-allowed' }}
            onClick={clearChapterSelection}
            disabled={!hasSelection}
            onMouseEnter={(e) => { if (hasSelection) e.currentTarget.style.background = 'var(--bg-tertiary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
          >
            清除选择
          </button>
          <button
            style={{ ...toolbarButtonStyle, opacity: isMultiSelected ? 1 : 0.5, cursor: isMultiSelected ? 'pointer' : 'not-allowed' }}
            onClick={duplicateSelectedChapters}
            disabled={!isMultiSelected}
            onMouseEnter={(e) => { if (isMultiSelected) e.currentTarget.style.background = 'var(--bg-tertiary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
          >
            批量复制
          </button>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>对齐方式</div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {([
            { key: 'left' as const, label: '左对齐' },
            { key: 'right' as const, label: '右对齐' },
            { key: 'top' as const, label: '顶对齐' },
            { key: 'bottom' as const, label: '底对齐' },
            { key: 'horizontal' as const, label: '水平均匀' },
            { key: 'vertical' as const, label: '垂直均匀' }
          ]).map(({ key, label }) => (
            <button
              key={key}
              style={{
                ...toolbarButtonStyle,
                padding: '4px 8px',
                fontSize: '11px',
                opacity: isMultiSelected ? 1 : 0.5,
                cursor: isMultiSelected ? 'pointer' : 'not-allowed'
              }}
              onClick={() => alignSelectedChapters(key)}
              disabled={!isMultiSelected}
              onMouseEnter={(e) => { if (isMultiSelected) e.currentTarget.style.background = 'var(--bg-tertiary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {chapters.map((chapter) => {
        const isSelected = selectedChapterIds.includes(chapter.id)
        const isSingleSelected = selectedChapterId === chapter.id
        const hasSelectionBorder = isSelected || isSingleSelected

        return (
          <div
            key={chapter.id}
            className={`chapter-node ${isSingleSelected ? 'selected' : ''} ${chapter.isEnding ? 'ending' : ''} ${dropTarget === chapter.id ? 'animate-pulse-glow' : ''}`}
            style={{
              left: chapter.x,
              top: chapter.y,
              zIndex: hasSelectionBorder ? 10 : 1,
              ...(isSelected && !isSingleSelected ? {
                boxShadow: '0 0 0 2px #8b5cf6, 0 0 12px rgba(139, 92, 246, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)',
                outline: 'none',
                transform: 'translateZ(0)'
              } : {})
            }}
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
        )
      })}

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
