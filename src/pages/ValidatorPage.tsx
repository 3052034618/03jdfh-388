import { useEffect, useState } from 'react'
import { useAppStore } from '../store'
import type { ValidationIssue, FixItem } from '../types'

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

const FIX_ACTION_ICONS: Record<FixItem['actionType'], string> = {
  connect_branch: '🔗',
  add_symbol_explanation: '📖',
  write_ending: '📝',
  resolve_rule_conflict: '⚖️',
  close_loop: '🔁',
  custom: '🛠'
}

export default function ValidatorPage() {
  const project = useAppStore((s) => s.project)
  const issues = useAppStore((s) => s.validationIssues)
  const runValidation = useAppStore((s) => s.runValidation)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)
  const setSelectedChapter = useAppStore((s) => s.setSelectedChapter)
  const setSelectedBranch = useAppStore((s) => s.setSelectedBranch)
  const jumpToIssue = useAppStore((s) => s.jumpToIssue)
  const setEditorFocusTarget = useAppStore((s) => s.setEditorFocusTarget)

  const [expandedIssues, setExpandedIssues] = useState<Record<string, boolean>>({})

  useEffect(() => {
    runValidation()
  }, [project])

  const errorCount = issues.filter((i) => i.severity === 'error').length
  const warningCount = issues.filter((i) => i.severity === 'warning').length
  const infoCount = issues.filter((i) => i.severity === 'info').length

  const handleJumpTo = (chapterId: string, branchId?: string) => {
    setSelectedChapter(chapterId)
    if (branchId) {
      setSelectedBranch(branchId)
    }
    setCurrentPage('editor')
  }

  const handleFixItemClick = (fixItem: FixItem) => {
    if (fixItem.targetChapterId) {
      setSelectedChapter(fixItem.targetChapterId)
      if (fixItem.targetBranchId) {
        setSelectedBranch(fixItem.targetBranchId)
      }
    }
    if (fixItem.actionType === 'add_symbol_explanation') {
      setEditorFocusTarget('symbols')
    } else if (fixItem.actionType === 'resolve_rule_conflict') {
      setEditorFocusTarget('rules')
    }
    setCurrentPage('editor')
  }

  const getRelatedChapters = (issue: ValidationIssue) => {
    return issue.relatedChapterIds
      .map((id) => project.chapters.find((ch) => ch.id === id))
      .filter(Boolean)
  }

  const getChapterById = (id: string) => project.chapters.find((ch) => ch.id === id)

  const getBranchById = (id: string) => {
    for (const ch of project.chapters) {
      const br = ch.branches.find((b) => b.id === id)
      if (br) return { branch: br, chapter: ch }
    }
    return null
  }

  const toggleExpand = (issueId: string) => {
    setExpandedIssues((prev) => ({
      ...prev,
      [issueId]: !prev[issueId]
    }))
  }

  const hasLinkInfo = (issue: ValidationIssue) => {
    return (
      issue.upstreamChapterIds.length > 0 ||
      issue.downstreamChapterIds.length > 0 ||
      issue.upstreamBranchIds.length > 0 ||
      issue.downstreamBranchIds.length > 0
    )
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
            const isExpanded = expandedIssues[issue.id] || false
            const linkInfoAvailable = hasLinkInfo(issue)
            const hasFixItems = issue.fixItems && issue.fixItems.length > 0

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
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    {linkInfoAvailable && (
                      <button
                        className="btn btn-ghost btn-small"
                        onClick={() => toggleExpand(issue.id)}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {isExpanded ? '收起链路' : '🔗 展开相关链路'}
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-small"
                      onClick={() => jumpToIssue(issue)}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      📍 跳转到编辑器
                    </button>
                  </div>
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

                {isExpanded && linkInfoAvailable && (
                  <div className="issue-link-info" style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--text-primary)' }}>
                      🔗 相关链路信息
                    </div>

                    {issue.upstreamChapterIds.length > 0 && (
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginRight: '8px' }}>
                          ⬅️ 上游章节：
                        </span>
                        {issue.upstreamChapterIds.map((id, i) => {
                          const ch = getChapterById(id)
                          return (
                            <span key={id}>
                              {i > 0 && '、'}
                              <button
                                className="btn btn-ghost btn-small"
                                onClick={() => handleJumpTo(id)}
                                style={{ color: 'var(--accent-info)', padding: '0 4px' }}
                              >
                                {ch?.sceneName || id}
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    )}

                    {issue.downstreamChapterIds.length > 0 && (
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginRight: '8px' }}>
                          ➡️ 下游章节：
                        </span>
                        {issue.downstreamChapterIds.map((id, i) => {
                          const ch = getChapterById(id)
                          return (
                            <span key={id}>
                              {i > 0 && '、'}
                              <button
                                className="btn btn-ghost btn-small"
                                onClick={() => handleJumpTo(id)}
                                style={{ color: 'var(--accent-info)', padding: '0 4px' }}
                              >
                                {ch?.sceneName || id}
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    )}

                    {issue.upstreamBranchIds.length > 0 && (
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginRight: '8px' }}>
                          🔗 上游分支：
                        </span>
                        {issue.upstreamBranchIds.map((id, i) => {
                          const brInfo = getBranchById(id)
                          return (
                            <span key={id}>
                              {i > 0 && '、'}
                              <button
                                className="btn btn-ghost btn-small"
                                onClick={() => brInfo && handleJumpTo(brInfo.chapter.id, brInfo.branch.id)}
                                style={{ color: 'var(--accent-warning)', padding: '0 4px' }}
                              >
                                {brInfo?.branch.choiceText || id}
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    )}

                    {issue.downstreamBranchIds.length > 0 && (
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginRight: '8px' }}>
                          🔗 下游分支：
                        </span>
                        {issue.downstreamBranchIds.map((id, i) => {
                          const brInfo = getBranchById(id)
                          return (
                            <span key={id}>
                              {i > 0 && '、'}
                              <button
                                className="btn btn-ghost btn-small"
                                onClick={() => brInfo && handleJumpTo(brInfo.chapter.id, brInfo.branch.id)}
                                style={{ color: 'var(--accent-warning)', padding: '0 4px' }}
                              >
                                {brInfo?.branch.choiceText || id}
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {hasFixItems && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    borderRadius: '8px',
                    border: '1px solid rgba(59, 130, 246, 0.25)'
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--accent-info)' }}>
                      🔧 修复清单
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {issue.fixItems.map((fixItem) => (
                        <div
                          key={fixItem.id}
                          onClick={() => handleFixItemClick(fixItem)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 10px',
                            backgroundColor: 'rgba(255,255,255,0.04)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            border: '1px solid transparent',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)'
                            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'
                            e.currentTarget.style.borderColor = 'transparent'
                          }}
                        >
                          <span style={{ fontSize: '16px', flexShrink: 0 }}>
                            {FIX_ACTION_ICONS[fixItem.actionType]}
                          </span>
                          <span style={{
                            flex: 1,
                            fontSize: '13px',
                            color: 'var(--text-primary)',
                            lineHeight: 1.5
                          }}>
                            {fixItem.description}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            color: 'var(--accent-info)',
                            fontWeight: 500,
                            padding: '3px 8px',
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap'
                          }}>
                            📍 跳转
                          </span>
                        </div>
                      ))}
                    </div>
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
