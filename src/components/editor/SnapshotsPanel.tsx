import { useState } from 'react'
import { useAppStore } from '../../store'

function formatDateTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getDefaultName(): string {
  const d = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `快照-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function SnapshotsPanel() {
  const snapshots = useAppStore((s) => s.snapshots)
  const createSnapshot = useAppStore((s) => s.createSnapshot)
  const restoreSnapshot = useAppStore((s) => s.restoreSnapshot)
  const deleteSnapshot = useAppStore((s) => s.deleteSnapshot)

  const [name, setName] = useState(getDefaultName())
  const [note, setNote] = useState('')

  const handleCreate = () => {
    if (name.trim()) {
      createSnapshot(name.trim(), note.trim())
      setName(getDefaultName())
      setNote('')
    }
  }

  const handleRestore = (snapshotId: string, snapshotName: string) => {
    if (confirm(`确定要恢复快照"${snapshotName}"吗？\n当前未保存的修改将丢失。`)) {
      restoreSnapshot(snapshotId)
    }
  }

  const handleDelete = (snapshotId: string, snapshotName: string) => {
    if (confirm(`确定要删除快照"${snapshotName}"吗？此操作不可撤销。`)) {
      deleteSnapshot(snapshotId)
    }
  }

  const sortedSnapshots = [...snapshots].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div style={{
      marginTop: '12px',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '12px',
      background: 'var(--bg-card)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ fontSize: '14px', fontWeight: 600 }}>
          🗂 快照管理
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          共 {snapshots.length} 个快照
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <input
          className="form-input"
          placeholder="快照名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ fontSize: '12px', padding: '6px 10px', marginBottom: '8px' }}
        />
        <textarea
          className="form-textarea"
          placeholder="备注（可选）"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ fontSize: '11px', padding: '6px 10px', minHeight: '50px', marginBottom: '8px' }}
        />
        <button
          className="btn btn-primary btn-small"
          style={{ width: '100%' }}
          onClick={handleCreate}
        >
          💾 保存快照
        </button>
      </div>

      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {sortedSnapshots.length === 0 ? (
          <div style={{
            padding: '20px 12px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '12px'
          }}>
            暂无快照，点击上方按钮创建
          </div>
        ) : (
          sortedSnapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className="chapter-list-item"
              style={{
                padding: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                cursor: 'default'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '2px'
                  }}>
                    {snapshot.name || '未命名快照'}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    marginBottom: snapshot.note ? '4px' : '0'
                  }}>
                    {formatDateTime(snapshot.createdAt)}
                  </div>
                  {snapshot.note && (
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      lineHeight: 1.4
                    }}>
                      {snapshot.note}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                <button
                  className="btn btn-secondary btn-small"
                  style={{ flex: 1, fontSize: '11px' }}
                  onClick={() => handleRestore(snapshot.id, snapshot.name)}
                  title="恢复此快照"
                >
                  ↩️ 恢复
                </button>
                <button
                  className="btn btn-danger btn-small"
                  style={{ flex: 1, fontSize: '11px' }}
                  onClick={() => handleDelete(snapshot.id, snapshot.name)}
                  title="删除此快照"
                >
                  🗑 删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
