import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type {
  Project, Chapter, Branch, CurseRule, PlaythroughState,
  ValidationIssue, ConditionCheckResult, TriggerConditionItem, Snapshot,
  EditorFocusTarget, PlaythroughChoice, CurseRuleDelta
} from '../types'
import { validateProject } from '../utils/validation'
import { CONDITION_TYPE_LABELS } from '../types'

interface AppState {
  project: Project
  currentPage: 'editor' | 'validator' | 'playthrough'
  selectedChapterId: string | null
  selectedChapterIds: string[]
  selectedBranchId: string | null
  playthrough: PlaythroughState
  validationIssues: ValidationIssue[]
  snapshots: Snapshot[]
  editorFocusTarget: EditorFocusTarget

  setCurrentPage: (page: 'editor' | 'validator' | 'playthrough') => void
  setSelectedChapter: (id: string | null) => void
  setSelectedBranch: (id: string | null) => void
  setEditorFocusTarget: (target: EditorFocusTarget) => void
  toggleChapterSelection: (id: string) => void
  selectChapterRange: (startId: string, endId: string) => void
  clearChapterSelection: () => void
  selectAllChapters: () => void
  moveSelectedChapters: (dx: number, dy: number) => void
  duplicateSelectedChapters: () => void
  alignSelectedChapters: (align: 'left' | 'right' | 'top' | 'bottom' | 'horizontal' | 'vertical') => void

  updateProjectMeta: (title: string, description: string) => void

  addChapter: (sceneName: string, x?: number, y?: number) => void
  updateChapter: (id: string, updates: Partial<Chapter>) => void
  deleteChapter: (id: string) => void
  duplicateChapter: (id: string) => void

  addBranch: (chapterId: string, choiceText: string, nextChapterId?: string | null) => void
  updateBranch: (chapterId: string, branchId: string, updates: Partial<Branch>) => void
  deleteBranch: (chapterId: string, branchId: string) => void

  addConditionItem: (chapterId: string, branchId: string, type: TriggerConditionItem['type']) => void
  updateConditionItem: (chapterId: string, branchId: string, conditionId: string, updates: Partial<TriggerConditionItem>) => void
  deleteConditionItem: (chapterId: string, branchId: string, conditionId: string) => void

  checkBranchConditions: (branch: Branch) => ConditionCheckResult

  addCurseRule: () => void
  updateCurseRule: (id: string, updates: Partial<CurseRule>) => void
  deleteCurseRule: (id: string) => void

  addSymbol: (symbol: string, explanation: string) => void
  updateSymbol: (symbol: string, explanation: string) => void
  deleteSymbol: (symbol: string) => void

  runValidation: () => void

  startPlaythrough: () => void
  makeChoice: (branchId: string) => void
  resetPlaythrough: () => void

  jumpToIssue: (issue: ValidationIssue) => void

  createSnapshot: (name: string, note: string) => void
  restoreSnapshot: (snapshotId: string) => void
  deleteSnapshot: (snapshotId: string) => void

  generatePlaythroughReport: () => string

  loadProject: (project: Project) => void
  getProjectForSave: () => Project
}

const createEmptyProject = (): Project => ({
  id: uuidv4(),
  title: '未命名恐怖项目',
  description: '在此描述你的恐怖故事概要...',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  chapters: [],
  curseRules: [],
  symbols: {},
  playthrough: null,
  snapshots: [],
  lastOpenedAt: Date.now(),
  uiState: {
    currentPage: 'editor',
    selectedChapterIds: [],
    selectedBranchId: null
  }
})

const createInitialPlaythrough = (): PlaythroughState => ({
  currentChapterId: null,
  curseValue: 0,
  memories: [],
  visitedChapters: [],
  choicesMade: [],
  foreshadowingNotes: [],
  collectedItems: [],
  isEnded: false
})

const createDefaultBranch = (choiceText: string, nextChapterId?: string | null): Branch => ({
  id: uuidv4(),
  choiceText,
  cost: '',
  triggerCondition: '',
  structuredConditions: [],
  characterMemory: '',
  outcomeType: 'normal',
  curseDelta: 0,
  nextChapterId: nextChapterId ?? null,
  foreshadowing: '',
  symbols: [],
  symbolOverrides: {},
  notes: ''
})

