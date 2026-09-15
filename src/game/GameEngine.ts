import { npcMessages } from '../config/npcMessages'
import { shardingScenarios } from '../config/gameConfig'
import type { DispatchStrategy, FinalChoices, GamePhase, GameState, ReplicationStrategy, StageTimes } from './GameState'
import { EventTracker } from './EventTracker'
import { finalDispatchScenario } from '../scenarios/finalDispatch'

const elapsedSeconds = (from: number) => Math.max(1, Math.round((Date.now() - from) / 1000))

const stageKey = (phase: GamePhase): keyof StageTimes => {
  if (phase.startsWith('sharding')) return 'sharding'
  if (phase.startsWith('query')) return 'query'
  if (phase.startsWith('replication')) return 'replication'
  if (phase === 'gtm') return 'gtm'
  if (phase === 'final' || phase === 'final-result' || phase === 'complete') return 'final'
  return 'tutorial'
}

const transition = (state: GameState, nextPhase: GamePhase, patch: Partial<GameState>): GameState => ({
  ...state,
  stageTimes: {
    ...state.stageTimes,
    [stageKey(state.phase)]: (state.stageTimes[stageKey(state.phase)] ?? 0) + elapsedSeconds(state.stageStartedAt),
  },
  phase: nextPhase,
  stageStartedAt: Date.now(),
  ...patch,
})

export class GameEngine {
  constructor(private readonly tracker: EventTracker) {}

  start(state: GameState, nickname: string): GameState {
    this.tracker.reset()
    this.tracker.track({ type: 'game_started', stage: 'tutorial', value: nickname })
    const now = Date.now()
    return {
      ...state,
      screen: 'game',
      nickname,
      gameStartedAt: now,
      stageStartedAt: now,
      cargoMode: 'write',
      npcMessage: npcMessages.connected,
    }
  }

  completeTutorial(state: GameState): GameState {
    this.tracker.track({ type: 'tutorial_completed', stage: 'tutorial', duration: elapsedSeconds(state.stageStartedAt) })
    return transition(state, 'sharding', {
      dnLoads: [33, 34, 33],
      cargoMode: 'write',
      npcMessage: npcMessages.tutorialDone,
    })
  }

  selectSharding(state: GameState, strategy: DispatchStrategy): GameState {
    const isChange = Boolean(state.initialSharding)
    this.tracker.track({
      type: isChange ? 'dispatch_rule_changed' : 'dispatch_rule_selected',
      stage: 'sharding',
      value: strategy,
      attempt: state.shardingAdjustments + 1,
    })
    if (strategy === 'status') this.tracker.track({ type: 'data_skew_triggered', stage: 'sharding', result: 'dn-01-82' })
    return {
      ...state,
      phase: 'sharding-result',
      initialSharding: state.initialSharding ?? strategy,
      finalSharding: strategy,
      shardingAdjustments: isChange ? state.shardingAdjustments + 1 : state.shardingAdjustments,
      retryCount: isChange ? state.retryCount + 1 : state.retryCount,
      skewTriggered: state.skewTriggered || strategy === 'status',
      dnLoads: shardingScenarios[strategy].distribution,
      cargoMode: 'write',
      npcMessage: strategy === 'status' ? npcMessages.skew : strategy === 'id' ? npcMessages.balanced : npcMessages.region,
    }
  }

  continueFromSharding(state: GameState): GameState {
    return transition(state, 'query', {
      cargoMode: 'idle',
      npcMessage: npcMessages.queryIncoming,
    })
  }

  runQuery(state: GameState): GameState {
    const nodes = state.finalSharding === 'id' ? 1 : 3
    this.tracker.track({ type: 'query_started', stage: 'query', value: 'user-2817' })
    this.tracker.track({ type: 'query_completed', stage: 'query', result: `${nodes}-nodes` })
    return {
      ...state,
      phase: 'query-result',
      queryNodes: nodes,
      cargoMode: 'query',
      npcMessage: nodes === 1 ? npcMessages.querySingle : npcMessages.queryMulti,
    }
  }

  continueToReplication(state: GameState): GameState {
    return transition(state, 'replication-small', {
      cargoMode: 'idle',
      npcMessage: npcMessages.publicDataIncoming,
    })
  }

  selectSmallReplication(state: GameState, strategy: ReplicationStrategy): GameState {
    const isChange = Boolean(state.initialReplication)
    this.tracker.track({ type: isChange ? 'replication_changed' : 'replication_selected', stage: 'replication-small', value: strategy })
    return {
      ...state,
      phase: 'replication-small-result',
      initialReplication: state.initialReplication ?? strategy,
      finalReplication: strategy,
      cargoMode: strategy === 'replicated' ? 'replicate' : 'query',
      npcMessage: strategy === 'replicated' ? npcMessages.replicated : npcMessages.centralized,
    }
  }

  continueToLargeReplication(state: GameState): GameState {
    return transition(state, 'replication-large', {
      cargoMode: 'idle',
      npcMessage: npcMessages.largeDataIncoming,
    })
  }

  selectLargeReplication(state: GameState, strategy: ReplicationStrategy): GameState {
    this.tracker.track({ type: 'replication_changed', stage: 'replication-large', value: strategy })
    const copied = strategy === 'replicated'
    return {
      ...state,
      phase: 'replication-large-result',
      largeReplication: strategy,
      dnLoads: copied ? state.dnLoads.map((load) => Math.min(96, load + 30)) as [number, number, number] : state.dnLoads,
      cargoMode: copied ? 'replicate' : 'write',
      npcMessage: copied ? npcMessages.largeCopied : npcMessages.largeCentralized,
    }
  }

  continueToGtm(state: GameState): GameState {
    return transition(state, 'gtm', {
      cargoMode: 'idle',
      npcMessage: npcMessages.gtmReady,
    })
  }

  runGtm(state: GameState): GameState {
    this.tracker.track({ type: 'gtm_event_triggered', stage: 'gtm', result: 'synchronized' })
    this.tracker.track({ type: 'final_dispatch_started', stage: 'final' })
    return transition(state, 'final', {
      cargoMode: 'sync',
      npcMessage: npcMessages.gtm,
    })
  }

  setFinalChoice(state: GameState, key: keyof FinalChoices, value: DispatchStrategy | 'targeted' | 'broadcast' | ReplicationStrategy): GameState {
    return { ...state, finalChoices: { ...state.finalChoices, [key]: value } }
  }

  completeFinal(state: GameState): GameState {
    const choices = state.finalChoices
    const good = Number(choices.sharding === 'id') + Number(choices.query === 'targeted') + Number(choices.publicData === 'replicated')
    const outcome = finalDispatchScenario.outcomeByCorrectChoices[good as 0 | 1 | 2 | 3]
    const systemStatus = outcome.status
    const loads: [number, number, number] = [...outcome.loads]
    this.tracker.track({ type: 'final_dispatch_completed', stage: 'final', result: systemStatus })
    return transition(state, 'final-result', {
      cargoMode: 'final',
      dnLoads: loads,
      systemStatus,
      npcMessage: systemStatus === 'STABLE' ? npcMessages.finalStable : npcMessages.finalLoaded,
    })
  }

  showReport(state: GameState): GameState {
    this.tracker.track({ type: 'game_completed', stage: 'complete', duration: elapsedSeconds(state.gameStartedAt) })
    return transition(state, 'complete', { screen: 'result' })
  }

  useHint(state: GameState): GameState {
    this.tracker.track({ type: 'hint_used', stage: state.phase, attempt: state.hintCount + 1 })
    return { ...state, hintCount: state.hintCount + 1, npcMessage: npcMessages.hint }
  }
}
