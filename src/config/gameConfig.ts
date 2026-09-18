import type { DispatchStrategy, RankedStrategy } from '../game/GameState'

export const shardingScenarios: Record<DispatchStrategy, { label: string; description: string; distribution: [number, number, number] }> = {
  id: { label: '按编号分配', description: '编号尾数轮流进入三个节点', distribution: [33, 34, 33] },
  region: { label: '按地区分配', description: '相同地区的数据放在一起', distribution: [46, 35, 19] },
  status: { label: '按状态分配', description: '相同报名状态的数据放在一起', distribution: [82, 10, 8] },
}

export const stageLabels = {
  tutorial: '系统接入',
  sharding: '数据分片',
  query: '查询调度',
  replication: '复制策略',
  gtm: '事务协调',
  final: 'FINAL DISPATCH',
} as const

// 决策时能看见的那一层：按钮先说物流动作，OpenTenBase 术语只放在第二行。
// 同一动作在每一波都叫同一个名字，20 秒的阅读时间里不再出现新词。
export const strategyVocabulary: Record<RankedStrategy, { action: string; term: string }> = {
  id: { action: '按编号分流', term: 'Shard · 分片表' },
  region: { action: '按地区分流', term: 'Shard · 分片表' },
  time: { action: '按时间分流', term: 'Shard · 分片表' },
  range: { action: '按区间分流', term: 'Shard · 分片表' },
  status: { action: '按状态分流', term: 'Shard · 分片表' },
  replicated: { action: '就近复制一份', term: 'Replication · 复制表' },
  centralized: { action: '只放一个仓', term: '单份存储 · 无副本' },
  broadcast: { action: '三个仓都问一遍', term: 'Broadcast · 广播查询' },
}

export const actionLabelOf = (strategy: RankedStrategy | string) =>
  (strategyVocabulary as Record<string, { action: string; term: string } | undefined>)[strategy]?.action ?? strategy

export const strategyTermOf = (strategy: RankedStrategy | string) =>
  (strategyVocabulary as Record<string, { action: string; term: string } | undefined>)[strategy]?.term ?? ''

// 结算只对照官方用法，不重复报分。三条铁律。
export const tablePlacementRules = [
  { condition: '大表、持续写入', placement: '分流、只存一份', table: '分片表' },
  { condition: '小而公共、谁都读', placement: '每仓一份', table: '复制表' },
  { condition: '查询条件和分流键不一致', placement: '触达节点从 1 变成 3', table: '代价' },
] as const

// GTM 继续自动播，不给玩家第四个选项：结算只用一句人话。
export const gtmPlainLine = '多仓一起改的时候，GTM 在对齐事务。'

// 教学三波写死这三条，Ranked 中段和 Final Rush 都只是加压，不是新课。
export const trainingLessons = [
  {
    rule: '按人找就按人分流，否则三个仓都要问。',
    risk: '按状态或热点地区分流，会把数据挤爆一个仓。',
  },
  {
    rule: '小名单复制：每个仓各放一份，谁来都能就近读。',
    risk: '公共数据只放一处，三个仓每次都要跨仓搬。',
  },
  {
    rule: '大日志禁止三份全抄：每条只存一份，三个仓分担写入。',
    risk: '大表全量复制，空间和写入立刻变成三倍。',
  },
] as const

export const rankedFinalRushLine = 'FINAL RUSH：还是那三条铁律，只是压力更大，不引入新机制。'
