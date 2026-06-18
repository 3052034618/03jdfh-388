import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Project, Chapter, Branch, CurseRule, PlaythroughState, BranchOutcomeType, ValidationIssue } from '../types'
import { validateProject } from '../utils/validation'

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

  addChapter: (sceneName: string) => void
  updateChapter: (id: string, updates: Partial<Chapter>) => void
  deleteChapter: (id: string) => void
  duplicateChapter: (id: string) => void

  addBranch: (chapterId: string, choiceText: string) => void
  updateBranch: (chapterId: string, branchId: string, updates: Partial<Branch>) => void
  deleteBranch: (chapterId: string, branchId: string) => void

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
  isEnded: false
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

  addChapter: (sceneName) => set((state) => {
    const newChapter: Chapter = {
      id: uuidv4(),
      sceneName,
      fearAtmosphere: '',
      keyItems: [],
      currentCurseLevel: state.project.chapters.length === 0 ? 0 : 5,
      narrativeText: '',
      branches: [],
      isEnding: false,
      x: 100 + state.project.chapters.length * 50,
      y: 100 + state.project.chapters.length * 30
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
    copy.branches = original.branches.map((br) => ({ ...br, id: uuidv4() }))
    return {
      project: {
        ...state.project,
        chapters: [...state.project.chapters, copy],
        updatedAt: Date.now()
      }
    }
  }),

  addBranch: (chapterId, choiceText) => set((state) => ({
    project: {
      ...state.project,
      chapters: state.project.chapters.map((ch) => {
        if (ch.id !== chapterId) return ch
        const newBranch: Branch = {
          id: uuidv4(),
          choiceText,
          cost: '',
          triggerCondition: '',
          characterMemory: '',
          outcomeType: 'normal',
          curseDelta: 0,
          nextChapterId: null,
          foreshadowing: '',
          symbols: [],
          notes: ''
        }
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
        isEnded: !firstChapter || firstChapter.isEnding,
        endingType: firstChapter?.isEnding ? firstChapter.endingType : undefined
      }
    }
  }),

  makeChoice: (branchId) => set((state) => {
    const { playthrough, project } = state
    if (!playthrough.currentChapterId || playthrough.isEnded) return state

    const currentChapter = project.chapters.find((ch) => ch.id === playthrough.currentChapterId)
    if (!currentChapter) return state

    const branch = currentChapter.branches.find((br) => br.id === branchId)
    if (!branch) return state

    const newCurseValue = playthrough.curseValue + branch.curseDelta
    const newMemories = branch.characterMemory
      ? [...playthrough.memories, branch.characterMemory]
      : playthrough.memories
    const newForeshadowing = branch.foreshadowing
      ? [...playthrough.foreshadowingNotes, branch.foreshadowing]
      : playthrough.foreshadowingNotes

    const nextChapter = branch.nextChapterId
      ? project.chapters.find((ch) => ch.id === branch.nextChapterId)
      : null

    const finalCurseValue = nextChapter ? Math.max(newCurseValue, nextChapter.currentCurseLevel) : newCurseValue

    return {
      playthrough: {
        currentChapterId: branch.nextChapterId,
        curseValue: finalCurseValue,
        memories: newMemories,
        visitedChapters: branch.nextChapterId
          ? [...playthrough.visitedChapters, branch.nextChapterId]
          : playthrough.visitedChapters,
        choicesMade: [...playthrough.choicesMade, { chapterId: playthrough.currentChapterId, branchId }],
        foreshadowingNotes: newForeshadowing,
        isEnded: !branch.nextChapterId || (nextChapter?.isEnding ?? false),
        endingType: nextChapter?.isEnding ? nextChapter.endingType : undefined
      }
    }
  }),

  resetPlaythrough: () => set({ playthrough: createInitialPlaythrough() }),

  loadProject: (project) => set({
    project: { ...project, updatedAt: Date.now() },
    selectedChapterId: null,
    selectedBranchId: null
  }),

  getProjectForSave: () => {
    const state = get()
    return { ...state.project, updatedAt: Date.now() }
  }
}))
