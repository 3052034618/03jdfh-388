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
  selectedBranchId: string | null
  playthrough: PlaythroughState
  validationIssues: ValidationIssue[]

  setCurrentPage: (page: 'editor' | 'validator' | 'playthrough') => void
  setSelectedChapter: (id: string | null) => void
  setSelectedBranch: (id: string | null) => void

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
  symbols: {}
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
  selectedBranchId: null,
  playthrough: createInitialPlaythrough(),
  validationIssues: [],

  setCurrentPage: (page) => set({ currentPage: page }),
  setSelectedChapter: (id) => set({ selectedChapterId: id, selectedBranchId: null }),
  setSelectedBranch: (id) => set({ selectedBranchId: id }),

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
    set({
      project: {
        ...project,
        chapters: normalizedChapters,
        curseRules: project.curseRules.map(r => ({ ...r, curseDelta: r.curseDelta || 0 })),
        updatedAt: Date.now()
      },
      selectedChapterId: null,
      selectedBranchId: null
    })
  },

  getProjectForSave: () => {
    const state = get()
    return { ...state.project, updatedAt: Date.now() }
  }
}))
