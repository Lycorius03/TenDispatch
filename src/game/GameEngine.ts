import { npcMessages } from '../config/npcMessages'
import { gtmPlainLine, rankedFinalRushLine, shardingScenarios, trainingLessons } from '../config/gameConfig'
import { getRankedWave, getRankedWaveSet, rankedDecisionWindowMs, rankedWaveCount, tutorialWaves, type RankedOption, type RankedWave } from '../config/rankedWaves'
import type { DispatchStrategy, FinalChoices, GamePhase, GameState, RankedSnapshot, RankedStrategy, ReplicationStrategy, StageTimes, WaveGrade, WaveResult, WaveScore } from './GameState'
import { EventTracker } from './EventTracker'
import { finalDispatchScenario } from '../scenarios/finalDispatch'

const elapsedSeconds = (from: number) => Math.max(1, Math.round((Date.now() - from) / 1000))
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value))

export const comboMultiplier = (combo: number) => combo <= 1 ? 1 : combo === 2 ? 1.1 : combo === 3 ? 1.2 : combo === 4 ? 1.3 : 1.5

export const gradeForWaveScore = (score: number): WaveGrade => score >= 90 ? 'PERFECT' : score >= 75 ? 'GOOD' : score >= 50 ? 'NORMAL' : 'POOR'

const scoreSpeed = (decisionMs: number) => decisionMs <= 1500 ? 10 : decisionMs <= 2500 ? 8 : decisionMs <= 3500 ? 5 : decisionMs <= 4000 ? 2 : 0

