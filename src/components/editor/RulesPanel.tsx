import { useState } from 'react'
import { useAppStore } from '../../store'

export default function RulesPanel() {
  const project = useAppStore((s) => s.project)
  const addCurseRule = useAppStore((s) => s.addCurseRule)
  const updateCurseRule = useAppStore((s) => s.updateCurseRule)
  const deleteCurseRule = useAppStore((s) => s.deleteCurseRule)
  const addSymbol = useAppStore((s) => s.addSymbol)
  const updateSymbol = useAppStore((s) => s.updateSymbol)
  const deleteSymbol = useAppStore((s) => s.deleteSymbol)

  const [showRules, setShowRules] = useState(false)
  const [showSymbols, setShowSymbols] = useState(false)
  const [newSymbolKey, setNewSymbolKey] = useState('')
  const [newSymbolValue, setNewSymbolValue] = useState('')

  const handleAddSymbol = () => {
    if (newSymbolKey.trim()) {
      addSymbol(newSymbolKey.trim(), newSymbolValue.trim())
      setNewSymbolKey('')
      setNewSymbolValue('')
    }
  }

  return (
    <div style={{ marginTop: '12px' }}>
      <div className="rules-section">
        <div className="collapsible-header" onClick={() => setShowRules(!showRules)}>
          <span>📜 诅咒规则 ({project.curseRules.length})</span>
          <span>{showRules ? '▲' : '▼'}</span>
        </div>

        {showRules && (
          <div className="collapsible-content">
            <button
              className="btn btn-secondary btn-small"
              style={{ width: '100%', marginBottom: '8px' }}
              onClick={addCurseRule}
            >
              + 添加规则
            </button>

            {project.curseRules.map((rule) => (
              <div key={rule.id} className="rule-item">
                <input
                  className="form-input"
                  style={{ marginBottom: '6px', fontSize: '12px', padding: '4px 8px' }}
                  value={rule.name}
                  onChange={(e) => updateCurseRule(rule.id, { name: e.target.value })}
                />
                <textarea
                  className="form-textarea"
                  style={{ fontSize: '11px', padding: '6px 8px', minHeight: '50px' }}
                  value={rule.description}
                  onChange={(e) => updateCurseRule(rule.id, { description: e.target.value })}
                  placeholder="描述..."
                />
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                  <input
                    className="form-input"
                    style={{ fontSize: '11px', padding: '4px 8px', flex: 1 }}
                    placeholder="触发条件"
                    value={rule.triggerCondition}
                    onChange={(e) => updateCurseRule(rule.id, { triggerCondition: e.target.value })}
                  />
                </div>
                <div style={{ marginTop: '6px' }}>
                  <textarea
                    className="form-textarea"
                    style={{ fontSize: '11px', padding: '6px 8px', minHeight: '40px' }}
                    placeholder="诅咒效果"
                    value={rule.curseEffect}
                    onChange={(e) => updateCurseRule(rule.id, { curseEffect: e.target.value })}
                  />
                </div>
                <button
                  className="btn btn-danger btn-small"
                  style={{ width: '100%', marginTop: '6px' }}
                  onClick={() => {
                    if (confirm('删除此诅咒规则？')) deleteCurseRule(rule.id)
                  }}
                >
                  删除规则
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="symbols-section">
        <div className="collapsible-header" onClick={() => setShowSymbols(!showSymbols)}>
          <span>🔣 符号词典 ({Object.keys(project.symbols).length})</span>
          <span>{showSymbols ? '▲' : '▼'}</span>
        </div>

        {showSymbols && (
          <div className="collapsible-content">
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <input
                  className="form-input"
                  placeholder="符号"
                  value={newSymbolKey}
                  onChange={(e) => setNewSymbolKey(e.target.value)}
                  style={{ width: '70px', textAlign: 'center', fontSize: '16px' }}
                />
                <input
                  className="form-input"
                  placeholder="释义"
                  value={newSymbolValue}
                  onChange={(e) => setNewSymbolValue(e.target.value)}
                />
              </div>
              <button
                className="btn btn-secondary btn-small"
                style={{ width: '100%' }}
                onClick={handleAddSymbol}
              >
                + 添加符号
              </button>
            </div>

            {Object.entries(project.symbols).map(([sym, desc]) => (
              <div key={sym} className="symbol-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div className="symbol-item-name">
                      <span style={{ fontSize: '20px', marginRight: '8px' }}>{sym}</span>
                    </div>
                    <input
                      className="form-input"
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                      value={desc}
                      onChange={(e) => updateSymbol(sym, e.target.value)}
                    />
                  </div>
                  <button
                    className="btn btn-ghost btn-small"
                    onClick={() => {
                      if (confirm(`删除符号 "${sym}"？`)) deleteSymbol(sym)
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