export const useAppStore = create<AppState>((set, get) => ({
  project: createEmptyProject(),
  currentPage: 'editor',
  selectedChapterId: null,
  selectedChapterIds: [],
  selectedBranchId: null,
  playthrough: createInitialPlaythrough(),
  validationIssues: [],
  snapshots: [],
  editorFocusTarget: null,

  setCurrentPage: (page) => set({ currentPage: page }),
  setSelectedChapter: (id) => set({ selectedChapterId: id, selectedChapterIds: id ? [id] : [], selectedBranchId: null }),
  setSelectedBranch: (id) => set({ selectedBranchId: id }),
  setEditorFocusTarget: (target) => set({ editorFocusTarget: target }),
  toggleChapterSelection: (id) => set((state) => ({
    selectedChapterIds: state.selectedChapterIds.includes(id)
      ? state.selectedChapterIds.filter((i) => i !== id)
      : [...state.selectedChapterIds, id]
  })),
  selectChapterRange: (startId, endId) => set((state) => {
    const chapters = state.project.chapters
    const startIdx = chapters.findIndex((c) => c.id === startId)
    const endIdx = chapters.findIndex((c) => c.id === endId)
    if (startIdx === -1 || endIdx === -1) return state
    const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
    return {
      selectedChapterIds: chapters.slice(from, to + 1).map((c) => c.id)
    }
  }),
  clearChapterSelection: () => set({ selectedChapterIds: [], selectedChapterId: null }),
  selectAllChapters: () => set((state) => ({
    selectedChapterIds: state.project.chapters.map((c) => c.id)
  })),
  moveSelectedChapters: (dx, dy) => set((state) => ({
    project: {
      ...state.project,
      chapters: state.project.chapters.map((ch) =>
        state.selectedChapterIds.includes(ch.id)
          ? { ...ch, x: ch.x + dx, y: ch.y + dy }
          : ch
      ),
      updatedAt: Date.now()
    }
  })),
  duplicateSelectedChapters: () => set((state) => {
    const copies: Chapter[] = state.project.chapters
      .filter((ch) => state.selectedChapterIds.includes(ch.id))
      .map((original) => {
        const copy: Chapter = JSON.parse(JSON.stringify(original))
        copy.id = uuidv4()
        copy.sceneName = original.sceneName + ' (副本)'
        copy.x = original.x + 30
        copy.y = original.y + 30
        copy.branches = original.branches.map((br) => ({
          ...br,
          id: uuidv4(),
          structuredConditions: br.structuredConditions?.map((c) => ({ ...c, id: uuidv4() })) || []
        }))
        return copy
      })
    return {
      project: {
        ...state.project,
        chapters: [...state.project.chapters, ...copies],
        updatedAt: Date.now()
      }
    }
  }),
  alignSelectedChapters: (align) => set((state) => {
    const selected = state.project.chapters.filter((ch) =>
      state.selectedChapterIds.includes(ch.id)
    )
    if (selected.length < 2) return state

    let updatedChapters = state.project.chapters

    switch (align) {
      case 'left': {
        const minX = Math.min(...selected.map((c) => c.x))
        updatedChapters = updatedChapters.map((ch) =>
          state.selectedChapterIds.includes(ch.id) ? { ...ch, x: minX } : ch
        )
        break
      }
      case 'right': {
        const maxX = Math.max(...selected.map((c) => c.x))
        updatedChapters = updatedChapters.map((ch) =>
          state.selectedChapterIds.includes(ch.id) ? { ...ch, x: maxX } : ch
        )
        break
      }
      case 'top': {
        const minY = Math.min(...selected.map((c) => c.y))
        updatedChapters = updatedChapters.map((ch) =>
          state.selectedChapterIds.includes(ch.id) ? { ...ch, y: minY } : ch
        )
        break
      }
      case 'bottom': {
        const maxY = Math.max(...selected.map((c) => c.y))
        updatedChapters = updatedChapters.map((ch) =>
          state.selectedChapterIds.includes(ch.id) ? { ...ch, y: maxY } : ch
        )
        break
      }
      case 'horizontal': {
        const avgY = selected.reduce((sum, c) => sum + c.y, 0) / selected.length
        const sorted = [...selected].sort((a, b) => a.x - b.x)
        const minX = sorted[0].x
        const maxX = sorted[sorted.length - 1].x
        const step = sorted.length > 1 ? (maxX - minX) / (sorted.length - 1) : 0
        updatedChapters = updatedChapters.map((ch) => {
          if (!state.selectedChapterIds.includes(ch.id)) return ch
          const idx = sorted.findIndex((c) => c.id === ch.id)
          return { ...ch, x: minX + step * idx, y: avgY }
        })
        break
      }
      case 'vertical': {
        const avgX = selected.reduce((sum, c) => sum + c.x, 0) / selected.length
        const sorted = [...selected].sort((a, b) => a.y - b.y)
        const minY = sorted[0].y
        const maxY = sorted[sorted.length - 1].y
        const step = sorted.length > 1 ? (maxY - minY) / (sorted.length - 1) : 0
        updatedChapters = updatedChapters.map((ch) => {
          if (!state.selectedChapterIds.includes(ch.id)) return ch
          const idx = sorted.findIndex((c) => c.id === ch.id)
          return { ...ch, x: avgX, y: minY + step * idx }
        })
        break
      }
    }

    return {
      project: {
        ...state.project,
        chapters: updatedChapters,
        updatedAt: Date.now()
      }
    }
  }),

  updateProjectMeta: (title, description) => set((state) => ({
    project: { ...state.project, title, description, updatedAt: Date.now() }
  })),

  addChapter: (sceneName, x, y) => set((state) => {
    const newChapter: Chapter = {
      id: uuidv4(),
      sceneName,
      fearAtmosphere: '',
      keyItems: [],
      currentCurseLevel: state.project.chapters.length === 0 ? 0 : 5,
      narrativeText: '',
      branches: [],
      isEnding: false,
      x: x ?? 100 + state.project.chapters.length * 50,
      y: y ?? 100 + state.project.chapters.length * 30
    }
    return {
      project: {
        ...state.project,
        chapters: [...state.project.chapters, newChapter],
        updatedAt: Date.now()
      },
      selectedChapterId: newChapter.id
    }
  }),

  updateChapter: (id, updates) => set((state) => ({
    project: {
      ...state.project,
      chapters: state.project.chapters.map((ch) =>
        ch.id === id ? { ...ch, ...updates } : ch
      ),
      updatedAt: Date.now()
    }
  })),

  deleteChapter: (id) => set((state) => {
    const chapters = state.project.chapters.filter((ch) => ch.id !== id)
    chapters.forEach((ch) => {
      ch.branches.forEach((br) => {
        if (br.nextChapterId === id) br.nextChapterId = null
      })
    })
    return {
      project: {
        ...state.project,
        chapters,
        updatedAt: Date.now()
      },
      selectedChapterId: state.selectedChapterId === id ? null : state.selectedChapterId
    }
  }),

  duplicateChapter: (id) => set((state) => {
    const original = state.project.chapters.find((ch) => ch.id === id)
    if (!original) return state
    const copy: Chapter = JSON.parse(JSON.stringify(original))
    copy.id = uuidv4()
    copy.sceneName = original.sceneName + ' (副本)'
    copy.x = original.x + 30
    copy.y = original.y + 30
    copy.branches = original.branches.map((br) => ({ ...br, id: uuidv4(), structuredConditions: br.structuredConditions?.map(c => ({ ...c, id: uuidv4() })) || [] }))
    return {
      project: {
        ...state.project,
        chapters: [...state.project.chapters, copy],
        updatedAt: Date.now()
      }
    }
  }),

  addBranch: (chapterId, choiceText, nextChapterId) => set((state) => ({
    project: {
      ...state.project,
      chapters: state.project.chapters.map((ch) => {
        if (ch.id !== chapterId) return ch
        const newBranch = createDefaultBranch(choiceText, nextChapterId)
        return { ...ch, branches: [...ch.branches, newBranch] }
      }),
      updatedAt: Date.now()
    }
  })),

  updateBranch: (chapterId, branchId, updates) => set((state) => ({
    project: {
      ...state.project,
      chapters: state.project.chapters.map((ch) => {
        if (ch.id !== chapterId) return ch
        return {
          ...ch,
          branches: ch.branches.map((br) =>
            br.id === branchId ? { ...br, ...updates } : br
          )
        }
      }),
      updatedAt: Date.now()
    }
  })),

  deleteBranch: (chapterId, branchId) => set((state) => ({
    project: {
      ...state.project,
      chapters: state.project.chapters.map((ch) => {
        if (ch.id !== chapterId) return ch
        return { ...ch, branches: ch.branches.filter((br) => br.id !== branchId) }
      }),
      updatedAt: Date.now()
    },
    selectedBranchId: state.selectedBranchId === branchId ? null : state.selectedBranchId
  })),

  addConditionItem: (chapterId, branchId, type) => set((state) => ({
    project: {
      ...state.project,
      chapters: state.project.chapters.map((ch) => {
        if (ch.id !== chapterId) return ch
        return {
          ...ch,
          branches: ch.branches.map((br) => {
            if (br.id !== branchId) return br
            const newCondition: TriggerConditionItem = {
              id: uuidv4(),
              type,
              value: '',
              description: ''
            }
            return { ...br, structuredConditions: [...(br.structuredConditions || []), newCondition] }
          })
        }
      }),
      updatedAt: Date.now()
    }
  })),

  updateConditionItem: (chapterId, branchId, conditionId, updates) => set((state) => ({
    project: {
      ...state.project,
      chapters: state.project.chapters.map((ch) => {
        if (ch.id !== chapterId) return ch
        return {
          ...ch,
          branches: ch.branches.map((br) => {
            if (br.id !== branchId) return br
            return {
              ...br,
              structuredConditions: (br.structuredConditions || []).map((c) =>
                c.id === conditionId ? { ...c, ...updates } : c
              )
            }
          })
        }
      }),
      updatedAt: Date.now()
    }
  })),

  deleteConditionItem: (chapterId, branchId, conditionId) => set((state) => ({
    project: {
      ...state.project,
      chapters: state.project.chapters.map((ch) => {
        if (ch.id !== chapterId) return ch
        return {
          ...ch,
          branches: ch.branches.map((br) => {
            if (br.id !== branchId) return br
            return {
              ...br,
              structuredConditions: (br.structuredConditions || []).filter((c) => c.id !== conditionId)
            }
          })
        }
      }),
      updatedAt: Date.now()
    }
  })),

  checkBranchConditions: (branch) => {
    const { playthrough, project } = get()
    const reasons: string[] = []
    let available = true

    const conditions = branch.structuredConditions || []
    if (conditions.length === 0) {
      return { available: true, reasons: [] }
    }

    conditions.forEach((cond) => {
      const label = CONDITION_TYPE_LABELS[cond.type]
      let passed = true
      let reason = ''

      switch (cond.type) {
        case 'has_item':
          passed = playthrough.collectedItems.includes(cond.value)
          reason = passed ? '' : `需要道具：${cond.value || '未指定'}`
          break
        case 'no_item':
          passed = !playthrough.collectedItems.includes(cond.value)
          reason = passed ? '' : `不能拥有道具：${cond.value || '未指定'}`
          break
        case 'has_memory':
          passed = playthrough.memories.some(m => m.includes(cond.value))
          reason = passed ? '' : `需要相关记忆：${cond.value || '未指定'}`
          break
        case 'has_foreshadowing':
          passed = playthrough.foreshadowingNotes.some(f => f.includes(cond.value))
          reason = passed ? '' : `需要触发伏笔：${cond.value || '未指定'}`
          break
        case 'curse_min': {
          const minVal = parseInt(cond.value) || 0
          passed = playthrough.curseValue >= minVal
          reason = passed ? '' : `需要诅咒值 ≥ ${minVal}（当前：${playthrough.curseValue}）`
          break
        }
        case 'curse_max': {
          const maxVal = parseInt(cond.value) || 999
          passed = playthrough.curseValue <= maxVal
          reason = passed ? '' : `需要诅咒值 ≤ ${maxVal}（当前：${playthrough.curseValue}）`
          break
        }
        case 'visited_chapter': {
          const targetChapter = project.chapters.find(c => c.id === cond.value || c.sceneName === cond.value)
          passed = targetChapter ? playthrough.visitedChapters.includes(targetChapter.id) : false
          reason = passed ? '' : `需要访问过：${targetChapter?.sceneName || cond.value || '未指定章节'}`
          break
        }
        case 'custom':
          passed = true
          reason = cond.description || cond.value || ''
          break
      }

      if (!passed) {
        available = false
        if (reason) reasons.push(reason)
      }
    })

    return { available, reasons }
  },

  addCurseRule: () => set((state) => ({
    project: {
      ...state.project,
      curseRules: [
        ...state.project.curseRules,
        {
          id: uuidv4(),
          name: '新诅咒规则',
          description: '',
          triggerCondition: '',
          curseEffect: '',
          curseDelta: 0,
          chapters: []
        }
      ],
      updatedAt: Date.now()
    }
  })),

  updateCurseRule: (id, updates) => set((state) => ({
    project: {
      ...state.project,
      curseRules: state.project.curseRules.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
      updatedAt: Date.now()
    }
  })),

  deleteCurseRule: (id) => set((state) => ({
    project: {
      ...state.project,
      curseRules: state.project.curseRules.filter((r) => r.id !== id),
      updatedAt: Date.now()
    }
  })),

  addSymbol: (symbol, explanation) => set((state) => ({
    project: {
      ...state.project,
      symbols: { ...state.project.symbols, [symbol]: explanation },
      updatedAt: Date.now()
    }
  })),

  updateSymbol: (symbol, explanation) => set((state) => ({
    project: {
      ...state.project,
      symbols: { ...state.project.symbols, [symbol]: explanation },
      updatedAt: Date.now()
    }
  })),

  deleteSymbol: (symbol) => set((state) => {
    const { [symbol]: _, ...rest } = state.project.symbols
    return {
      project: {
        ...state.project,
        symbols: rest,
        updatedAt: Date.now()
      }
    }
  }),

  runValidation: () => set((state) => ({
    validationIssues: validateProject(state.project)
  })),

  jumpToIssue: (issue) => {
    const { setCurrentPage, setSelectedChapter, setSelectedBranch } = get()
    setCurrentPage('editor')
    if (issue.relatedChapterIds.length > 0) {
      setSelectedChapter(issue.relatedChapterIds[0])
      if (issue.relatedBranchIds && issue.relatedBranchIds.length > 0) {
        setSelectedBranch(issue.relatedBranchIds[0])
      }
    }
  },

  createSnapshot: (name, note) => set((state) => {
    const currentSnapshotsCopy = [...state.project.snapshots]
    const projectForSnapshot = get().getProjectForSave()
    projectForSnapshot.snapshots = currentSnapshotsCopy
    const newSnapshot: Snapshot = {
      id: uuidv4(),
      name,
      note,
      createdAt: Date.now(),
      project: projectForSnapshot
    }
    const newSnapshots = [...currentSnapshotsCopy, newSnapshot]
    return {
      snapshots: newSnapshots,
      project: {
        ...state.project,
        snapshots: newSnapshots,
        updatedAt: Date.now()
      }
    }
  }),

  restoreSnapshot: (snapshotId) => {
    const { snapshots, loadProject } = get()
    const snapshot = snapshots.find(s => s.id === snapshotId)
    if (snapshot) {
      const currentSnapshots = [...get().project.snapshots]
      loadProject(snapshot.project)
      set((state) => ({
        project: {
          ...state.project,
          snapshots: currentSnapshots
        },
        snapshots: currentSnapshots
      }))
    }
  },

  deleteSnapshot: (snapshotId) => set((state) => {
    const newSnapshots = state.project.snapshots.filter(s => s.id !== snapshotId)
    return {
      snapshots: newSnapshots,
      project: {
        ...state.project,
        snapshots: newSnapshots,
        updatedAt: Date.now()
      }
    }
  }),

  generatePlaythroughReport: () => {
    const { playthrough, project } = get()

    const formatDateTime = (ts: number) => {
      const d = new Date(ts)
      const pad = (n: number) => n.toString().padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    }

    if (playthrough.choicesMade.length === 0 && !playthrough.currentChapterId) {
      return `# 试玩测试报告\n\n- 生成时间：${formatDateTime(Date.now())}\n\n## 流程回放\n\n暂无试玩记录\n`
    }

    const firstChapter = project.chapters.find(c => c.id === playthrough.visitedChapters[0])
    const finalChapter = project.chapters.find(c => c.id === playthrough.currentChapterId)
    const status = playthrough.isEnded ? '到达结局' : '中途停止'

    const finalCurseFromHistory = playthrough.choicesMade.length > 0
      ? playthrough.choicesMade[playthrough.choicesMade.length - 1].curseAfter
      : (firstChapter?.currentCurseLevel || 0)

    let report = `# 试玩测试报告\n\n`
    report += `- 生成时间：${formatDateTime(Date.now())}\n`
    report += `- 最终诅咒值：${finalCurseFromHistory}\n`
    report += `- 最终章节：${finalChapter?.sceneName || '未知章节'}\n`
    report += `- 状态：${status}\n\n`

    report += `## 流程回放\n\n`

    let prevItems: string[] = firstChapter?.keyItems ? [...firstChapter.keyItems] : []
    let prevMemories: string[] = []
    let prevForeshadowing: string[] = []

    if (firstChapter) {
      report += `### 第 1 步：${firstChapter.sceneName}（初始章节）\n\n`
      report += `- 场景描述：${firstChapter.narrativeText || '（无描述）'}\n`
      report += `- 氛围：${firstChapter.fearAtmosphere || '（无）'}\n`
      report += `- 进入时诅咒值：${firstChapter.currentCurseLevel}\n`
      if (firstChapter.keyItems.length > 0) {
        report += `- 关键道具（本章节关键）：${firstChapter.keyItems.join('、')}\n`
      }
      report += `\n`
    }

    playthrough.choicesMade.forEach((choice, idx) => {
      const chapter = project.chapters.find(c => c.id === choice.chapterId)
      const branch = chapter?.branches.find(b => b.id === choice.branchId)
      const nextChapter = branch?.nextChapterId
        ? project.chapters.find(c => c.id === branch.nextChapterId)
        : null

      if (!chapter || !branch) return

      report += `**选择：** ${branch.choiceText}\n\n`
      if (branch.cost) {
        report += `- 代价：${branch.cost}\n`
      }

      report += `#### 诅咒值变化明细\n\n`
      report += `- 选择前诅咒值：${choice.curseBefore}\n`

      if (choice.ruleDeltas.length > 0) {
        report += `- 诅咒规则叠加：\n`
        choice.ruleDeltas.forEach(rd => {
          report += `  - ${rd.ruleName}：${rd.delta >= 0 ? '+' : ''}${rd.delta}\n`
        })
      } else {
        report += `- 诅咒规则叠加：（无）\n`
      }
      report += `- 分支诅咒增量：${choice.branchDelta >= 0 ? '+' : ''}${choice.branchDelta}\n`
      if (choice.chapterDelta !== 0) {
        report += `- 章节基础抬升增量：+${choice.chapterDelta}（下一章节基础诅咒高于当前值，已抬升）\n`
      } else {
        report += `- 章节基础抬升增量：0\n`
      }

      const calcTotal = choice.ruleDeltas.reduce((s, r) => s + r.delta, 0) + choice.branchDelta + choice.chapterDelta
      report += `- 净变化：${calcTotal >= 0 ? '+' : ''}${calcTotal}\n`
      report += `- 选择后诅咒值：${choice.curseAfter}`
      if (choice.clampedTo === 'upper') {
        report += `（已被限制到上限 100）`
      } else if (choice.clampedTo === 'lower') {
        report += `（已被限制到下限 0）`
      }
      report += `\n\n`

      const newItems = (nextChapter?.keyItems || []).filter(i => !prevItems.includes(i))
      if (newItems.length > 0) {
        report += `- 获得道具：${newItems.join('、')}\n`
      }

      if (branch.characterMemory && !prevMemories.includes(branch.characterMemory)) {
        report += `- 获得记忆：${branch.characterMemory}\n`
      }

      if (branch.foreshadowing && !prevForeshadowing.includes(branch.foreshadowing)) {
        report += `- 触发伏笔：${branch.foreshadowing}\n`
      }

      report += `\n`

      if (nextChapter) {
        report += `### 第 ${idx + 2} 步：${nextChapter.sceneName}\n\n`
        report += `- 场景描述：${nextChapter.narrativeText || '（无描述）'}\n`
        report += `- 氛围：${nextChapter.fearAtmosphere || '（无）'}\n`
        report += `- 进入时诅咒值：${choice.curseAfter}\n`
        if (nextChapter.keyItems.length > 0) {
          report += `- 关键道具（本章节关键）：${nextChapter.keyItems.join('、')}\n`
        }
        report += `\n`

        prevItems = [...new Set([...prevItems, ...(nextChapter.keyItems || [])])]
      }

      if (branch.characterMemory) {
        prevMemories = [...prevMemories, branch.characterMemory]
      }
      if (branch.foreshadowing) {
        prevForeshadowing = [...prevForeshadowing, branch.foreshadowing]
      }
    })

    report += `## 收集清单\n\n`

    report += `### 获得的道具（${playthrough.collectedItems.length} 个）\n`
    if (playthrough.collectedItems.length === 0) {
      report += `\n- （无）\n`
    } else {
      playthrough.collectedItems.forEach(item => {
        report += `- ${item}\n`
      })
    }
    report += `\n`

    report += `### 获得的记忆（${playthrough.memories.length} 个）\n`
    if (playthrough.memories.length === 0) {
      report += `\n- （无）\n`
    } else {
      playthrough.memories.forEach(mem => {
        report += `- ${mem}\n`
      })
    }
    report += `\n`

    report += `### 触发的伏笔（${playthrough.foreshadowingNotes.length} 个）\n`
    if (playthrough.foreshadowingNotes.length === 0) {
      report += `\n- （无）\n`
    } else {
      playthrough.foreshadowingNotes.forEach(note => {
        report += `- ${note}\n`
      })
    }
    report += `\n`

    const appliedRules = project.curseRules.filter(r => {
      if (!r.chapters || r.chapters.length === 0) return true
      return r.chapters.some(chId => playthrough.visitedChapters.includes(chId))
    })
    report += `## 应用到的诅咒规则\n`
    if (appliedRules.length === 0) {
      report += `\n（无）\n`
    } else {
      appliedRules.forEach(rule => {
        report += `- ${rule.name}：${rule.curseDelta >= 0 ? '+' : ''}${rule.curseDelta}\n`
      })
    }

    return report
  },

  startPlaythrough: () => set((state) => {
    const firstChapter = state.project.chapters[0]
    return {
      playthrough: {
        currentChapterId: firstChapter?.id || null,
        curseValue: firstChapter?.currentCurseLevel || 0,
        memories: [],
        visitedChapters: firstChapter ? [firstChapter.id] : [],
        choicesMade: [],
        foreshadowingNotes: [],
        collectedItems: firstChapter?.keyItems ? [...firstChapter.keyItems] : [],
        isEnded: !firstChapter || firstChapter.isEnding,
        endingType: firstChapter?.isEnding ? firstChapter.endingType : undefined
      }
    }
  }),

  makeChoice: (branchId) => set((state) => {
    const { playthrough, project, checkBranchConditions } = state
    if (!playthrough.currentChapterId || playthrough.isEnded) return state

    const currentChapter = project.chapters.find((ch) => ch.id === playthrough.currentChapterId)
    if (!currentChapter) return state

    const branch = currentChapter.branches.find((br) => br.id === branchId)
    if (!branch) return state

    const check = checkBranchConditions(branch)
    if (!check.available) return state

    const nextChapter = branch.nextChapterId
      ? project.chapters.find((ch) => ch.id === branch.nextChapterId)
      : null

    const curseBefore = playthrough.curseValue

    const ruleDeltas: CurseRuleDelta[] = project.curseRules
      .filter(r => !r.chapters.length || r.chapters.includes(nextChapter?.id || ''))
      .map(r => ({ ruleName: r.name, delta: r.curseDelta || 0 }))
    const ruleDeltaSum = ruleDeltas.reduce((sum, rd) => sum + rd.delta, 0)

    const branchDelta = branch.curseDelta
    const afterRuleAndBranch = curseBefore + branchDelta + ruleDeltaSum

    let chapterDelta = 0
    const afterChapterLift = nextChapter
      ? Math.max(afterRuleAndBranch, nextChapter.currentCurseLevel)
      : afterRuleAndBranch
    if (nextChapter && nextChapter.currentCurseLevel > afterRuleAndBranch) {
      chapterDelta = nextChapter.currentCurseLevel - afterRuleAndBranch
    }

    const clampedValue = Math.min(100, Math.max(0, afterChapterLift))
    let clampedTo: 'upper' | 'lower' | undefined
    if (afterChapterLift > 100) clampedTo = 'upper'
    else if (afterChapterLift < 0) clampedTo = 'lower'

    const curseAfter = clampedValue

    const newMemories = branch.characterMemory
      ? [...playthrough.memories, branch.characterMemory]
      : playthrough.memories

    const newForeshadowing = branch.foreshadowing
      ? [...playthrough.foreshadowingNotes, branch.foreshadowing]
      : playthrough.foreshadowingNotes

    const newItems = nextChapter
      ? [...new Set([...playthrough.collectedItems, ...(nextChapter.keyItems || [])])]
      : playthrough.collectedItems

    const isEnded = !branch.nextChapterId || (nextChapter?.isEnding ?? false)
    let endingType = nextChapter?.isEnding ? nextChapter.endingType : undefined
    if (isEnded && !nextChapter) {
      if (branch.outcomeType === 'death_ending') endingType = 'death'
      else if (branch.outcomeType === 'irreversible_pollution') endingType = 'bad'
    }

    const choiceRecord: PlaythroughChoice = {
      chapterId: playthrough.currentChapterId,
      branchId,
      curseBefore,
      curseAfter,
      ruleDeltas,
      branchDelta,
      chapterDelta,
      clampedTo
    }

    return {
      playthrough: {
        currentChapterId: branch.nextChapterId,
        curseValue: curseAfter,
        memories: newMemories,
        visitedChapters: branch.nextChapterId
          ? [...playthrough.visitedChapters, branch.nextChapterId]
          : playthrough.visitedChapters,
        choicesMade: [...playthrough.choicesMade, choiceRecord],
        foreshadowingNotes: newForeshadowing,
        collectedItems: newItems,
        isEnded,
        endingType
      }
    }
  }),

  resetPlaythrough: () => set({ playthrough: createInitialPlaythrough() }),

  loadProject: (project) => {
    const normalizedChapters = project.chapters.map(ch => ({
      ...ch,
      branches: ch.branches.map(br => ({
        ...br,
        structuredConditions: br.structuredConditions || [],
        symbolOverrides: br.symbolOverrides || {}
      }))
    }))
    const playthroughState = project.playthrough ?? createInitialPlaythrough()
    const uiState = project.uiState ?? {
      currentPage: 'editor' as const,
      selectedChapterIds: [] as string[],
      selectedBranchId: null as string | null
    }
    const projectSnapshots = project.snapshots ?? []
    const lastOpenedAt = project.lastOpenedAt ?? Date.now()
    set({
      project: {
        ...project,
        chapters: normalizedChapters,
        curseRules: project.curseRules.map(r => ({ ...r, curseDelta: r.curseDelta || 0 })),
        playthrough: project.playthrough ?? null,
        snapshots: projectSnapshots,
        lastOpenedAt,
        uiState,
        updatedAt: Date.now()
      },
      snapshots: projectSnapshots,
      selectedChapterId: null,
      selectedChapterIds: uiState.selectedChapterIds,
      selectedBranchId: uiState.selectedBranchId,
      playthrough: playthroughState
    })
  },

  getProjectForSave: () => {
    const state = get()
    return {
      ...state.project,
      snapshots: state.snapshots,
      lastOpenedAt: Date.now(),
      playthrough: state.playthrough,
      uiState: {
        currentPage: state.currentPage,
        selectedChapterIds: state.selectedChapterIds,
        selectedBranchId: state.selectedBranchId
      },
      updatedAt: Date.now()
    }
  }
}))
