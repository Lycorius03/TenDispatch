import type { DispatchStrategy, RankedStrategy } from '../game/GameState'
import type { WaveDominant } from './rankedWaves'

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

// 决策时看得见的那一层：按钮写物流动作，OpenTenBase 的说法放在按钮第二行。
// 同一动作在每一波都叫同一个名字，20 秒内不出现新词。
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

// 结算对照官方用法，不重复报分。
export const tablePlacementRules = [
  { condition: '大表、持续写入', placement: '分流、只存一份', table: '分片表' },
  { condition: '小而公共、高频读取', placement: '每仓一份', table: '复制表' },
  { condition: '查询条件和分流键不一致', placement: '触达节点从 1 变成 3', table: '代价' },
] as const

// 每波只让一个因素主导，任务卡的第三条把权重说清楚，
// 避免"分布"和"查询"两行各自指向不同的动作。
export const dominantLines: Record<WaveDominant, string> = {
  query: '查询比写入更重，分流键要对上查询条件。',
  write: '写入比查询更重，先看写入能不能摊开、会不会多存几份。',
  read: '读取比写入更重，先看读取要不要跨节点。',
}

export const dominantLineOf = (dominant: WaveDominant) => dominantLines[dominant]

// GTM 自动播放，不作为玩家选项；结算只用一句话说明它在做什么。
export const gtmPlainLine = '多仓一起改的时候，GTM 在对齐事务。'

// 教学三波各自锁定一条判断，Ranked 中段和 Final Rush 只是加压。
export const trainingLessons = [
  {
    point: '按人找就按人分流，否则三个仓都要问。',
    wrong: '按状态或热点地区分流，数据会集中到一个仓。',
  },
  {
    point: '小名单复制，每个仓各存一份，查询不用跨仓。',
    wrong: '公共数据只存一处，另外两个仓每次读取都要跨仓取。',
  },
  {
    point: '大日志禁止三份全抄，每条只存一份，三个仓分担写入。',
    wrong: '大表全量复制，占用和写入都变成三倍。',
  },
] as const

export const rankedFinalRushLine = 'FINAL RUSH：不引入新机制，压力更大，判断依据不变。'
