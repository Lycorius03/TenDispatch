import { npcMessages } from '../config/npcMessages'
import { shardingScenarios } from '../config/gameConfig'
import { getRankedWave, rankedDecisionWindowMs, rankedWaveCount, type RankedOption } from '../config/rankedWaves'
import type { DispatchStrategy, FinalChoices, GamePhase, GameState, RankedSnapshot, RankedStrategy, ReplicationStrategy, StageTimes, WaveGrade, WaveResult, WaveScore } from './GameState'
import { EventTracker } from './EventTracker'
import { finalDispatchScenario } from '../scenarios/finalDispatch'

const elapsedSeconds = (from: number) => Math.max(1, Math.round((Date.now() - from) / 1000))
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value))

export const comboMultiplier = (combo: number) => combo <= 1 ? 1 : combo === 2 ? 1.1 : combo === 3 ? 1.2 : combo === 4 ? 1.3 : 1.5

export const gradeForWaveScore = (score: number): WaveGrade => score >= 90 ? 'PERFECT' : score >= 75 ? 'GOOD' : score >= 50 ? 'NORMAL' : 'POOR'

const scoreSpeed = (decisionMs: number) => decisionMs <= 1500 ? 10 : decisionMs <= 2500 ? 8 : decisionMs <= 3500 ? 5 : decisionMs <= 4000 ? 2 : 0

const calculateWaveScore = (loads: [number, number, number], option: RankedOption, decisionMs: number, predictionUsed: boolean): WaveScore => {
  const peak = Math.max(...loads)
  const spread = peak - Math.min(...loads)
  const overloadPenalty = peak >= 95 ? 17 : 0
  const loadBalance = clamp(Math.round(40 - Math.max(0, peak - 78) * 1.15 - spread * 0.16 - overloadPenalty), 0, 40)
  const queryEfficiency = option.queryNodes === 1 ? 30 : option.queryNodes === 2 ? 20 : 8
  const resourceCost = clamp(Math.round(20 - option.resourceCost * 0.25 - option.crossNodeMovement * 0.08), 0, 20)
  const decisionSpeed = scoreSpeed(decisionMs)
  const total = clamp(loadBalance + queryEfficiency + resourceCost + decisionSpeed, 0, predictionUsed ? 89 : 100)
  return { loadBalance, queryEfficiency, resourceCost, decisionSpeed, total }
}

const cloneLoads = (loads: [number, number, number]) => [...loads] as [number, number, number]

