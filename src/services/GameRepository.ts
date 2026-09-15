import type { GameEvent } from '../game/EventTracker'
import type { ScoreBreakdown } from '../game/ScoreEngine'
import type { GameState } from '../game/GameState'

export interface GameRecord {
  id: string
  mode?: GameState['mode']
  difficulty?: string
  sessionOptions?: GameState['options']
  dailySeed?: string
  rank?: number
  personalBest?: number
  distanceTop10?: number
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
    waveCount?: number
    perfectCount?: number
    maxCombo?: number
    averageDecisionMs?: number
    crossNodeMovement?: number
    undoPenalty?: number
    worstWave?: GameState['worstWave']
  }
  events: GameEvent[]
}

export interface GameRepository {
  save(record: GameRecord): void
  getRankings(view?: 'today' | 'overall'): GameRecord[]
  nextAnonymousName(): string
}