const calculateWaveScore = (loads: [number, number, number], option: RankedOption, decisionMs: number, predictionUsed: boolean, preferredStrategy: boolean): WaveScore => {
  const peak = Math.max(...loads)
  const spread = peak - Math.min(...loads)
  const overloadPenalty = peak >= 95 ? 17 : 0
  const loadBalance = clamp(Math.round(40 - Math.max(0, peak - 78) * 1.15 - spread * 0.16 - overloadPenalty), 0, 40)
  const baseQueryEfficiency = option.queryNodes === 1 ? 30 : option.queryNodes === 2 ? 20 : 8
  // A short query path is only valuable when the strategy actually matches
  // the wave's access pattern. Non-preferred strategies cannot reach GOOD by
  // accidentally combining cheap metrics that miss the task itself.
  const queryEfficiency = preferredStrategy ? baseQueryEfficiency : Math.min(baseQueryEfficiency, 4)
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
        deathReason: undefined,
        npcMessage: 'RANKED 线路已开启。先扫一眼任务卡两行和当前负载，再在 20 秒内决定这一波怎么放。',
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
        tutorialWaveCompleted: false,
        tutorialWaveIndex: 0,
        tutorialWaveStartLoads: [22, 24, 20],
        tutorialStrategy: undefined,
        cargoMode: 'idle',
        deathReason: undefined,
        npcMessage: '欢迎来到 TenDispatch！每题只按一个顺序判断：这批货长什么样 → 待会怎么找 → 图上当前 DN 负载。教学不限时、不扣分，选错了还能重试。',
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
    if (state.tutorialStep === 0) {
      return {
        ...state,
        tutorialStep: 1,
        cargoMode: 'write',
        npcMessage: '先看画面：上方是数据入口，中间的 CN 是调度台，下方三个 DN 是存放和处理数据的节点。操作重点在下方的方案卡；选完点“确认”，然后看哪个 DN 变忙。',
      }
    }
    if (state.tutorialStep === 1) {
      return {
        ...state,
        tutorialStep: 2,
        cargoMode: 'write',
        npcMessage: '每个方案都是一种放数据的动作。先看任务卡里的“待会怎么找”，找动作能和它对上的那张卡；暂时不用记其它参数。',
      }
    }
    if (state.tutorialStep === 2) {
      return {
        ...state,
        tutorialStep: 3,
        queryNodes: 1,
        cargoMode: 'query',
        npcMessage: '任务卡只有两行：这批货长什么样，告诉你压力容易摊开还是挤到一处；待会怎么找，告诉你查询会打到几个仓。先把它们和方案名称对上。',
      }
    }
    if (state.tutorialStep === 3) {
      return {
        ...state,
        tutorialStep: 4,
        queryNodes: 1,
        cargoMode: 'query',
        npcMessage: '最后看图上的当前 DN 负载。百分比越高，节点越忙、剩余空间越少；如果某个 DN 已经很忙，就避免让新方案继续把压力堆向它。',
      }
    }
    if (state.tutorialStep === 4) {
      return {
        ...state,
        tutorialStep: 5,
        dnLoads: [22, 24, 20],
        tutorialWaveIndex: 0,
        tutorialWaveStartLoads: [22, 24, 20],
        tutorialWaveCompleted: false,
        tutorialStrategy: undefined,
        queryNodes: 0,
        cargoMode: 'idle',
        npcMessage: '训练 1 开始。顺序固定：这批货长什么样 → 待会怎么找 → 当前 DN 负载。选好后确认，看场景里货是从 CN 沿三条轨拆开，还是三个仓一起被问。',
      }
    }
    if (state.tutorialStep === 6 && state.tutorialWaveCompleted) {
      return {
        ...state,
        tutorialStep: 7,
        tutorialWaveIndex: 1,
        tutorialWaveStartLoads: cloneLoads(state.dnLoads),
        tutorialWaveCompleted: false,
        tutorialStrategy: undefined,
        cargoMode: 'idle',
        npcMessage: `训练 2 开始。任务卡两行：小而公共，谁都来读。记住铁律：${trainingLessons[1].rule}`,
      }
    }
    if (state.tutorialStep === 8 && state.tutorialWaveCompleted) {
      return {
        ...state,
        tutorialStep: 9,
        tutorialWaveIndex: 2,
        tutorialWaveStartLoads: cloneLoads(state.dnLoads),
        tutorialWaveCompleted: false,
        tutorialStrategy: undefined,
        cargoMode: 'idle',
        npcMessage: `训练 3 开始。任务卡两行：一直在涨，量大；按时间段翻。记住铁律：${trainingLessons[2].rule}`,
      }
    }
    if (state.tutorialStep === 10 && state.tutorialWaveCompleted) {
      return {
        ...state,
        tutorialStep: 11,
        cargoMode: 'idle',
        npcMessage: '三波训练完成，三条铁律请记住：按人找就按人分流；小名单复制、大日志不三份全抄；状态或热点地区会挤爆一个仓。正式模式只是加压，不会教新东西。',
      }
    }
    if (state.tutorialStep === 11) {
      this.tracker.track({ type: 'tutorial_completed', stage: 'tutorial', duration: elapsedSeconds(state.gameStartedAt) })
      return {
        ...state,
        tutorialStep: 11,
        tutorialCompleted: true,
        screen: 'home',
        phase: 'complete',
        npcMessage: '教学完成！正式模式里仍然只有这三条铁律；不确定时可以打开“判断方法”暂停计时，先看两行任务卡，再比三个数字。',
      }
    }
    return state
  }

  resetTutorial(state: GameState): GameState {
    if (state.mode !== 'tutorial') return state
    const now = Date.now()
    return {
      ...state,
      tutorialStep: 0,
      tutorialCompleted: false,
      tutorialWaveCompleted: false,
      tutorialWaveIndex: 0,
      tutorialWaveStartLoads: [22, 24, 20],
      tutorialStrategy: undefined,
      screen: 'game',
      phase: 'tutorial',
      dnLoads: [18, 16, 17],
      cargoMode: 'idle',
      gameStartedAt: now,
      stageStartedAt: now,
      waveStartedAt: now,
      npcMessage: '教学重新开始。记住顺序：这批货长什么样 → 待会怎么找 → 当前 DN 负载；三波训练会反复练这三条铁律。',
    }
  }

  selectTutorialWave(state: GameState, strategy: RankedStrategy): GameState {
    const decisionSteps = [5, 7, 9]
    if (state.mode !== 'tutorial' || state.phase !== 'tutorial' || !decisionSteps.includes(state.tutorialStep)) return state
    const wave = tutorialWaves[state.tutorialWaveIndex] ?? tutorialWaves[0]
    const selected = wave.options.find((option) => option.id === strategy) ?? wave.options[0]
    const best = wave.options.find((option) => option.id === wave.defaultStrategy) ?? wave.options[0]
    const loads = this.projectRankedLoads(state, wave, selected)
    const peak = Math.max(...loads)
    const systemStatus = peak >= 95 ? 'OVERLOAD' : peak >= 80 ? 'HIGH LOAD' : 'STABLE'
    const lesson = trainingLessons[Math.min(trainingLessons.length - 1, state.tutorialWaveIndex)]
    this.tracker.track({ type: 'tutorial_wave_completed', stage: `tutorial-wave-${state.tutorialWaveIndex + 1}`, value: selected.id, result: loads.join('/') })
    return {
      ...state,
      tutorialStep: state.tutorialStep + 1,
      tutorialWaveCompleted: true,
      tutorialStrategy: selected.id,
      dnLoads: loads,
      queryNodes: selected.queryNodes,
      systemStatus,
      cargoMode: selected.queryNodes > 1 ? 'query' : 'write',
      npcMessage: selected.id === best.id
        ? `判断正确：${lesson.rule} 本波用“${best.label}”就对上了。`
        : `这次选的是“${selected.label}”，本波更合适的是“${best.label}”。记住这一条：${lesson.rule} ${lesson.risk}`,
    }
  }

  retryTutorialWave(state: GameState): GameState {
    const resultSteps = [6, 8, 10]
    if (state.mode !== 'tutorial' || state.phase !== 'tutorial' || !resultSteps.includes(state.tutorialStep)) return state
    return {
      ...state,
      tutorialStep: state.tutorialStep - 1,
      tutorialWaveCompleted: false,
      tutorialStrategy: undefined,
      dnLoads: cloneLoads(state.tutorialWaveStartLoads),
      queryNodes: 0,
      systemStatus: 'STABLE',
      cargoMode: 'idle',
      npcMessage: `重新尝试训练 ${state.tutorialWaveIndex + 1}。任务卡还是那两行：这批货长什么样、待会怎么找；先比它们，再看当前 DN 负载。`,
    }
  }

  getRankedPredictions(state: GameState) {
    if (state.mode !== 'ranked') return []
    const wave = getRankedWave(state.waveIndex, state.dailySeed)
    return wave.options.map((option) => {
      const loads = this.projectRankedLoads(state, wave, option)
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
    return { ...state, predictionUsesRemaining: state.predictionUsesRemaining - 1, predictionUsedThisWave: true, npcMessage: '预测已展开：先看哪个仓会先红、找人要问几个仓，再回看任务卡的两行。' }
  }

  submitRankedWave(state: GameState, strategy: RankedStrategy, decisionMs = Date.now() - state.waveStartedAt): GameState {
    if (state.mode !== 'ranked' || state.phase !== 'ranked') return state
    const wave = getRankedWave(state.waveIndex, state.dailySeed)
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
    const loads = this.projectRankedLoads(state, wave, selected)
    // A missed decision still applies the safe default to keep the simulated
    // system moving, but it is not a player decision and therefore earns no points.
    const score = timedOut
      ? { loadBalance: 0, queryEfficiency: 0, resourceCost: 0, decisionSpeed: 0, total: 0 }
      : calculateWaveScore(loads, selected, actualDecisionMs, state.predictionUsedThisWave, selected.id === wave.defaultStrategy)
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
      publicData: wave.publicData,
      preferred: selected.id === wave.defaultStrategy,
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
        note: timedOut ? `本波未在 20 秒内确认策略，直接记 0 分；系统仅为保持线路运转而采用默认动作：${wave.options.find((option) => option.id === wave.defaultStrategy)?.label ?? selected.label}` : selected.note,
      predictionUsed: state.predictionUsedThisWave,
    }
    const nextPoor = state.poorCount + Number(grade === 'POOR')
    const nextNormal = state.normalCount + Number(grade === 'NORMAL')
    const nextGood = state.goodCount + Number(grade === 'GOOD')
    const nextPerfect = state.perfectCount + Number(grade === 'PERFECT')
    const peak = Math.max(...loads)
    const systemStatus = peak >= 95 ? 'OVERLOAD' : peak >= 80 ? 'HIGH LOAD' : 'STABLE'
    const overloadedNodes = loads
      .map((load, index) => load >= 100 ? `DN-${String(index + 1).padStart(2, '0')}` : '')
      .filter(Boolean)
    if (overloadedNodes.length > 0) {
      const reason = `${overloadedNodes.join('、')} 负载已满（100%）`
      const deathMessage = `${reason}。极速模式规则：任一节点达到 100% 立即结束本局。`
      this.tracker.track({ type: 'ranked_game_over', stage: `wave-${wave.id}`, value: selected.id, result: reason, duration: actualDecisionMs })
      return {
        ...state,
        phase: 'ranked-dead',
        dnLoads: loads,
        queryNodes: selected.queryNodes,
        systemStatus: 'OVERLOAD',
        lastDecisionStrategy: selected.id,
        deathReason: deathMessage,
        cargoMode: 'idle',
        npcMessage: `调度中止：${deathMessage}`,
      }
    }
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
      npcMessage: selected.id === 'replicated' ? `${result.note} ${gtmPlainLine}` : result.note,
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
    const waveCount = state.mode === 'ranked' ? getRankedWaveSet(state.dailySeed).length : rankedWaveCount
    if (state.mode !== 'ranked' || state.phase !== 'ranked-result' || state.waveIndex >= waveCount - 1) return state
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
      npcMessage: nextWave >= 11 ? rankedFinalRushLine : '新波次已到达。当前负载不会重置，还是那三条铁律。',
    }
  }

  finishRanked(state: GameState): GameState {
    const waveCount = state.mode === 'ranked' ? getRankedWaveSet(state.dailySeed).length : rankedWaveCount
    if (state.mode !== 'ranked' || state.phase !== 'ranked-result' || state.waveIndex !== waveCount - 1) return state
    this.tracker.track({ type: 'game_completed', stage: 'ranked-complete', duration: elapsedSeconds(state.gameStartedAt) })
    return { ...state, phase: 'complete', screen: 'result', cargoMode: 'final', npcMessage: '14 波调度完成。查看报告，找出下一局最容易提升的失分点。' }
  }

  private projectRankedLoads(state: GameState, wave: RankedWave, option: RankedOption): [number, number, number] {
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
