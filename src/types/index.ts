export type BranchOutcomeType = 'normal' | 'mild_mutation' | 'irreversible_pollution' | 'death_ending'

export type ConditionOperator = 'has_item' | 'no_item' | 'has_memory' | 'has_foreshadowing' | 'curse_min' | 'curse_max' | 'visited_chapter' | 'custom'

export interface TriggerConditionItem {
  id: string
  type: ConditionOperator
  value: string
  description: string
}

export interface Branch {
  id: string
  choiceText: string
  cost: string
  triggerCondition: string
  structuredConditions: TriggerConditionItem[]
  characterMemory: string
  outcomeType: BranchOutcomeType
  curseDelta: number
  nextChapterId: string | null
  foreshadowing: string
  symbols: string[]
  symbolOverrides: Record<string, string>
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
  endingDescription?: string
  x: number
  y: number
}

export interface CurseRule {
  id: string
  name: string
  description: string
  triggerCondition: string
  curseEffect: string
  curseDelta: number
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
  playthrough: PlaythroughState | null
  uiState: {
    currentPage: 'editor' | 'validator' | 'playthrough'
    selectedChapterIds: string[]
    selectedBranchId: string | null
  }
}

export interface PlaythroughState {
  currentChapterId: string | null
  curseValue: number
  memories: string[]
  visitedChapters: string[]
  choicesMade: { chapterId: string; branchId: string }[]
  foreshadowingNotes: string[]
  collectedItems: string[]
  isEnded: boolean
  endingType?: string
}

export type ValidationIssueType =
  | 'unclosed_branch'
  | 'curse_contradiction'
  | 'unexplained_symbol'
  | 'symbol_inconsistent'
  | 'orphan_chapter'
  | 'missing_connection'
  | 'missing_ending_description'
  | 'rule_conflict'
  | 'empty_conditions'
  | 'circular_reference'

export interface ValidationIssue {
  id: string
  type: ValidationIssueType
  severity: 'warning' | 'error' | 'info'
  title: string
  description: string
  relatedChapterIds: string[]
  relatedBranchIds: string[]
  relatedRuleIds?: string[]
  relatedSymbols?: string[]
  upstreamChapterIds: string[]
  downstreamChapterIds: string[]
  upstreamBranchIds: string[]
  downstreamBranchIds: string[]
}

export interface ConditionCheckResult {
  available: boolean
  reasons: string[]
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

export const CONDITION_TYPE_LABELS: Record<ConditionOperator, { label: string; icon: string }> = {
  has_item: { label: '拥有道具', icon: '🎒' },
  no_item: { label: '未拥有道具', icon: '🚫' },
  has_memory: { label: '拥有记忆', icon: '🧠' },
  has_foreshadowing: { label: '触发伏笔', icon: '🌑' },
  curse_min: { label: '诅咒值 >=', icon: '💀' },
  curse_max: { label: '诅咒值 <=', icon: '✨' },
  visited_chapter: { label: '访问过章节', icon: '📍' },
  custom: { label: '自定义条件', icon: '📝' }
}