const cloneReplication = (replicationState: GameState['replicationState']) => ({ ...replicationState })

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
    if (!nickname.trim()) return state
    this.tracker.reset()
    const mode = state.options.mode ?? state.mode
    const stage = mode === 'ranked' ? 'ranked' : 'tutorial'
    this.tracker.track({ type: 'game_started', stage, value: nickname })
    const now = Date.now()
    if (mode === 'ranked') {
      this.tracker.track({ type: 'ranked_wave_started', stage: 'wave-1', value: state.dailySeed })
      return {
        ...state,
        mode: 'ranked',
        screen: 'game',
        phase: 'ranked',
        nickname: nickname.trim(),
        gameStartedAt: now,
        waveStartedAt: now,
        cargoMode: 'idle',
        npcMessage: 'RANKED 线路已开启。先看当前状态，再在 4 秒内决定这一波怎么放。',
      }
    }
    if (mode === 'tutorial') {
      return {
        ...state,
        mode: 'tutorial',
        screen: 'game',
        phase: 'tutorial',
        nickname: nickname.trim(),
        gameStartedAt: now,
        waveStartedAt: now,
        tutorialStep: 0,
        tutorialCompleted: false,
        cargoMode: 'idle',
        npcMessage: '教学频道已连接。先认识 CN：数据会先抵达中央调度中心。',
      }
    }
    return {
      ...state,
      mode: 'legacy',
      screen: 'game',
      nickname: nickname.trim(),
      gameStartedAt: now,
      stageStartedAt: now,
      cargoMode: 'write',
      npcMessage: npcMessages.connected,
    }
  }

  completeTutorialStep(state: GameState): GameState {
    if (state.mode !== 'tutorial' || state.phase !== 'tutorial') return state
    const nextStep = Math.min(4, state.tutorialStep + 1)
    const messages = [
      'CN 是中央调度中心：数据先到这里，再由它决定走向哪个 DN。',
      'DN 是数据节点：三个仓库负责真正保存和处理数据。',
      'Shard 是分片：把数据合理分散到多个 DN，避免一个仓库独自承压。',
      'Replication 是复制：小型高频公共数据可以复制，大型业务数据不应随意复制。',
    ]
    if (nextStep >= 4) {
      this.tracker.track({ type: 'tutorial_completed', stage: 'tutorial', duration: elapsedSeconds(state.gameStartedAt) })
      return {
        ...state,
        tutorialStep: 4,
        tutorialCompleted: true,
        screen: 'home',
        phase: 'complete',
        npcMessage: '教学完成。现在可以进入 Ranked，用同一套规则在 14 波里冲击高分。',
      }
    }
    this.tracker.track({ type: 'tutorial_completed', stage: `tutorial-${nextStep}`, result: messages[nextStep] })
    return {
      ...state,
      tutorialStep: nextStep,
      npcMessage: messages[nextStep],
    }
  }

  resetTutorial(state: GameState): GameState {
    if (state.mode !== 'tutorial') return state
    return { ...state, tutorialStep: 0, tutorialCompleted: false, screen: 'game', phase: 'tutorial', npcMessage: '教学重新开始。先看 CN，再看三个 DN。' }
  }

  getRankedPredictions(state: GameState) {
    if (state.mode !== 'ranked') return []
    const wave = getRankedWave(state.waveIndex)
    return wave.options.map((option) => {
      const loads = this.projectRankedLoads(state, wave.id, option)
      return {
        id: option.id,
        label: option.label,
        loads,
        queryNodes: option.queryNodes,
        crossNodeMovement: option.crossNodeMovement,
        resourceCost: option.resourceCost,
      }
    })
  }

  useRankedPrediction(state: GameState): GameState {
    if (state.mode !== 'ranked' || state.phase !== 'ranked' || state.predictionUsesRemaining <= 0 || state.predictionUsedThisWave) return state
    this.tracker.track({ type: 'prediction_used', stage: `wave-${state.waveIndex + 1}`, attempt: 3 - state.predictionUsesRemaining })
    return { ...state, predictionUsesRemaining: state.predictionUsesRemaining - 1, predictionUsedThisWave: true, npcMessage: '预测已展开：注意三个策略的负载变化、查询节点数和资源成本。' }
  }

  submitRankedWave(state: GameState, strategy: RankedStrategy, decisionMs = Date.now() - state.waveStartedAt): GameState {
    if (state.mode !== 'ranked' || state.phase !== 'ranked') return state
    const wave = getRankedWave(state.waveIndex)
    const selected = wave.options.find((option) => option.id === strategy) ?? wave.options.find((option) => option.id === wave.defaultStrategy) ?? wave.options[0]
    const timedOut = decisionMs > rankedDecisionWindowMs || !wave.options.some((option) => option.id === strategy)
    const actualDecisionMs = timedOut ? rankedDecisionWindowMs + 1 : Math.max(0, decisionMs)
    const snapshot: RankedSnapshot = {
      dnLoads: cloneLoads(state.dnLoads),
      queryNodes: state.queryNodes,
      averageQueryNodes: state.averageQueryNodes,
      queryPressure: state.queryPressure,
      crossNodeMovement: state.crossNodeMovement,
      resourceUsage: state.resourceUsage,
      replicationState: cloneReplication(state.replicationState),
      waveResults: [...state.waveResults],
      totalScore: state.totalScore,
      combo: state.combo,
      maxCombo: state.maxCombo,
      perfectCount: state.perfectCount,
      goodCount: state.goodCount,
      poorCount: state.poorCount,
      normalCount: state.normalCount,
      waveIndex: state.waveIndex,
      phase: state.phase,
      predictionUsedThisWave: state.predictionUsedThisWave,
      lastDecisionStrategy: state.lastDecisionStrategy,
      worstWave: state.worstWave,
    }
    const loads = this.projectRankedLoads(state, wave.id, selected)
    const score = calculateWaveScore(loads, selected, actualDecisionMs, state.predictionUsedThisWave)
    const grade = gradeForWaveScore(score.total)
    const combo = grade === 'PERFECT' || grade === 'GOOD' ? state.combo + 1 : 0
    const multiplier = comboMultiplier(combo)
    const earnedScore = Math.round(score.total * multiplier)
    const replicationState = this.nextReplicationState(state, wave.publicData, selected)
    const totalResourceUsage = clamp(Math.round(state.resourceUsage * 0.74 + selected.resourceCost * 0.65 + (replicationState.publicCopies === 3 || replicationState.largeCopies === 3 ? 3 : 0)))
    const averageQueryNodes = Number(((state.averageQueryNodes * state.waveResults.length + selected.queryNodes) / (state.waveResults.length + 1)).toFixed(2))
    const queryPressure = clamp(Math.round(state.queryPressure * 0.65 + (selected.queryNodes / 3) * 100 * 0.35))
    const crossNodeMovement = clamp(Math.round(state.crossNodeMovement * 0.55 + selected.crossNodeMovement * 0.45))
    const result: WaveResult = {
      wave: wave.id,
      strategy: selected.id,
      timedOut,
      decisionMs: actualDecisionMs,
      score,
      grade,
      combo,
      multiplier,
      earnedScore,
      queryNodes: selected.queryNodes,
      crossNodeMovement,
      loads,
      note: timedOut ? `决策超时，系统使用默认策略：${wave.options.find((option) => option.id === wave.defaultStrategy)?.label ?? selected.label}` : selected.note,
      predictionUsed: state.predictionUsedThisWave,
    }
    const nextPoor = state.poorCount + Number(grade === 'POOR')
    const nextNormal = state.normalCount + Number(grade === 'NORMAL')
    const nextGood = state.goodCount + Number(grade === 'GOOD')
    const nextPerfect = state.perfectCount + Number(grade === 'PERFECT')
    const peak = Math.max(...loads)
    const systemStatus = peak >= 95 ? 'OVERLOAD' : peak >= 80 ? 'HIGH LOAD' : 'STABLE'
    const currentLoss = 100 - score.total
    const worstWave = !state.worstWave || currentLoss > state.worstWave.lostPoints
      ? { wave: wave.id, lostPoints: currentLoss, reason: result.note }
      : state.worstWave
    this.tracker.track({ type: 'ranked_wave_completed', stage: `wave-${wave.id}`, value: selected.id, result: grade, duration: actualDecisionMs })
    return {
      ...state,
      phase: 'ranked-result',
      dnLoads: loads,
      queryNodes: selected.queryNodes,
      averageQueryNodes,
      queryPressure,
      crossNodeMovement,
      resourceUsage: totalResourceUsage,
      replicationState,
      waveResults: [...state.waveResults, result],
      totalScore: Math.max(0, state.totalScore - (state.pendingUndoScore ?? 0)) + earnedScore,
      combo,
      maxCombo: Math.max(state.maxCombo, combo),
      perfectCount: nextPerfect,
      goodCount: nextGood,
      normalCount: nextNormal,
      poorCount: nextPoor,
      lastDecisionStrategy: selected.id,
      lastDecisionSnapshot: snapshot,
      pendingUndoScore: undefined,
      worstWave,
      systemStatus,
      cargoMode: wave.finalRush ? 'sync' : selected.id === 'replicated' ? 'replicate' : selected.queryNodes > 1 ? 'query' : 'write',
      npcMessage: result.note,
    }
  }

  undoRankedDecision(state: GameState): GameState {
    if (state.mode !== 'ranked' || state.phase !== 'ranked-result' || state.undoUsesRemaining <= 0 || !state.lastDecisionSnapshot) return state
    const snapshot = state.lastDecisionSnapshot
    const lastResult = state.waveResults[state.waveResults.length - 1]
    this.tracker.track({ type: 'undo_used', stage: `wave-${state.waveIndex + 1}`, result: 'decision-retracted' })
    return {
      ...state,
      ...snapshot,
      undoUsesRemaining: state.undoUsesRemaining - 1,
      totalScore: Math.max(0, state.totalScore - 50),
      combo: 0,
      undoPenalty: state.undoPenalty + 50,
      pendingUndoScore: lastResult?.earnedScore,
      phase: 'ranked',
      waveStartedAt: Date.now(),
      predictionUsedThisWave: false,
      lastDecisionSnapshot: undefined,
      lastDecisionStrategy: undefined,
      cargoMode: 'idle',
      npcMessage: '已撤回最近一次决策。本波扣 50 分，Combo 清零；重新选择后继续。',
    }
  }

  advanceRankedWave(state: GameState): GameState {
    if (state.mode !== 'ranked' || state.phase !== 'ranked-result' || state.waveIndex >= rankedWaveCount - 1) return state
    const nextWave = state.waveIndex + 1
    this.tracker.track({ type: 'ranked_wave_started', stage: `wave-${nextWave + 1}`, value: state.dailySeed })
    return {
      ...state,
      phase: 'ranked',
      waveIndex: nextWave,
      waveStartedAt: Date.now(),
      predictionUsedThisWave: false,
      lastDecisionSnapshot: undefined,
      lastDecisionStrategy: undefined,
      cargoMode: 'idle',
      npcMessage: nextWave >= 11 ? 'FINAL RUSH：不引入新机制，只提高决策密度。看住负载、查询节点和搬运成本。' : '新波次已到达。注意当前状态不会重置。',
    }
  }

  finishRanked(state: GameState): GameState {
    if (state.mode !== 'ranked' || state.phase !== 'ranked-result' || state.waveIndex !== rankedWaveCount - 1) return state
    this.tracker.track({ type: 'game_completed', stage: 'ranked-complete', duration: elapsedSeconds(state.gameStartedAt) })
    return { ...state, phase: 'complete', screen: 'result', cargoMode: 'final', npcMessage: '14 波调度完成。查看报告，找出下一局最容易提升的失分点。' }
  }

  private projectRankedLoads(state: GameState, waveId: number, option: RankedOption): [number, number, number] {
    const wave = getRankedWave(waveId - 1)
    const rushPressure = wave.finalRush ? 5 : 0
    const replicationPressure = state.replicationState.largeCopies > 1 ? 2 : 0
    const queryPressure = Math.round(state.queryPressure * 0.04)
    return state.dnLoads.map((load, index) => clamp(Math.round(load * 0.82 + option.loadDelta[index] + rushPressure + replicationPressure + queryPressure))) as [number, number, number]
  }

  private nextReplicationState(state: GameState, publicData: boolean, option: RankedOption): GameState['replicationState'] {
    const next = cloneReplication(state.replicationState)
    if (publicData && option.id === 'replicated') {
      next.publicCopies = 3
      next.lastDataset = 'public'
    } else if (publicData && option.id === 'centralized') {
      next.publicCopies = 1
      next.lastDataset = 'public'
    } else if (!publicData && option.id === 'replicated') {
      next.largeCopies = 3
      next.lastDataset = 'business'
    } else if (!publicData && option.id === 'centralized') {
      next.largeCopies = 1
      next.lastDataset = 'business'
    }
    next.resourceUsage = clamp(Math.round(state.resourceUsage * 0.72 + option.resourceCost * 0.55))
    return next
  }

  completeTutorial(state: GameState): GameState {
    if (state.mode === 'tutorial') return this.completeTutorialStep(state)
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
      dnLoads: shardingScenarios[strategy].distribution.map((load, index) => Math.min(100, Math.round(load + state.options.pressure * (strategy === 'id' ? 0.6 : index === 0 ? 1 : 0.25)))) as [number, number, number],
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
    const good = Number(choices.sharding === 'id') + Number(choices.query === 'targeted' && choices.sharding === 'id') + Number(choices.publicData === 'replicated')
    const outcome = finalDispatchScenario.outcomeByCorrectChoices[good as 0 | 1 | 2 | 3]
    const peak = Math.max(...outcome.loads) + state.options.pressure * (good === 3 ? 0.65 : 1)
    const systemStatus = peak >= 95 ? 'OVERLOAD' : peak >= 80 ? 'HIGH LOAD' : 'STABLE'
    const loads = outcome.loads.map(load => Math.min(100, Math.round(load + state.options.pressure * (good === 3 ? 0.65 : 1)))) as [number, number, number]
    this.tracker.track({ type: 'final_dispatch_completed', stage: 'final', result: systemStatus })
    return transition(state, 'final-result', {
      cargoMode: 'final',
      dnLoads: loads,
      systemStatus,
      npcMessage: systemStatus === 'STABLE' ? npcMessages.finalStable : npcMessages.finalLoaded,
    })
  }

  showReport(state: GameState): GameState {
    if (state.phase !== 'final-result') return state
    this.tracker.track({ type: 'game_completed', stage: 'complete', duration: elapsedSeconds(state.gameStartedAt) })
    return transition(state, 'complete', { screen: 'result' })
  }

  useHint(state: GameState): GameState {
    this.tracker.track({ type: 'hint_used', stage: state.phase, attempt: state.hintCount + 1 })
    return { ...state, hintCount: state.hintCount + 1, npcMessage: npcMessages.hint }
  }
}
