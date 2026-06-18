import { v4 as uuidv4 } from 'uuid'
import type { Project, ValidationIssue, Chapter, Branch } from '../types'

function findUpstreamChapters(chapterId: string, chapters: Chapter[]): string[] {
  const result: string[] = []
  chapters.forEach((ch) => {
    ch.branches.forEach((br) => {
      if (br.nextChapterId === chapterId) {
        if (!result.includes(ch.id)) {
          result.push(ch.id)
        }
      }
    })
  })
  return result
}

function findDownstreamChapters(chapterId: string, chapters: Chapter[]): string[] {
  const chapter = chapters.find((ch) => ch.id === chapterId)
  if (!chapter) return []
  const result: string[] = []
  chapter.branches.forEach((br) => {
    if (br.nextChapterId && !result.includes(br.nextChapterId)) {
      result.push(br.nextChapterId)
    }
  })
  return result
}

function findUpstreamBranches(chapterId: string, chapters: Chapter[]): string[] {
  const result: string[] = []
  chapters.forEach((ch) => {
    ch.branches.forEach((br) => {
      if (br.nextChapterId === chapterId) {
        result.push(br.id)
      }
    })
  })
  return result
}

function findDownstreamBranches(chapterId: string, chapters: Chapter[]): string[] {
  const chapter = chapters.find((ch) => ch.id === chapterId)
  if (!chapter) return []
  return chapter.branches.map((br) => br.id)
}

function collectLinkInfo(
  chapterIds: string[],
  chapters: Chapter[]
): {
  upstreamChapterIds: string[]
  downstreamChapterIds: string[]
  upstreamBranchIds: string[]
  downstreamBranchIds: string[]
} {
  const upstreamChapterIds = new Set<string>()
  const downstreamChapterIds = new Set<string>()
  const upstreamBranchIds = new Set<string>()
  const downstreamBranchIds = new Set<string>()

  chapterIds.forEach((cid) => {
    findUpstreamChapters(cid, chapters).forEach((id) => upstreamChapterIds.add(id))
    findDownstreamChapters(cid, chapters).forEach((id) => downstreamChapterIds.add(id))
    findUpstreamBranches(cid, chapters).forEach((id) => upstreamBranchIds.add(id))
    findDownstreamBranches(cid, chapters).forEach((id) => downstreamBranchIds.add(id))
  })

  return {
    upstreamChapterIds: Array.from(upstreamChapterIds),
    downstreamChapterIds: Array.from(downstreamChapterIds),
    upstreamBranchIds: Array.from(upstreamBranchIds),
    downstreamBranchIds: Array.from(downstreamBranchIds)
  }
}

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
  validateEmptyConditions(project, issues)

  return issues
}

