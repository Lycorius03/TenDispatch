import type { GameRecord } from './GameRepository'

// 排行榜排序优先级：总分、PERFECT 数、最大 Combo、完成时间、平均决策速度、提示次数。
export const compareRanking = (a: GameRecord, b: GameRecord) => b.score - a.score
  || (b.breakdown.perfectCount ?? b.behavior.perfectCount ?? 0) - (a.breakdown.perfectCount ?? a.behavior.perfectCount ?? 0)
  || (b.breakdown.maxCombo ?? b.behavior.maxCombo ?? 0) - (a.breakdown.maxCombo ?? a.behavior.maxCombo ?? 0)
  || a.duration - b.duration
  || (a.breakdown.averageDecisionMs ?? a.behavior.averageDecisionMs ?? a.duration * 1000) - (b.breakdown.averageDecisionMs ?? b.behavior.averageDecisionMs ?? b.duration * 1000)
  || a.hintCount - b.hintCount

// 同一个呼号在榜上只占一行，取其中最好的一局。
export const nicknameKey = (nickname: string) => nickname.trim().toLocaleLowerCase()

export const bestRecordPerNickname = (records: GameRecord[]): GameRecord[] => {
  const best = new Map<string, GameRecord>()
  for (const record of records) {
    const key = nicknameKey(record.nickname)
    const current = best.get(key)
    if (!current || compareRanking(record, current) < 0) best.set(key, record)
  }
  // Array.from：ES5 转译下展开 Map 迭代器会变成空数组。
  return Array.from(best.values()).sort(compareRanking)
}

export const bestRecordOf = (records: GameRecord[], nickname: string): GameRecord | undefined =>
  bestRecordPerNickname(records).find((record) => nicknameKey(record.nickname) === nicknameKey(nickname))
