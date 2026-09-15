import type { DispatchStrategy } from '../game/GameState'

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