function validateUnclosedBranches(project: Project, issues: ValidationIssue[]) {
  project.chapters.forEach((chapter) => {
    if (chapter.isEnding) return

    chapter.branches.forEach((branch) => {
      if (!branch.nextChapterId) {
        const linkInfo = collectLinkInfo([chapter.id], project.chapters)
        issues.push({
          id: uuidv4(),
          type: 'unclosed_branch',
          severity: 'warning',
          title: `分支未收束: "${branch.choiceText}"`,
          description: `在章节"${chapter.sceneName}"中，选择"${branch.choiceText}"没有指定后续章节，玩家选择后将直接结束游戏。`,
          relatedChapterIds: [chapter.id],
          relatedBranchIds: [branch.id],
          ...linkInfo,
          fixItems: [
            {
              id: uuidv4(),
              description: '连接分支「' + branch.choiceText + '」到一个后续章节',
              targetChapterId: chapter.id,
              targetBranchId: branch.id,
              actionType: 'connect_branch'
            }
          ]
        })
      }
    })

    if (chapter.branches.length === 0 && !chapter.isEnding) {
      const linkInfo = collectLinkInfo([chapter.id], project.chapters)
      issues.push({
        id: uuidv4(),
        type: 'unclosed_branch',
        severity: 'error',
        title: `章节无分支: "${chapter.sceneName}"`,
        description: `章节"${chapter.sceneName}"不是结局章节，但没有任何玩家选择分支，剧情将在此中断。`,
        relatedChapterIds: [chapter.id],
        relatedBranchIds: [],
        ...linkInfo,
        fixItems: [
          {
            id: uuidv4(),
            description: '为章节「' + chapter.sceneName + '」添加分支或标记为结局',
            targetChapterId: chapter.id,
            actionType: 'custom'
          }
        ]
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
        const linkInfo = collectLinkInfo([chapter.id, nextChapter.id], project.chapters)
        issues.push({
          id: uuidv4(),
          type: 'curse_contradiction',
          severity: 'warning',
          title: `诅咒等级矛盾`,
          description: `从"${chapter.sceneName}"经"${branch.choiceText}"(诅咒${branch.curseDelta >= 0 ? '+' : ''}${branch.curseDelta})到达"${nextChapter.sceneName}"。` +
            `期望最小诅咒值约为 ${expectedMinCurse}，但目标章节诅咒等级为 ${nextChapter.currentCurseLevel}，可能存在设定矛盾。`,
          relatedChapterIds: [chapter.id, nextChapter.id],
          relatedBranchIds: [branch.id],
          ...linkInfo,
          fixItems: [
            {
              id: uuidv4(),
              description: '调整目标章节「' + nextChapter.sceneName + '」的诅咒等级',
              targetChapterId: nextChapter.id,
              actionType: 'custom'
            },
            {
              id: uuidv4(),
              description: '调整分支「' + branch.choiceText + '」的诅咒增量',
              targetChapterId: chapter.id,
              targetBranchId: branch.id,
              actionType: 'custom'
            }
          ]
        })
      }
    })
  })

  project.curseRules.forEach((rule) => {
    if (!rule.triggerCondition || !rule.curseEffect) {
      const linkInfo = collectLinkInfo(rule.chapters, project.chapters)
      issues.push({
        id: uuidv4(),
        type: 'curse_contradiction',
        severity: 'info',
        title: `诅咒规则不完整: "${rule.name}"`,
        description: `诅咒规则"${rule.name}"缺少触发条件或效果描述。`,
        relatedChapterIds: rule.chapters,
        relatedBranchIds: [],
        relatedRuleIds: [rule.id],
        ...linkInfo,
        fixItems: [
          {
            id: uuidv4(),
            description: '补充规则「' + rule.name + '」的触发条件和效果',
            actionType: 'custom'
          }
        ]
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

      const uniqueChapterIds = [...new Set(chaptersUsing)]
      const linkInfo = collectLinkInfo(uniqueChapterIds, project.chapters)
      issues.push({
        id: uuidv4(),
        type: 'unexplained_symbol',
        severity: 'warning',
        title: `未解释的符号: "${symbol}"`,
        description: `符号"${symbol}"在剧情中被使用，但在符号词典中没有找到解释。建议补充其含义和来源。`,
        relatedChapterIds: uniqueChapterIds,
        relatedBranchIds: branchesUsing,
        relatedSymbols: [symbol],
        ...linkInfo,
        fixItems: [
          {
            id: uuidv4(),
            description: '在符号词典中添加「' + symbol + '」的解释',
            actionType: 'add_symbol_explanation'
          }
        ]
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
        relatedBranchIds: [],
        relatedSymbols: [symbol],
        upstreamChapterIds: [],
        downstreamChapterIds: [],
        upstreamBranchIds: [],
        downstreamBranchIds: [],
        fixItems: [
          {
            id: uuidv4(),
            description: '删除或在剧情中使用符号「' + symbol + '」',
            actionType: 'custom'
          }
        ]
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
      const linkInfo = collectLinkInfo([ch.id], project.chapters)
      issues.push({
        id: uuidv4(),
        type: 'orphan_chapter',
        severity: 'error',
        title: `孤立章节: "${ch.sceneName}"`,
        description: `章节"${ch.sceneName}"无法从起始章节到达，没有任何分支指向它。`,
        relatedChapterIds: [ch.id],
        relatedBranchIds: [],
        ...linkInfo,
        fixItems: [
          {
            id: uuidv4(),
            description: '添加其他分支指向章节「' + ch.sceneName + '」',
            targetChapterId: ch.id,
            actionType: 'connect_branch'
          }
        ]
      })
    }
  })
}

function validateMissingConnections(project: Project, issues: ValidationIssue[]) {
  const chapterIds = new Set(project.chapters.map((ch) => ch.id))

  project.chapters.forEach((chapter) => {
    chapter.branches.forEach((branch) => {
      if (branch.nextChapterId && !chapterIds.has(branch.nextChapterId)) {
        const linkInfo = collectLinkInfo([chapter.id], project.chapters)
        issues.push({
          id: uuidv4(),
          type: 'missing_connection',
          severity: 'error',
          title: `分支指向不存在的章节`,
          description: `在"${chapter.sceneName}"中，分支"${branch.choiceText}"指向的后续章节不存在，可能已被删除。`,
          relatedChapterIds: [chapter.id],
          relatedBranchIds: [branch.id],
          ...linkInfo,
          fixItems: [
            {
              id: uuidv4(),
              description: '将分支「' + branch.choiceText + '」重新连接到存在的章节',
              targetChapterId: chapter.id,
              targetBranchId: branch.id,
              actionType: 'connect_branch'
            }
          ]
        })
      }
    })
  })
}

function validateSymbolInconsistent(project: Project, issues: ValidationIssue[]) {
  const symbolBranches = new Map<string, { value: string; chapter: Chapter; branch: Branch }[]>()

  project.chapters.forEach((chapter) => {
    chapter.branches.forEach((branch) => {
      if (!branch.symbolOverrides) return
      Object.entries(branch.symbolOverrides).forEach(([symbol, value]) => {
        if (!symbolBranches.has(symbol)) {
          symbolBranches.set(symbol, [])
        }
        symbolBranches.get(symbol)!.push({
          value,
          chapter,
          branch
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
      valueMap.get(entry.value)!.push(entry.chapter.sceneName)
    })

    if (valueMap.size > 1) {
      const conflicts = Array.from(valueMap.entries())
        .map(([value, chapters]) => `"${value}" (出现于: ${chapters.join('、')})`)
        .join('；')
      const relatedChapterIds = entries.map(e => e.chapter.id)
      const linkInfo = collectLinkInfo(relatedChapterIds, project.chapters)

      const fixItems = entries.map((entry) => ({
        id: uuidv4(),
        description: '统一分支「' + entry.branch.choiceText + '」中符号「' + symbol + '」的解释',
        targetChapterId: entry.chapter.id,
        targetBranchId: entry.branch.id,
        actionType: 'add_symbol_explanation' as const
      }))

      issues.push({
        id: uuidv4(),
        type: 'symbol_inconsistent',
        severity: 'warning',
        title: `符号解释不一致: "${symbol}"`,
        description: `符号"${symbol}"在不同分支有不同的本地化解释：${conflicts}。请统一符号含义，避免玩家困惑。`,
        relatedChapterIds,
        relatedBranchIds: entries.map(e => e.branch.id),
        relatedSymbols: [symbol],
        ...linkInfo,
        fixItems
      })
    }
  })
}

function validateMissingEndingDescription(project: Project, issues: ValidationIssue[]) {
  project.chapters.forEach((chapter) => {
    if (chapter.isEnding && (!chapter.endingDescription || chapter.endingDescription.trim() === '')) {
      const linkInfo = collectLinkInfo([chapter.id], project.chapters)
      issues.push({
        id: uuidv4(),
        type: 'missing_ending_description',
        severity: 'warning',
        title: `结局缺少描述: "${chapter.sceneName}"`,
        description: `章节"${chapter.sceneName}"是结局章节，但没有填写结局描述（endingDescription）。建议补充结局的详细说明，让玩家获得完整的体验。`,
        relatedChapterIds: [chapter.id],
        relatedBranchIds: [],
        ...linkInfo,
        fixItems: [
          {
            id: uuidv4(),
            description: '为结局章节「' + chapter.sceneName + '」填写结局描述',
            targetChapterId: chapter.id,
            actionType: 'write_ending'
          }
        ]
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
          const linkInfo = collectLinkInfo(intersection, project.chapters)
          issues.push({
            id: uuidv4(),
            type: 'rule_conflict',
            severity: 'warning',
            title: `诅咒规则冲突: "${ruleA.name}" vs "${ruleB.name}"`,
            description: `规则"${ruleA.name}"(诅咒${ruleA.curseDelta >= 0 ? '+' : ''}${ruleA.curseDelta})与规则"${ruleB.name}"(诅咒${ruleB.curseDelta >= 0 ? '+' : ''}${ruleB.curseDelta})在相同章节（${chapterNames}）中同时生效，一个增加诅咒一个减少诅咒，可能导致逻辑混乱。`,
            relatedChapterIds: intersection,
            relatedBranchIds: [],
            relatedRuleIds: [ruleA.id, ruleB.id],
            ...linkInfo,
            fixItems: [
              {
                id: uuidv4(),
                description: '修正规则「' + ruleA.name + '」和「' + ruleB.name + '」在相同章节的诅咒增量冲突',
                actionType: 'resolve_rule_conflict'
              }
            ]
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
        const linkInfo = collectLinkInfo(cycleChapters, project.chapters)

        const fixItems: {
          id: string
          description: string
          targetChapterId?: string
          targetBranchId?: string
          actionType: 'close_loop'
        }[] = []

        for (let i = 0; i < cycleChapters.length - 1; i++) {
          const currentId = cycleChapters[i]
          const nextId = cycleChapters[i + 1]
          const currentChapter = chapterMap.get(currentId)
          const nextChapter = chapterMap.get(nextId)
          if (!currentChapter || !nextChapter) continue

          const connectingBranch = currentChapter.branches.find(br => br.nextChapterId === nextId)
          if (connectingBranch) {
            fixItems.push({
              id: uuidv4(),
              description: '打断 ' + currentChapter.sceneName + ' → ' + nextChapter.sceneName + ' 的循环连接',
              targetChapterId: currentId,
              targetBranchId: connectingBranch.id,
              actionType: 'close_loop'
            })
          }
        }

        issues.push({
          id: uuidv4(),
          type: 'circular_reference',
          severity: 'error',
          title: `检测到循环引用`,
          description: `剧情中存在循环：${cycleNames}。这会导致玩家陷入无限循环，无法正常推进或结束游戏。`,
          relatedChapterIds: cycleChapters,
          relatedBranchIds: fixItems.map(f => f.targetBranchId!).filter(Boolean),
          ...linkInfo,
          fixItems
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

function validateEmptyConditions(project: Project, issues: ValidationIssue[]) {
  project.chapters.forEach((chapter) => {
    chapter.branches.forEach((branch) => {
      if (branch.structuredConditions && branch.structuredConditions.length > 0) {
        const emptyConditions = branch.structuredConditions.filter(
          (cond) => !cond.value && !cond.description
        )
        if (emptyConditions.length > 0) {
          const linkInfo = collectLinkInfo([chapter.id], project.chapters)
          issues.push({
            id: uuidv4(),
            type: 'empty_conditions',
            severity: 'info',
            title: `分支条件为空: "${branch.choiceText}"`,
            description: `在章节"${chapter.sceneName}"中，分支"${branch.choiceText}"存在未填写的条件项（共 ${emptyConditions.length} 条）。`,
            relatedChapterIds: [chapter.id],
            relatedBranchIds: [branch.id],
            ...linkInfo,
            fixItems: [
              {
                id: uuidv4(),
                description: '填写或删除分支「' + branch.choiceText + '」中的空条件',
                targetChapterId: chapter.id,
                targetBranchId: branch.id,
                actionType: 'custom'
              }
            ]
          })
        }
      }
    })
  })
}
