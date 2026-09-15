import type { GameEvent } from '../game/EventTracker'
import type { ScoreBreakdown } from '../game/ScoreEngine'
import type { GameState } from '../game/GameState'

export interface GameRecord {
  id: string
  nickname: string
  score: number
  title: string
  hintCount: number
  duration: number
  completedAt: string
  breakdown: ScoreBreakdown
  behavior: {
    initialSharding?: string
    finalSharding?: string
    shardingAdjustments: number
    skewTriggered: boolean
    averageQueryNodes: number
    initialReplication?: string
    finalReplication?: string
    largeReplication?: string
    hintCount: number
    stageTimes: GameState['stageTimes']
    totalDuration: number
    systemStatus?: string
  }
  events: GameEvent[]
}

export interface GameRepository {
  save(record: GameRecord): void
  getRankings(): GameRecord[]
  nextAnonymousName(): string
}
