import { v4 as uuidv4 } from 'uuid'
import type { Project, ValidationIssue, Chapter } from '../types'

export function validateProject(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  validateUnclosedBranches(project, issues)
  validateCurseContradictions(project, issues)
  validateUnexplainedSymbols(project, issues)
  validateOrphanChapters(project, issues)
  validateMissingConnections(project, issues)
  validateSymbolInconsistent(project, issues)
  validateMissingEndingDescription(project, issues)
  validateRuleConflict(project, issues)
  validateCircularReference(project, issues)

  return issues
}

function validateUnclosedBranches(project: Project, issues: ValidationIssue[]) {
  project.chapters.forEach((chapter) => {
    if (chapter.isEnding) return

    chapter.branches.forEach((branch) => {
      if (!branch.nextChapterId) {
        issues.push({
          id: uuidv4(),
          type: 'unclosed_branch',
          severity: 'warning',
          title: `分支未收束: "${branch.choiceText}"`,
          description: `在章节"${chapter.sceneName}"中，选择"${branch.choiceText}"没有指定后续章节，玩家选择后将直接结束游戏。`,
          relatedChapterIds: [chapter.id],
          relatedBranchIds: [branch.id]
        })
      }
    })

    if (chapter.branches.length === 0 && !chapter.isEnding) {
      issues.push({
        id: uuidv4(),
        type: 'unclosed_branch',
        severity: 'error',
        title: `章节无分支: "${chapter.sceneName}"`,
        description: `章节"${chapter.sceneName}"不是结局章节，但没有任何玩家选择分支，剧情将在此中断。`,
        relatedChapterIds: [chapter.id],
        relatedBranchIds: []
      })
    }
  })
}

function validateCurseContradictions(project: Project, issues: ValidationIssue[]) {
  const chapterMap = new Map<string, Chapter>()
  project.chapters.forEach((ch) => chapterMap.set(ch.id, ch))

  project.chapters.forEach((chapter) => {
    chapter.branches.forEach((branch) => {
      if (!branch.nextChapterId) return
      const nextChapter = chapterMap.get(branch.nextChapterId)
      if (!nextChapter) return

      const expectedMinCurse = chapter.currentCurseLevel + branch.curseDelta
      if (nextChapter.currentCurseLevel < expectedMinCurse - 5) {
        issues.push({
          id: uuidv4(),
          type: 'curse_contradiction',
          severity: 'warning',
          title: `诅咒等级矛盾`,
          description: `从"${chapter.sceneName}"经"${branch.choiceText}"(诅咒${branch.curseDelta >= 0 ? '+' : ''}${branch.curseDelta})到达"${nextChapter.sceneName}"。` +
            `期望最小诅咒值约为 ${expectedMinCurse}，但目标章节诅咒等级为 ${nextChapter.currentCurseLevel}，可能存在设定矛盾。`,
          relatedChapterIds: [chapter.id, nextChapter.id],
          relatedBranchIds: [branch.id]
        })
      }
    })
  })

  project.curseRules.forEach((rule) => {
    if (!rule.triggerCondition || !rule.curseEffect) {
      issues.push({
        id: uuidv4(),
        type: 'curse_contradiction',
        severity: 'info',
        title: `诅咒规则不完整: "${rule.name}"`,
        description: `诅咒规则"${rule.name}"缺少触发条件或效果描述。`,
        relatedChapterIds: rule.chapters,
        relatedBranchIds: []
      })
    }
  })
}

