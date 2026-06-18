import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type {
  Project, Chapter, Branch, CurseRule, PlaythroughState,
  ValidationIssue, ConditionCheckResult, TriggerConditionItem
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

  setCurrentPage: (page: 'editor' | 'validator' | 'playthrough') => void
  setSelectedChapter: (id: string | null) => void
  setSelectedBranch: (id: string | null) => void
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

  setCurrentPage: (page) => set({ currentPage: page }),
  setSelectedChapter: (id) => set({ selectedChapterId: id, selectedChapterIds: id ? [id] : [], selectedBranchId: null }),
  setSelectedBranch: (id) => set({ selectedBranchId: id }),
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

    const ruleDelta = project.curseRules
      .filter(r => !r.chapters.length || r.chapters.includes(nextChapter?.id || ''))
      .reduce((sum, r) => sum + (r.curseDelta || 0), 0)

    const newCurseValue = playthrough.curseValue + branch.curseDelta + ruleDelta

    const newMemories = branch.characterMemory
      ? [...playthrough.memories, branch.characterMemory]
      : playthrough.memories

    const newForeshadowing = branch.foreshadowing
      ? [...playthrough.foreshadowingNotes, branch.foreshadowing]
      : playthrough.foreshadowingNotes

    const newItems = nextChapter
      ? [...new Set([...playthrough.collectedItems, ...(nextChapter.keyItems || [])])]
      : playthrough.collectedItems

    const finalCurseValue = nextChapter
      ? Math.max(newCurseValue, nextChapter.currentCurseLevel)
      : newCurseValue

    const isEnded = !branch.nextChapterId || (nextChapter?.isEnding ?? false)
    let endingType = nextChapter?.isEnding ? nextChapter.endingType : undefined
    if (isEnded && !nextChapter) {
      if (branch.outcomeType === 'death_ending') endingType = 'death'
      else if (branch.outcomeType === 'irreversible_pollution') endingType = 'bad'
    }

    return {
      playthrough: {
        currentChapterId: branch.nextChapterId,
        curseValue: Math.min(100, Math.max(0, finalCurseValue)),
        memories: newMemories,
        visitedChapters: branch.nextChapterId
          ? [...playthrough.visitedChapters, branch.nextChapterId]
          : playthrough.visitedChapters,
        choicesMade: [...playthrough.choicesMade, { chapterId: playthrough.currentChapterId, branchId }],
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
    set({
      project: {
        ...project,
        chapters: normalizedChapters,
        curseRules: project.curseRules.map(r => ({ ...r, curseDelta: r.curseDelta || 0 })),
        playthrough: project.playthrough ?? null,
        uiState,
        updatedAt: Date.now()
      },
      currentPage: uiState.currentPage,
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
