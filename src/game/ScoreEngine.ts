import type { GameState } from './GameState'
import { scoreConfig } from '../config/scoreConfig'

export interface ScoreBreakdown {
  distribution: number
  query: number
  replication: number
  architecture: number
  independence: number
  total: number
  title: string
  feedback: string
}

export class ScoreEngine {
  calculate(state: GameState): ScoreBreakdown {
    let distribution = state.finalSharding === 'id' ? 25 : state.finalSharding === 'region' ? 19 : 10
    if (state.skewTriggered && state.finalSharding === 'id') distribution += 5

    const query = state.queryNodes === 1 ? 20 : 13
    const finalQueryBonus = state.finalChoices.query === 'targeted' ? 5 : 0

    let replication = 0
    replication += state.finalReplication === 'replicated' ? 10 : 5
    replication += state.largeReplication === 'centralized' ? 7 : 2
    replication += state.finalChoices.publicData === 'replicated' ? 3 : 0

    const architecture = state.systemStatus === 'STABLE' ? 15 : state.systemStatus === 'HIGH LOAD' ? 12 : 9
    const independence = Math.max(3, 10 - state.hintCount * 2 - Math.max(0, state.retryCount - 1))
    const maximum = Object.values(scoreConfig).reduce((sum, value) => sum + value, 0)
    const total = Math.min(maximum, distribution + query + finalQueryBonus + replication + architecture + independence)
    const title = total >= 90 ? '首席数据调度员' : total >= 80 ? '高级数据调度员' : total >= 70 ? '数据调度员' : '调度实习员'
    const feedback = this.feedback(state)

    return { distribution, query: query + finalQueryBonus, replication, architecture, independence, total, title, feedback }
  }

  private feedback(state: GameState) {
    if (state.skewTriggered && state.finalSharding === 'id' && state.largeReplication === 'centralized') {
      return '你发现并修正了数据倾斜，也准确判断了 Replication 的使用边界。'
    }
    if (state.queryNodes > 1) {
      return '你的系统顺利完成了调度；让数据布局更贴近查询方式，可以进一步缩短访问路径。'
    }
    if (state.largeReplication === 'replicated') {
      return '你的查询调度很精准；对于海量数据，还可以更谨慎地权衡复制带来的资源成本。'
    }
    return '你在高负载环境下保持了稳定的数据分布和清晰的查询路径。'
  }
}