function validateUnexplainedSymbols(project: Project, issues: ValidationIssue[]) {
  const usedSymbols = new Set<string>()

  project.chapters.forEach((chapter) => {
    chapter.branches.forEach((branch) => {
      branch.symbols.forEach((s) => usedSymbols.add(s))
    })
  })

  const explainedSymbols = new Set(Object.keys(project.symbols))

  usedSymbols.forEach((symbol) => {
    if (!explainedSymbols.has(symbol)) {
      const chaptersUsing: string[] = []
      const branchesUsing: string[] = []
      project.chapters.forEach((ch) => {
        ch.branches.forEach((br) => {
          if (br.symbols.includes(symbol)) {
            chaptersUsing.push(ch.id)
            branchesUsing.push(br.id)
          }
        })
      })

      issues.push({
        id: uuidv4(),
        type: 'unexplained_symbol',
        severity: 'warning',
        title: `未解释的符号: "${symbol}"`,
        description: `符号"${symbol}"在剧情中被使用，但在符号词典中没有找到解释。建议补充其含义和来源。`,
        relatedChapterIds: [...new Set(chaptersUsing)],
        relatedBranchIds: branchesUsing
      })
    }
  })

  explainedSymbols.forEach((symbol) => {
    if (!usedSymbols.has(symbol)) {
      issues.push({
        id: uuidv4(),
        type: 'unexplained_symbol',
        severity: 'info',
        title: `未使用的符号定义: "${symbol}"`,
        description: `符号"${symbol}"在词典中有定义，但未在任何剧情分支中使用。`,
        relatedChapterIds: [],
        relatedBranchIds: []
      })
    }
  })
}

function validateOrphanChapters(project: Project, issues: ValidationIssue[]) {
  if (project.chapters.length === 0) return

  const firstChapter = project.chapters[0]
  const reachableIds = new Set<string>([firstChapter.id])
  const chapterMap = new Map<string, Chapter>()
  project.chapters.forEach((ch) => chapterMap.set(ch.id, ch))

  const queue = [firstChapter.id]
  while (queue.length > 0) {
    const currentId = queue.shift()!
    const current = chapterMap.get(currentId)
    if (!current) continue
    current.branches.forEach((br) => {
      if (br.nextChapterId && !reachableIds.has(br.nextChapterId)) {
        reachableIds.add(br.nextChapterId)
        queue.push(br.nextChapterId)
      }
    })
  }

  project.chapters.forEach((ch) => {
    if (!reachableIds.has(ch.id)) {
      issues.push({
        id: uuidv4(),
        type: 'orphan_chapter',
        severity: 'error',
        title: `孤立章节: "${ch.sceneName}"`,
        description: `章节"${ch.sceneName}"无法从起始章节到达，没有任何分支指向它。`,
        relatedChapterIds: [ch.id],
        relatedBranchIds: []
      })
    }
  })
}

function validateMissingConnections(project: Project, issues: ValidationIssue[]) {
  const chapterIds = new Set(project.chapters.map((ch) => ch.id))

  project.chapters.forEach((chapter) => {
    chapter.branches.forEach((branch) => {
      if (branch.nextChapterId && !chapterIds.has(branch.nextChapterId)) {
        issues.push({
          id: uuidv4(),
          type: 'missing_connection',
          severity: 'error',
          title: `分支指向不存在的章节`,
          description: `在"${chapter.sceneName}"中，分支"${branch.choiceText}"指向的后续章节不存在，可能已被删除。`,
          relatedChapterIds: [chapter.id],
          relatedBranchIds: [branch.id]
        })
      }
    })
  })
}

function validateSymbolInconsistent(project: Project, issues: ValidationIssue[]) {
  const symbolBranches = new Map<string, { value: string; chapterName: string; branchId: string }[]>()

  project.chapters.forEach((chapter) => {
    chapter.branches.forEach((branch) => {
      if (!branch.symbolOverrides) return
      Object.entries(branch.symbolOverrides).forEach(([symbol, value]) => {
        if (!symbolBranches.has(symbol)) {
          symbolBranches.set(symbol, [])
        }
        symbolBranches.get(symbol)!.push({
          value,
          chapterName: chapter.sceneName,
          branchId: branch.id
        })
      })
    })
  })

  symbolBranches.forEach((entries, symbol) => {
    const valueMap = new Map<string, string[]>()
    entries.forEach((entry) => {
      if (!valueMap.has(entry.value)) {
        valueMap.set(entry.value, [])
      }
      valueMap.get(entry.value)!.push(entry.chapterName)
    })

    if (valueMap.size > 1) {
      const conflicts = Array.from(valueMap.entries())
        .map(([value, chapters]) => `"${value}" (出现于: ${chapters.join('、')})`)
        .join('；')
      issues.push({
        id: uuidv4(),
        type: 'symbol_inconsistent',
        severity: 'warning',
        title: `符号解释不一致: "${symbol}"`,
        description: `符号"${symbol}"在不同分支有不同的本地化解释：${conflicts}。请统一符号含义，避免玩家困惑。`,
        relatedChapterIds: entries.map((_, i) => project.chapters.find(ch =>
          ch.branches.some(br => br.id === entries[i].branchId)
        )?.id || '').filter(Boolean),
        relatedBranchIds: entries.map(e => e.branchId),
        relatedSymbols: [symbol]
      })
    }
  })
}

