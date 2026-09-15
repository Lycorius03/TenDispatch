import type { GameRecord, GameRepository } from './GameRepository'

const RECORDS_KEY = 'tendispatch.records.v1'
const PLAYER_COUNT_KEY = 'tendispatch.player-count.v1'

export class LocalRepository implements GameRepository {
  save(record: GameRecord) {
    const records = this.readRecords()
    localStorage.setItem(RECORDS_KEY, JSON.stringify([...records, record].slice(-100)))
  }

  getRankings() {
    return this.readRecords().sort((a, b) => b.score - a.score || a.hintCount - b.hintCount || a.duration - b.duration)
  }

  nextAnonymousName() {
    const next = Number(localStorage.getItem(PLAYER_COUNT_KEY) ?? 0) + 1
    localStorage.setItem(PLAYER_COUNT_KEY, String(next))
    return `Player_${String(next).padStart(3, '0')}`
  }

  private readRecords(): GameRecord[] {
    try {
      return JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '[]') as GameRecord[]
    } catch {
      return []
    }
  }
}
