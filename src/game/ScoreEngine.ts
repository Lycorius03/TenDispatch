import { scoreMultiplier } from '../config/difficulty'
import type { GameState, WaveResult } from './GameState'
import { scoreConfig } from '../config/scoreConfig'

export interface ScoreBreakdown {
  mode?: 'legacy' | 'tutorial' | 'ranked'
  version?: number
  multiplier?: number
  baseTotal?: number
  maximum?: number
  distribution: number
  query: number
  replication: number
  architecture: number
  independence: number
  total: number
  title: string
  feedback: string
  waveScores?: WaveResult[]
  perfectCount?: number
  maxCombo?: number
  averageDecisionMs?: number
  undoPenalty?: number
  worstWave?: GameState['worstWave']
}

export class ScoreEngine {
  calculate(state: GameState): ScoreBreakdown {
    if (state.mode === 'ranked') return this.calculateRanked(state)
    return this.calculateLegacy(state)
  }

  calculateRanked(state: GameState): ScoreBreakdown {
    const waves = state.waveResults
    const baseTotal = waves.reduce((sum, wave) => sum + wave.score.total, 0)
    const total = Math.max(0, state.totalScore)
    const distribution = waves.reduce((sum, wave) => sum + wave.score.loadBalance, 0)
    const query = waves.reduce((sum, wave) => sum + wave.score.queryEfficiency, 0)
    const replication = waves.reduce((sum, wave) => sum + wave.score.resourceCost, 0)
    const architecture = Math.max(0, waves.length * 10 - state.poorCount * 8 - state.undoPenalty)
    const independence = Math.max(0, waves.length * 10 - (state.predictionUsesRemaining < 2 ? 2 : 0) - state.undoPenalty)
    const averageDecisionMs = waves.length === 0 ? 0 : Math.round(waves.reduce((sum, wave) => sum + wave.decisionMs, 0) / waves.length)
    const weakestResult = waves.length > 0 ? [...waves].sort((a, b) => a.score.total - b.score.total)[0] : undefined
    const weakest = state.worstWave ?? (weakestResult ? { wave: weakestResult.wave, lostPoints: 100 - weakestResult.score.total, reason: weakestResult.note } : undefined)
    const title = total >= 2000 ? '数据调度王牌' : total >= 1600 ? '高压调度专家' : total >= 1100 ? '稳定调度员' : '调度成长中'
    const feedback = weakest
      ? `下一局最容易提升：Wave ${weakest.wave}，${weakest.reason}。优先把这一波的查询触达和资源成本压下来。`
      : '完成一局 Ranked 后，这里会告诉你最值得重练的波次。'
    return {
      mode: 'ranked',
      version: 3,
      multiplier: 1,
      baseTotal,
      maximum: 1400,
      distribution,
      query,
      replication,
      architecture,
      independence,
      total,
      title,
      feedback,
      waveScores: waves,
      perfectCount: state.perfectCount,
      maxCombo: state.maxCombo,
      averageDecisionMs,
      undoPenalty: state.undoPenalty,
      worstWave: weakest,
    }
  }

  private calculateLegacy(state: GameState): ScoreBreakdown {
    // First decisions count independently of corrections; deliberate mistakes never earn bonuses.
    const distribution = (state.initialSharding === 'id' ? 15 : state.initialSharding === 'region' ? 8 : 0)
      + (state.finalSharding === 'id' ? 10 : state.finalSharding === 'region' ? 5 : 0)
      + (state.finalChoices.sharding === 'id' ? 5 : state.finalChoices.sharding === 'region' ? 2 : 0)
    const query = state.queryNodes === 1 ? 15 : 4
    const finalQueryBonus = state.finalChoices.query === 'targeted' && state.finalChoices.sharding === 'id' ? 10 : 0
    const replication = (state.initialReplication === 'replicated' ? 6 : 0)
      + (state.finalReplication === 'replicated' ? 4 : 0)
      + (state.largeReplication === 'centralized' ? 7 : 0)
      + (state.finalChoices.publicData === 'replicated' ? 3 : 0)
    const correctFinalChoices = Number(state.finalChoices.sharding === 'id')
      + Number(state.finalChoices.query === 'targeted' && state.finalChoices.sharding === 'id')
      + Number(state.finalChoices.publicData === 'replicated')
    const unavoidablePressure = state.options.pressure * (correctFinalChoices === 3 ? 0.65 : 1)
    const normalizedLoads = state.dnLoads.map(load => Math.max(0, load - unavoidablePressure))
    const peak = Math.max(...normalizedLoads)
    const spread = peak - Math.min(...normalizedLoads)
    const architecture = Math.max(0, Math.min(15, Math.round(15 - Math.max(0, peak-70)*.3 - Math.max(0, spread-10)*.15)))
    const independence = Math.max(0, 10 - (state.options.guide ? 0 : state.hintCount * 2) - Math.max(0, state.retryCount)*2)
    const maximum = Object.values(scoreConfig).reduce((sum, value) => sum + value, 0)
    const baseTotal = Math.min(maximum, distribution + query + finalQueryBonus + replication + architecture + independence)
    const multiplier = scoreMultiplier(state.options.difficulty)
    const total = Math.round(baseTotal * multiplier)
    const title = multiplier === 0 ? '练习完成' : baseTotal >= 90 ? '首席数据调度员' : baseTotal >= 80 ? '高级数据调度员' : baseTotal >= 70 ? '数据调度员' : '调度实习员'
    const feedback = this.feedback(state)

    return { mode: 'legacy', version: 2, multiplier, baseTotal, maximum: maximum * multiplier, distribution, query: query + finalQueryBonus, replication, architecture, independence, total, title, feedback }
  }

  private feedback(state: GameState) {
    if (state.systemStatus === 'OVERLOAD') return '高峰时有仓库忙不过来了。下次试着按编号分散报名、只查目标仓库，并把小份院系名单放到各处。'
    if (state.skewTriggered && state.finalSharding === 'id' && state.largeReplication === 'centralized') {
      return '你把挤在一处的报名重新分开了，也避免了把两百万条日志重复存三遍。'
    }
    if (state.queryNodes > 1) {
      return '这次找一个人却询问了三个仓库。先按编号存报名，下次就能按编号直接找到目标仓库。'
    }
    if (state.largeReplication === 'replicated') {
      return '你能直接找到目标报名；但日志存了三份。下次让各仓库各存一部分，减少占用。'
    }
    return '你在高负载环境下保持了稳定的数据分布和清晰的查询路径。'
  }
}
