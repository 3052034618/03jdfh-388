import { useEffect } from 'react'
import { useAppStore } from '../store'
import type { PlaythroughState } from '../types'
import { OUTCOME_TYPE_CONFIG } from '../types'

function getCurseLevel(curseValue: number): { label: string; color: string; percent: number } {
  if (curseValue <= 10) return { label: '纯净', color: 'var(--accent-success)', percent: Math.min(curseValue * 5, 15) }
  if (curseValue <= 25) return { label: '轻微侵蚀', color: 'var(--accent-gold)', percent: 30 }
  if (curseValue <= 50) return { label: '深度污染', color: 'var(--accent-warning)', percent: 55 }
  if (curseValue <= 75) return { label: '不可逆', color: 'var(--accent-blood)', percent: 80 }
  return { label: '完全同化', color: 'var(--accent-curse)', percent: 100 }
}

function PlaythroughStats({ playthrough }: { playthrough: PlaythroughState }) {
  const curseInfo = getCurseLevel(playthrough.curseValue)

  return (
    <div className="playthrough-sidebar">
      <div className="curse-meter">
        <div className="playthrough-sidebar-title">
          💀 诅咒值
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: '32px', fontWeight: 700, color: curseInfo.color }}>
            {playthrough.curseValue}
          </span>
          <span style={{ fontSize: '12px', color: curseInfo.color, fontWeight: 600 }}>
            {curseInfo.label}
          </span>
        </div>
        <div className="curse-meter-bar">
          <div className="curse-meter-fill" style={{ width: `${curseInfo.percent}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div className="playthrough-sidebar-title">📖 已访问章节 ({playthrough.visitedChapters.length})</div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {playthrough.choicesMade.length} 次选择
        </div>
      </div>

      {playthrough.memories.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div className="playthrough-sidebar-title">🧠 角色记忆</div>
          {playthrough.memories.map((mem, i) => (
            <div key={i} className="memory-item">
              {mem}
            </div>
          ))}
        </div>
      )}

      {playthrough.foreshadowingNotes.length > 0 && (
        <div>
          <div className="playthrough-sidebar-title">🌑 伏笔暗示</div>
          {playthrough.foreshadowingNotes.map((note, i) => (
            <div key={i} className="foreshadowing-item">
              {note}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PlaythroughPage() {
  const project = useAppStore((s) => s.project)
  const playthrough = useAppStore((s) => s.playthrough)
  const startPlaythrough = useAppStore((s) => s.startPlaythrough)
  const makeChoice = useAppStore((s) => s.makeChoice)
  const resetPlaythrough = useAppStore((s) => s.resetPlaythrough)

  useEffect(() => {
    if (!playthrough.currentChapterId && !playthrough.isEnded && project.chapters.length > 0) {
      startPlaythrough()
    }
  }, [project])

  const currentChapter = project.chapters.find((ch) => ch.id === playthrough.currentChapterId)

  const endingLabels: Record<string, { label: string; emoji: string }> = {
    good: { label: '好结局', emoji: '🌅' },
    bad: { label: '坏结局', emoji: '💀' },
    neutral: { label: '普通结局', emoji: '🌙' },
    death: { label: '死亡结局', emoji: '⚰️' }
  }

  return (
    <div className="playthrough-page">
      <div className="playthrough-main">
        {(!currentChapter && !playthrough.isEnded) || project.chapters.length === 0 ? (
          <div className="empty-state" style={{ marginTop: '80px' }}>
            <div className="empty-state-icon">🎮</div>
            <div className="empty-state-text" style={{ fontSize: '18px' }}>
              {project.chapters.length === 0 ? '请先在剧情编排中创建章节' : '准备好开始你的恐怖之旅了吗？'}
            </div>
            {project.chapters.length > 0 && (
              <button className="btn btn-primary" onClick={startPlaythrough} style={{ marginTop: '16px' }}>
                ▶ 开始试玩
              </button>
            )}
          </div>
        ) : playthrough.isEnded ? (
          <div className="playthrough-ended">
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>
              {playthrough.endingType ? endingLabels[playthrough.endingType]?.emoji || '🎭' : '🎭'}
            </div>
            <div
              className={`playthrough-ending-title ${playthrough.endingType || 'neutral'}`}
            >
              {playthrough.endingType ? endingLabels[playthrough.endingType]?.label || '结局' : '故事结束'}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
              {currentChapter?.narrativeText || '你的故事在这里画上了句号...'}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={startPlaythrough}>
                🔄 重新开始
              </button>
              <button className="btn btn-secondary" onClick={resetPlaythrough}>
                ↩ 回到起点
              </button>
            </div>
          </div>
        ) : currentChapter ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div className="playthrough-scene-name">{currentChapter.sceneName}</div>
                {currentChapter.fearAtmosphere && (
                  <div className="playthrough-atmosphere">「{currentChapter.fearAtmosphere}」</div>
                )}
              </div>
              <button className="btn btn-secondary btn-small" onClick={resetPlaythrough}>
                ↩ 重置
              </button>
            </div>

            {currentChapter.keyItems.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>关键物品：</div>
                <div className="tags-container">
                  {currentChapter.keyItems.map((item, i) => (
                    <span key={i} className="tag">
                      🎒 {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="playthrough-narrative">
              {currentChapter.narrativeText || '（此处为空白场景，请编剧补充剧情文本）'}
            </div>

            {!currentChapter.isEnding && currentChapter.branches.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  你将如何选择？
                </div>
                <div className="playthrough-choices">
                  {currentChapter.branches.map((branch) => {
                    const cfg = OUTCOME_TYPE_CONFIG[branch.outcomeType]
                    return (
                      <button
                        key={branch.id}
                        className="playthrough-choice"
                        onClick={() => makeChoice(branch.id)}
                        style={{
                          borderLeft: `4px solid ${cfg.borderColor}`,
                          background: cfg.bgColor
                        }}
                      >
                        <span style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500 }}>{branch.choiceText}</div>
                          {branch.triggerCondition && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              条件：{branch.triggerCondition}
                            </div>
                          )}
                          {branch.cost && (
                            <div style={{ fontSize: '11px', color: 'var(--accent-warning)', marginTop: '4px' }}>
                              代价：{branch.cost}
                            </div>
                          )}
                        </span>
                        <div style={{ textAlign: 'right' }}>
                          <span
                            className={`choice-curse-delta ${branch.curseDelta < 0 ? 'negative' : ''}`}
                          >
                            {branch.curseDelta >= 0 ? '+' : ''}{branch.curseDelta} 诅咒
                          </span>
                          <div
                            style={{
                              fontSize: '10px',
                              color: cfg.color,
                              marginTop: '4px',
                              fontWeight: 600
                            }}
                          >
                            {cfg.label}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      <PlaythroughStats playthrough={playthrough} />
    </div>
  )
}
