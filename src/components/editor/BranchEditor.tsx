import { useState } from 'react'
import { useAppStore } from '../../store'
import type { Chapter, Branch, BranchOutcomeType } from '../../types'
import { OUTCOME_TYPE_CONFIG } from '../../types'

interface Props {
  chapter: Chapter
  branch: Branch
}

export default function BranchEditor({ chapter, branch }: Props) {
  const project = useAppStore((s) => s.project)
  const updateBranch = useAppStore((s) => s.updateBranch)
  const setSelectedBranch = useAppStore((s) => s.setSelectedBranch)
  const [newSymbol, setNewSymbol] = useState('')

  const handleAddSymbol = () => {
    if (newSymbol.trim() && !branch.symbols.includes(newSymbol.trim())) {
      updateBranch(chapter.id, branch.id, { symbols: [...branch.symbols, newSymbol.trim()] })
      setNewSymbol('')
    }
  }

  const handleRemoveSymbol = (s: string) => {
    updateBranch(chapter.id, branch.id, {
      symbols: branch.symbols.filter((x) => x !== s)
    })
  }

  const outcomeTypes: BranchOutcomeType[] = ['normal', 'mild_mutation', 'irreversible_pollution', 'death_ending']

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div className="property-section" style={{ background: 'var(--bg-tertiary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            ← 返回章节编辑
          </div>
          <button className="btn btn-ghost btn-small" onClick={() => setSelectedBranch(null)}>
            返回
          </button>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          编辑分支：
        </div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {branch.choiceText || '未命名选择'}
        </div>
      </div>

      <div className="property-section">
        <div className="property-section-title">✏️ 分支基础</div>

        <div className="form-group">
          <label className="form-label">玩家选择文本</label>
          <input
            className="form-input"
            value={branch.choiceText}
            onChange={(e) => updateBranch(chapter.id, branch.id, { choiceText: e.target.value })}
            placeholder="例如：烧掉照片"
          />
        </div>

        <div className="form-group">
          <label className="form-label">结果类型</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {outcomeTypes.map((type) => {
              const cfg = OUTCOME_TYPE_CONFIG[type]
              return (
                <button
                  key={type}
                  className="btn btn-small"
                  onClick={() => updateBranch(chapter.id, branch.id, { outcomeType: type })}
                  style={{
                    background: branch.outcomeType === type ? cfg.bgColor : 'var(--bg-tertiary)',
                    border: `2px solid ${branch.outcomeType === type ? cfg.borderColor : 'var(--border-color)'}`,
                    color: cfg.color,
                    padding: '10px',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{cfg.label}</div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">诅咒变化值</label>
            <input
              type="number"
              className="form-input"
              value={branch.curseDelta}
              onChange={(e) => updateBranch(chapter.id, branch.id, { curseDelta: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">后续章节</label>
            <select
              className="form-select"
              value={branch.nextChapterId || ''}
              onChange={(e) => updateBranch(chapter.id, branch.id, { nextChapterId: e.target.value || null })}
            >
              <option value="">-- 未收束（结束） --</option>
              {project.chapters
                .filter((ch) => ch.id !== chapter.id)
                .map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.sceneName || '未命名'}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      <div className="property-section">
        <div className="property-section-title">💀 剧情细节</div>

        <div className="form-group">
          <label className="form-label">选择代价</label>
          <textarea
            className="form-textarea"
            value={branch.cost}
            onChange={(e) => updateBranch(chapter.id, branch.id, { cost: e.target.value })}
            placeholder="描述玩家做出这个选择需要付出的代价..."
            rows={2}
          />
        </div>

        <div className="form-group">
          <label className="form-label">触发条件</label>
          <textarea
            className="form-textarea"
            value={branch.triggerCondition}
            onChange={(e) => updateBranch(chapter.id, branch.id, { triggerCondition: e.target.value })}
            placeholder="描述该分支可选的条件，例如：持有特定道具、诅咒值达到某阈值..."
            rows={2}
          />
        </div>

        <div className="form-group">
          <label className="form-label">角色记忆</label>
          <textarea
            className="form-textarea"
            value={branch.characterMemory}
            onChange={(e) => updateBranch(chapter.id, branch.id, { characterMemory: e.target.value })}
            placeholder="描述玩家在这次选择中获得的记忆或认知变化..."
            rows={2}
          />
        </div>

        <div className="form-group">
          <label className="form-label">伏笔暗示</label>
          <textarea
            className="form-textarea"
            value={branch.foreshadowing}
            onChange={(e) => updateBranch(chapter.id, branch.id, { foreshadowing: e.target.value })}
            placeholder="描述该选择埋下的伏笔，用于后续剧情呼应..."
            rows={2}
          />
        </div>
      </div>

      <div className="property-section">
        <div className="property-section-title">🔣 相关符号</div>
        <div className="tags-container">
          {branch.symbols.map((s) => (
            <span key={s} className="tag">
              <span style={{ fontSize: '14px', marginRight: '4px' }}>{s}</span>
              {project.symbols[s] || '未定义'}
              <span className="tag-remove" onClick={() => handleRemoveSymbol(s)}>
                ✕
              </span>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
          <input
            className="form-input"
            placeholder="符号，如：☽"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            style={{ width: '80px', textAlign: 'center', fontSize: '16px' }}
          />
          <button className="btn btn-secondary btn-small" onClick={handleAddSymbol}>
            添加
          </button>
        </div>
        {Object.keys(project.symbols).length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              已有符号：
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {Object.keys(project.symbols).map((s) => (
                <button
                  key={s}
                  className="btn btn-ghost btn-small"
                  onClick={() => {
                    if (!branch.symbols.includes(s)) {
                      updateBranch(chapter.id, branch.id, { symbols: [...branch.symbols, s] })
                    }
                  }}
                  title={project.symbols[s]}
                  disabled={branch.symbols.includes(s)}
                  style={{
                    opacity: branch.symbols.includes(s) ? 0.3 : 1,
                    fontSize: '14px'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="property-section">
        <div className="property-section-title">📝 编剧备注</div>
        <textarea
          className="form-textarea"
          value={branch.notes}
          onChange={(e) => updateBranch(chapter.id, branch.id, { notes: e.target.value })}
          placeholder="供编剧自己参考的备注，不会出现在游戏中..."
          rows={3}
        />
      </div>
    </div>
  )
}
