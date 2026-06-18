import { v4 as uuidv4 } from 'uuid'
import type { Project, ValidationIssue, Chapter } from '../types'

export function validateProject(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  validateUnclosedBranches(project, issues)
  validateCurseContradictions(project, issues)
  validateUnexplainedSymbols(project, issues)
  validateOrphanChapters(project, issues)
  validateMissingConnections(project, issues)

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
