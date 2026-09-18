import type { RankedOption, RankedWave } from '../config/rankedWaves'

export type LoadTriple = [number, number, number]

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value))

// 按钮上的数字、预测面板和正式评分共用这一份负载模型：
// 显示的和算分的必须是同一个结果，否则玩家按数字选就会被扣分。
export interface LoadContext {
  dnLoads: LoadTriple
  largeCopies: number
  queryPressure: number
}

export const projectOptionLoads = (
  wave: Pick<RankedWave, 'finalRush' | 'queryLoad'>,
  option: Pick<RankedOption, 'loadDelta' | 'queryNodes'>,
  context: LoadContext,
): LoadTriple => {
  const rushPressure = wave.finalRush ? 5 : 0
  const replicationPressure = context.largeCopies > 1 ? 2 : 0
  const accumulatedPressure = Math.round(context.queryPressure * 0.04)
  // 查询要触达几个 DN，这次查询就压在这几个 DN 上。
  // 分流键和查询条件不一致时每个 DN 都要参与，所以三个 DN 会一起被抬高；
  // 只触达一个 DN 的查询没有这份额外开销，它的代价体现在分流键这一侧。
  const queryHit = option.queryNodes > 1 ? wave.queryLoad : 0
  return context.dnLoads.map((load, index) => clamp(Math.round(
    load * 0.82 + option.loadDelta[index] + rushPressure + replicationPressure + accumulatedPressure + queryHit,
  ))) as LoadTriple
}

export const peakLoadOf = (loads: LoadTriple) => Math.max(...loads)
export const peakNodeIndexOf = (loads: LoadTriple) => loads.indexOf(peakLoadOf(loads))
