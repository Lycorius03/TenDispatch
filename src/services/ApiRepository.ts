import type { GameRecord, GameRepository } from './GameRepository'

export class ApiRepository implements GameRepository {
  constructor(private readonly endpoint: string) {}

  save(_record: GameRecord): void {
    throw new Error(`ApiRepository 尚未启用：${this.endpoint}`)
  }

  getRankings(_view?: 'today' | 'overall'): GameRecord[] {
    throw new Error(`ApiRepository 尚未启用：${this.endpoint}`)
  }

  nextAnonymousName(): string {
    throw new Error(`ApiRepository 尚未启用：${this.endpoint}`)
  }
}
