export type Screen = 'home' | 'game' | 'result' | 'ranking'
export type GamePhase =
  | 'tutorial'
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
}

export const createInitialState = (): GameState => ({
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
})
