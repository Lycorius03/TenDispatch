import type { GameRecord, GameRepository } from './GameRepository'
import { getDailySeed, randomNickname } from '../config/difficulty'

const RECORDS_KEY = 'tendispatch.records.v1'
const PLAYER_NICKNAME_KEY = 'tendispatch.player-nickname.v1'

export class LocalRepository implements GameRepository {
  save(record: GameRecord) {
    if (typeof localStorage === 'undefined') return
    const records = this.bestRecords([...this.readRecords(), record])
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records.slice(-100)))
  }

  getRankings(view: 'today' | 'overall' = 'overall') {
    let records = this.bestRecords(this.readRecords())
    if (view === 'today') records = records.filter((record) => record.mode === 'ranked' && record.dailySeed === getDailySeed())
    return records.sort((a, b) => this.compareRanking(a, b))
  }

  nextAnonymousName() {
    const next = this.nextRandomPlayerNickname()
    this.savePlayerNickname(next)
    return next
  }

  getOrCreatePlayerNickname() {
    if (typeof localStorage === 'undefined') return randomNickname()
    const saved = localStorage.getItem(PLAYER_NICKNAME_KEY)?.trim()
    if (saved) return saved
    const next = this.nextRandomPlayerNickname()
    this.savePlayerNickname(next)
    return next
  }

  savePlayerNickname(nickname: string) {
    const value = nickname.trim()
    if (value && typeof localStorage !== 'undefined') localStorage.setItem(PLAYER_NICKNAME_KEY, value)
  }

  nextRandomPlayerNickname() {
    const used = new Set(this.readRecords().map(record => record.nickname))
    const current = typeof localStorage === 'undefined' ? undefined : localStorage.getItem(PLAYER_NICKNAME_KEY)?.trim()
    if (current) used.add(current)
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const next = randomNickname()
      if (!used.has(next)) return next
    }
    return `开源调度员${Date.now()}`
  }

  private readRecords(): GameRecord[] {
    if (typeof localStorage === 'undefined') return []
    try {
      return JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '[]') as GameRecord[]
    } catch {
      return []
    }
  }

  private bestRecords(records: GameRecord[]) {
    const best = new Map<string, GameRecord>()
    for (const record of records) {
      const identity = record.mode === 'ranked'
        ? `${record.nickname}\u0000ranked\u0000${record.dailySeed ?? 'unknown'}`
        : `${record.nickname}\u0000${record.difficulty ?? 'legacy'}`
      const current = best.get(identity)
      if (!current || this.isBetter(record, current)) best.set(identity, record)
    }
    return Array.from(best.values())
  }

  private isBetter(candidate: GameRecord, current: GameRecord) {
    return this.compareRanking(candidate, current) < 0
  }

  private compareRanking(a: GameRecord, b: GameRecord) {
    return b.score - a.score
      || (b.breakdown.perfectCount ?? b.behavior.perfectCount ?? 0) - (a.breakdown.perfectCount ?? a.behavior.perfectCount ?? 0)
      || (b.breakdown.maxCombo ?? b.behavior.maxCombo ?? 0) - (a.breakdown.maxCombo ?? a.behavior.maxCombo ?? 0)
      || a.duration - b.duration
      || (a.breakdown.averageDecisionMs ?? a.behavior.averageDecisionMs ?? a.duration * 1000) - (b.breakdown.averageDecisionMs ?? b.behavior.averageDecisionMs ?? b.duration * 1000)
      || a.hintCount - b.hintCount
  }
}
