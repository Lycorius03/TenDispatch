import type { SessionOptions } from '../config/difficulty'
export type Screen = 'home' | 'game' | 'result' | 'ranking'
export type GameMode = 'legacy' | 'tutorial' | 'ranked'
export type GamePhase =
  | 'tutorial'
  | 'ranked'
  | 'ranked-result'
  | 'sharding'
  | 'sharding-result'
  | 'query'
  | 'query-result'
  | 'replication-small'
  | 'replication-small-result'
  | 'replication-large'
  | 'replication-large-result'
  | 'gtm'
  | 'final'
  | 'final-result'
  | 'complete'

export type DispatchStrategy = 'id' | 'region' | 'status'
export type ReplicationStrategy = 'centralized' | 'replicated'
export type SystemStatus = 'STABLE' | 'HIGH LOAD' | 'OVERLOAD'
export type RankedStrategy = DispatchStrategy | ReplicationStrategy | 'time' | 'range' | 'broadcast'
export type WaveGrade = 'PERFECT' | 'GOOD' | 'NORMAL' | 'POOR'

export interface WaveScore {
  loadBalance: number
  queryEfficiency: number
  resourceCost: number
  decisionSpeed: number
  total: number
}

export interface WaveResult {
  wave: number
  strategy: RankedStrategy
  timedOut: boolean
  decisionMs: number
  score: WaveScore
  grade: WaveGrade
  combo: number
  multiplier: number
  earnedScore: number
  queryNodes: number
  crossNodeMovement: number
  loads: [number, number, number]
  note: string
  predictionUsed: boolean
  undone?: boolean
}

export interface ReplicationState {
  publicCopies: number
  largeCopies: number
  resourceUsage: number
  lastDataset?: 'public' | 'business'
}

export interface RankedSnapshot {
  dnLoads: [number, number, number]
  queryNodes: number
  averageQueryNodes: number
  queryPressure: number
  crossNodeMovement: number
  resourceUsage: number
  replicationState: ReplicationState
  waveResults: WaveResult[]
  totalScore: number
  combo: number
  maxCombo: number
  perfectCount: number
  goodCount: number
  poorCount: number
  normalCount: number
  waveIndex: number
  phase: GamePhase
  predictionUsedThisWave: boolean
  lastDecisionStrategy?: RankedStrategy
  worstWave?: { wave: number; lostPoints: number; reason: string }
}

export interface FinalChoices {
  sharding?: DispatchStrategy
  query?: 'targeted' | 'broadcast'
  publicData?: ReplicationStrategy
}

export interface StageTimes {
  tutorial?: number
  sharding?: number
  query?: number
  replication?: number
  gtm?: number
  final?: number
}

export interface GameState {
  mode: GameMode
  options: SessionOptions
  screen: Screen
  phase: GamePhase
  nickname: string
  dnLoads: [number, number, number]
  initialSharding?: DispatchStrategy
  finalSharding?: DispatchStrategy
  shardingAdjustments: number
  skewTriggered: boolean
  queryNodes: number
  initialReplication?: ReplicationStrategy
  finalReplication?: ReplicationStrategy
  largeReplication?: ReplicationStrategy
  hintCount: number
  retryCount: number
  cargoMode: 'idle' | 'write' | 'query' | 'replicate' | 'sync' | 'final'
  npcMessage: string
  stageStartedAt: number
  gameStartedAt: number
  stageTimes: StageTimes
  finalChoices: FinalChoices
  systemStatus?: SystemStatus

  // Ranked mode state. These fields intentionally live beside the original
  // teaching-flow fields so saved legacy records and old integrations remain
  // readable while the 14-wave mode evolves independently.
  dailySeed: string
  waveIndex: number
  waveStartedAt: number
  tutorialStep: number
  tutorialCompleted: boolean
  waveResults: WaveResult[]
  totalScore: number
  combo: number
  maxCombo: number
  perfectCount: number
  goodCount: number
  normalCount: number
  poorCount: number
  averageQueryNodes: number
  queryPressure: number
  crossNodeMovement: number
  resourceUsage: number
  replicationState: ReplicationState
  predictionUsesRemaining: number
  undoUsesRemaining: number
  predictionUsedThisWave: boolean
  undoPenalty: number
  pendingUndoScore?: number
  lastDecisionStrategy?: RankedStrategy
  lastDecisionSnapshot?: RankedSnapshot
  worstWave?: { wave: number; lostPoints: number; reason: string }
}

const baseState = (): GameState => ({
  mode: 'legacy',
  options: { difficulty: 'novice', pressure: 0, guide: true },
  screen: 'home',
  phase: 'tutorial',
  nickname: '',
  dnLoads: [18, 16, 17],
  shardingAdjustments: 0,
  skewTriggered: false,
  queryNodes: 0,
  hintCount: 0,
  retryCount: 0,
  cargoMode: 'idle',
  npcMessage: 'TenDispatch 调度系统待命。',
  stageStartedAt: Date.now(),
  gameStartedAt: Date.now(),
  stageTimes: {},
  finalChoices: {},
  dailySeed: '',
  waveIndex: 0,
  waveStartedAt: Date.now(),
  tutorialStep: 0,
  tutorialCompleted: false,
  waveResults: [],
  totalScore: 0,
  combo: 0,
  maxCombo: 0,
  perfectCount: 0,
  goodCount: 0,
  normalCount: 0,
  poorCount: 0,
  averageQueryNodes: 0,
  queryPressure: 0,
  crossNodeMovement: 0,
  resourceUsage: 0,
  replicationState: { publicCopies: 0, largeCopies: 1, resourceUsage: 0 },
  predictionUsesRemaining: 2,
  undoUsesRemaining: 1,
  predictionUsedThisWave: false,
  undoPenalty: 0,
})

export const createInitialState = (): GameState => baseState()

export const createTutorialState = (): GameState => {
  const state = baseState()
  return {
    ...state,
    mode: 'tutorial',
    options: { difficulty: 'novice', pressure: 0, guide: true, mode: 'tutorial' },
    phase: 'tutorial',
    tutorialStep: 0,
    tutorialCompleted: false,
    npcMessage: '教学频道已连接。先认识 CN：所有数据都会先抵达中央调度中心。',
  }
}

export const createRankedState = (dailySeed: string): GameState => {
  const state = baseState()
  const now = Date.now()
  return {
    ...state,
    mode: 'ranked',
    options: { difficulty: 'easy', pressure: 0, guide: false, mode: 'ranked' },
    phase: 'ranked',
    dailySeed,
    waveIndex: 0,
    waveStartedAt: now,
    gameStartedAt: now,
    dnLoads: [22, 24, 20],
    cargoMode: 'idle',
    npcMessage: 'RANKED 线路已开启。Daily Seed 锁定，14 波状态将连续继承。',
  }
}
