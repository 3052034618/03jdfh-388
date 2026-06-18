import { useState } from 'react'
import { useAppStore } from '../../store'
import type { Chapter } from '../../types'

interface Props {
  chapter: Chapter
}

export default function ChapterEditor({ chapter }: Props) {
  const updateChapter = useAppStore((s) => s.updateChapter)
  const setSelectedBranch = useAppStore((s) => s.setSelectedBranch)
  const deleteBranch = useAppStore((s) => s.deleteBranch)
  const addBranch = useAppStore((s) => s.addBranch)
  const [newItem, setNewItem] = useState('')
  const [showAddBranch, setShowAddBranch] = useState(false)
  const [newBranchText, setNewBranchText] = useState('')

  const handleAddKeyItem = () => {
    if (newItem.trim()) {
      updateChapter(chapter.id, { keyItems: [...chapter.keyItems, newItem.trim()] })
      setNewItem('')
    }
  }

  const handleRemoveKeyItem = (index: number) => {
    updateChapter(chapter.id, {
      keyItems: chapter.keyItems.filter((_, i) => i !== index)
    })
  }

  const handleAddBranch = () => {
    if (newBranchText.trim()) {
      addBranch(chapter.id, newBranchText.trim())
      setNewBranchText('')
      setShowAddBranch(false)
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div className="property-section">
        <div className="property-section-title">📖 章节信息</div>

        <div className="form-group">
          <label className="form-label">场景名称</label>
          <input
            className="form-input"
            value={chapter.sceneName}
            onChange={(e) => updateChapter(chapter.id, { sceneName: e.target.value })}
            placeholder="例如：第一章：归来"
          />
        </div>

        <div className="form-group">
          <label className="form-label">恐惧氛围</label>
          <input
            className="form-input"
            value={chapter.fearAtmosphere}
            onChange={(e) => updateChapter(chapter.id, { fearAtmosphere: e.target.value })}
            placeholder="例如：压抑 · 陌生 · 回忆"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">当前诅咒等级</label>
            <input
              type="number"
              className="form-input"
              value={chapter.currentCurseLevel}
              onChange={(e) => updateChapter(chapter.id, { currentCurseLevel: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">是否为结局</label>
            <select
              className="form-select"
              value={chapter.isEnding ? 'yes' : 'no'}
              onChange={(e) => {
                const isEnding = e.target.value === 'yes'
                updateChapter(chapter.id, { isEnding, endingType: isEnding ? 'neutral' : undefined })
              }}
            >
              <option value="no">否</option>
              <option value="yes">是</option>
            </select>
          </div>
        </div>

        {chapter.isEnding && (
          <>
            <div className="form-group">
              <label className="form-label">结局类型</label>
              <select
                className="form-select"
                value={chapter.endingType || 'neutral'}
                onChange={(e) => updateChapter(chapter.id, { endingType: e.target.value as any })}
              >
                <option value="good">好结局</option>
                <option value="neutral">普通结局</option>
                <option value="bad">坏结局</option>
                <option value="death">死亡结局</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">结局描述</label>
              <textarea
                className="form-textarea"
                value={chapter.endingDescription || ''}
                onChange={(e) => updateChapter(chapter.id, { endingDescription: e.target.value })}
                placeholder="描述这个结局的详细说明..."
                rows={4}
              />
            </div>
          </>
        )}

        <div className="form-group">
          <label className="form-label">剧情文本</label>
          <textarea
            className="form-textarea"
            value={chapter.narrativeText}
            onChange={(e) => updateChapter(chapter.id, { narrativeText: e.target.value })}
            placeholder="描述这个场景发生的故事..."
            rows={6}
          />
        </div>

        <div className="form-group">
          <label className="form-label">关键道具</label>
          <div className="tags-container">
            {chapter.keyItems.map((item, i) => (
              <span key={i} className="tag">
                {item}
                <span className="tag-remove" onClick={() => handleRemoveKeyItem(i)}>
                  ✕
                </span>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            <input
              className="form-input"
              placeholder="添加道具"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddKeyItem()}
            />
            <button className="btn btn-secondary btn-small" onClick={handleAddKeyItem}>
              添加
            </button>
          </div>
        </div>
      </div>

      <div className="property-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span className="property-section-title" style={{ marginBottom: 0 }}>🔀 分支选择</span>
          {!chapter.isEnding && (
            <button className="btn btn-primary btn-small" onClick={() => setShowAddBranch(true)}>
              + 添加分支
            </button>
          )}
        </div>

        {showAddBranch && (
          <div style={{ marginBottom: '12px' }}>
            <input
              className="form-input"
              placeholder="玩家选择的内容..."
              value={newBranchText}
              onChange={(e) => setNewBranchText(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAddBranch()}
            />
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <button className="btn btn-primary btn-small" style={{ flex: 1 }} onClick={handleAddBranch}>
                添加
              </button>
              <button
                className="btn btn-secondary btn-small"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowAddBranch(false)
                  setNewBranchText('')
                }}
              >
                取消
              </button>
            </div>
          </div>
        )}

        {chapter.branches.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
            {chapter.isEnding ? '结局章节无分支' : '暂无分支，点击上方按钮添加'}
          </div>
        ) : (
          chapter.branches.map((branch, index) => (
            <div
              key={branch.id}
              className="branch-card"
              onClick={() => setSelectedBranch(branch.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="branch-card-header">
                <span className="branch-card-title">
                  {index + 1}. {branch.choiceText || '未命名选择'}
                </span>
                <span
                  className="outcome-badge"
                  style={{
                    background: branch.outcomeType === 'normal' ? 'rgba(80,80,100,0.5)' :
                      branch.outcomeType === 'mild_mutation' ? 'rgba(184, 134, 11, 0.3)' :
                      branch.outcomeType === 'irreversible_pollution' ? 'rgba(139, 0, 0, 0.4)' :
                      'rgba(50,50,60,0.8)',
                    color: branch.outcomeType === 'normal' ? '#ccc' :
                      branch.outcomeType === 'mild_mutation' ? '#ffd700' :
                      branch.outcomeType === 'irreversible_pollution' ? '#ff6b6b' :
                      '#999'
                  }}
                >
                  {branch.outcomeType === 'normal' ? '正常' :
                    branch.outcomeType === 'mild_mutation' ? '异变' :
                    branch.outcomeType === 'irreversible_pollution' ? '污染' :
                    '死亡'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                诅咒变化: <span style={{ color: branch.curseDelta >= 0 ? 'var(--accent-warning)' : 'var(--accent-success)' }}>
                  {branch.curseDelta >= 0 ? '+' : ''}{branch.curseDelta}
                </span>
              </div>
              {branch.notes && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {branch.notes}
                </div>
              )}
              <div className="branch-card-footer">
                <button
                  className="btn btn-danger btn-small"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('确定删除此分支？')) deleteBranch(chapter.id, branch.id)
                  }}
                >
                  删除
                </button>
                <button
                  className="btn btn-secondary btn-small"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedBranch(branch.id)
                  }}
                >
                  编辑详情
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
