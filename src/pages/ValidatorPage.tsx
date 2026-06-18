import { useEffect } from 'react'
import { useAppStore } from '../store'
import type { ValidationIssue } from '../types'

const TYPE_LABELS: Record<ValidationIssue['type'], string> = {
  unclosed_branch: '未收束分支',
  curse_contradiction: '诅咒矛盾',
  unexplained_symbol: '符号问题',
  symbol_inconsistent: '符号解释冲突',
  orphan_chapter: '孤立章节',
  missing_connection: '无效连接',
  missing_ending_description: '结局描述缺失',
  rule_conflict: '规则冲突',
  empty_conditions: '空条件',
  circular_reference: '循环引用'
}

const TYPE_ICONS: Record<ValidationIssue['type'], string> = {
  unclosed_branch: '🔀',
  curse_contradiction: '⚠️',
  unexplained_symbol: '🔣',
  symbol_inconsistent: '🔄',
  orphan_chapter: '🏚️',
  missing_connection: '🔗',
  missing_ending_description: '📝',
  rule_conflict: '⚔️',
  empty_conditions: '📋',
  circular_reference: '♻️'
}

export default function ValidatorPage() {
  const project = useAppStore((s) => s.project)
  const issues = useAppStore((s) => s.validationIssues)
  const runValidation = useAppStore((s) => s.runValidation)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)
  const setSelectedChapter = useAppStore((s) => s.setSelectedChapter)
  const jumpToIssue = useAppStore((s) => s.jumpToIssue)

  useEffect(() => {
    runValidation()
  }, [project])

  const errorCount = issues.filter((i) => i.severity === 'error').length
  const warningCount = issues.filter((i) => i.severity === 'warning').length
  const infoCount = issues.filter((i) => i.severity === 'info').length

  const handleJumpTo = (chapterId: string) => {
    setSelectedChapter(chapterId)
    setCurrentPage('editor')
  }

  const getRelatedChapters = (issue: ValidationIssue) => {
    return issue.relatedChapterIds
      .map((id) => project.chapters.find((ch) => ch.id === id))
      .filter(Boolean)
  }

  return (
    <div className="validator-page">
      <div className="validator-header">
        <div>
          <h2 style={{ fontSize: '22px', marginBottom: '4px' }}>🔍 断点检查</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            自动分析剧情结构，发现潜在的逻辑问题
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="validator-stats">
            <div className="stat-card error">
              <span className="stat-card-value">{errorCount}</span>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>错误</div>
                <div className="stat-card-label">严重问题</div>
              </div>
            </div>
            <div className="stat-card warning">
              <span className="stat-card-value">{warningCount}</span>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>警告</div>
                <div className="stat-card-label">需关注</div>
              </div>
            </div>
            <div className="stat-card info">
              <span className="stat-card-value">{infoCount}</span>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>提示</div>
                <div className="stat-card-label">可优化</div>
              </div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={runValidation}>
            🔄 重新检查
          </button>
        </div>
      </div>

      <div className="issue-list">
        {issues.length === 0 ? (
          <div className="empty-state" style={{ marginTop: '48px' }}>
            <div className="empty-state-icon">✨</div>
            <div className="empty-state-text" style={{ fontSize: '16px', color: 'var(--accent-success)' }}>
              未发现问题！剧情结构完整
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              所有支线都已收束，诅咒规则一致，符号已解释
            </div>
          </div>
        ) : (
          issues.map((issue) => {
            const relatedChapters = getRelatedChapters(issue)
            return (
              <div key={issue.id} className={`issue-card ${issue.severity}`}>
                <div className="issue-header">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                    <span style={{ fontSize: '24px' }}>{TYPE_ICONS[issue.type]}</span>
                    <div style={{ flex: 1 }}>
                      <div className="issue-title">
                        {TYPE_LABELS[issue.type]} · {issue.title}
                      </div>
                      <span className={`issue-severity ${issue.severity}`}>
                        {issue.severity === 'error' ? '错误' : issue.severity === 'warning' ? '警告' : '提示'}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-small"
                    onClick={() => jumpToIssue(issue)}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    📍 跳转到编辑器
                  </button>
                </div>
                <div className="issue-description">{issue.description}</div>
                {relatedChapters.length > 0 && (
                  <div className="issue-related">
                    <span style={{ marginRight: '8px' }}>相关章节：</span>
                    {relatedChapters.map((ch, i) => (
                      <span key={ch!.id}>
                        {i > 0 && '、'}
                        <button
                          className="btn btn-ghost btn-small"
                          onClick={() => handleJumpTo(ch!.id)}
                          style={{ color: 'var(--accent-info)', padding: '0 4px' }}
                        >
                          {ch!.sceneName || '未命名章节'}
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
