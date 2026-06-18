export type BranchOutcomeType = 'normal' | 'mild_mutation' | 'irreversible_pollution' | 'death_ending'

export interface Branch {
  id: string
  choiceText: string
  cost: string
  triggerCondition: string
  characterMemory: string
  outcomeType: BranchOutcomeType
  curseDelta: number
  nextChapterId: string | null
  foreshadowing: string
  symbols: string[]
  notes: string
}

export interface Chapter {
  id: string
  sceneName: string
  fearAtmosphere: string
  keyItems: string[]
  currentCurseLevel: number
  narrativeText: string
  branches: Branch[]
  isEnding: boolean
  endingType?: 'good' | 'bad' | 'neutral' | 'death'
  x: number
  y: number
}

export interface CurseRule {
  id: string
  name: string
  description: string
  triggerCondition: string
  curseEffect: string
  chapters: string[]
}

export interface Project {
  id: string
  title: string
  description: string
  createdAt: number
  updatedAt: number
  chapters: Chapter[]
  curseRules: CurseRule[]
  symbols: Record<string, string>
}

export interface PlaythroughState {
  currentChapterId: string | null
  curseValue: number
  memories: string[]
  visitedChapters: string[]
  choicesMade: { chapterId: string; branchId: string }[]
  foreshadowingNotes: string[]
  isEnded: boolean
  endingType?: string
}

export interface ValidationIssue {
  id: string
  type: 'unclosed_branch' | 'curse_contradiction' | 'unexplained_symbol' | 'orphan_chapter' | 'missing_connection'
  severity: 'warning' | 'error' | 'info'
  title: string
  description: string
  relatedChapterIds: string[]
  relatedBranchIds: string[]
}

export const OUTCOME_TYPE_CONFIG: Record<BranchOutcomeType, { label: string; color: string; bgColor: string; borderColor: string }> = {
  normal: {
    label: '正常进展',
    color: '#e0e0e0',
    bgColor: 'rgba(60, 60, 70, 0.6)',
    borderColor: '#555566'
  },
  mild_mutation: {
    label: '轻微异变',
    color: '#ffd700',
    bgColor: 'rgba(80, 70, 20, 0.6)',
    borderColor: '#b8860b'
  },
  irreversible_pollution: {
    label: '不可逆污染',
    color: '#ff6b6b',
    bgColor: 'rgba(80, 20, 30, 0.6)',
    borderColor: '#8b0000'
  },
  death_ending: {
    label: '死亡结局',
    color: '#c0c0c0',
    bgColor: 'rgba(20, 20, 25, 0.8)',
    borderColor: '#2f2f3f'
  }
}