function validateMissingEndingDescription(project: Project, issues: ValidationIssue[]) {
  project.chapters.forEach((chapter) => {
    if (chapter.isEnding && (!chapter.endingDescription || chapter.endingDescription.trim() === '')) {
      issues.push({
        id: uuidv4(),
        type: 'missing_ending_description',
        severity: 'warning',
        title: `结局缺少描述: "${chapter.sceneName}"`,
        description: `章节"${chapter.sceneName}"是结局章节，但没有填写结局描述（endingDescription）。建议补充结局的详细说明，让玩家获得完整的体验。`,
        relatedChapterIds: [chapter.id],
        relatedBranchIds: []
      })
    }
  })
}

function validateRuleConflict(project: Project, issues: ValidationIssue[]) {
  const rules = project.curseRules
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const ruleA = rules[i]
      const ruleB = rules[j]

      const chaptersA = new Set(ruleA.chapters)
      const chaptersB = new Set(ruleB.chapters)
      const intersection = [...chaptersA].filter(c => chaptersB.has(c))

      if (intersection.length > 0) {
        if ((ruleA.curseDelta > 0 && ruleB.curseDelta < 0) || (ruleA.curseDelta < 0 && ruleB.curseDelta > 0)) {
          const chapterNames = intersection
            .map(id => project.chapters.find(ch => ch.id === id)?.sceneName || id)
            .join('、')
          issues.push({
            id: uuidv4(),
            type: 'rule_conflict',
            severity: 'warning',
            title: `诅咒规则冲突: "${ruleA.name}" vs "${ruleB.name}"`,
            description: `规则"${ruleA.name}"(诅咒${ruleA.curseDelta >= 0 ? '+' : ''}${ruleA.curseDelta})与规则"${ruleB.name}"(诅咒${ruleB.curseDelta >= 0 ? '+' : ''}${ruleB.curseDelta})在相同章节（${chapterNames}）中同时生效，一个增加诅咒一个减少诅咒，可能导致逻辑混乱。`,
            relatedChapterIds: intersection,
            relatedBranchIds: [],
            relatedRuleIds: [ruleA.id, ruleB.id]
          })
        }
      }
    }
  }
}

function validateCircularReference(project: Project, issues: ValidationIssue[]) {
  if (project.chapters.length === 0) return

  const chapterMap = new Map<string, Chapter>()
  project.chapters.forEach((ch) => chapterMap.set(ch.id, ch))

  const firstChapter = project.chapters[0]
  const visited = new Set<string>()
  const path: string[] = []

  function dfs(chapterId: string): boolean {
    if (visited.has(chapterId)) {
      const cycleStart = path.indexOf(chapterId)
      if (cycleStart !== -1) {
        const cycleChapters = path.slice(cycleStart)
        cycleChapters.push(chapterId)
        const cycleNames = cycleChapters
          .map(id => chapterMap.get(id)?.sceneName || id)
          .join(' → ')
        issues.push({
          id: uuidv4(),
          type: 'circular_reference',
          severity: 'error',
          title: `检测到循环引用`,
          description: `剧情中存在循环：${cycleNames}。这会导致玩家陷入无限循环，无法正常推进或结束游戏。`,
          relatedChapterIds: cycleChapters,
          relatedBranchIds: []
        })
        return true
      }
      return false
    }

    visited.add(chapterId)
    path.push(chapterId)

    const chapter = chapterMap.get(chapterId)
    if (!chapter) {
      path.pop()
      return false
    }

    for (const branch of chapter.branches) {
      if (branch.nextChapterId) {
        if (dfs(branch.nextChapterId)) {
          path.pop()
          return true
        }
      }
    }

    path.pop()
    return false
  }

  dfs(firstChapter.id)
}
