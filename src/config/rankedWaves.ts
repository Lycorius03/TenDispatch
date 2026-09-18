import type { RankedStrategy } from '../game/GameState'
import { strategyVocabulary } from './gameConfig'

export type LoadDelta = [number, number, number]
export type WaveDifficulty = 'easy' | 'medium' | 'hard'

export interface RankedOption {
  id: RankedStrategy
  label: string
  detail: string
  loadDelta: LoadDelta
  queryNodes: number
  crossNodeMovement: number
  resourceCost: number
  note: string
}

export type WaveDominant = 'query' | 'write' | 'read'

export interface RankedWave {
  id: number
  templateId?: string
  difficulty?: WaveDifficulty
  title: string
  dataName: string
  size: 1 | 2 | 3 | 4 | 5
  // 任务卡只说三件事：分布、查询方式，以及这一波哪个更重。
  distribution: string
  access: string
  // 查询压力与写入压力谁更重：决定"键对查询"和"分摊写入"哪个优先，避免两条线索互相打架。
  dominant: WaveDominant
  // 查询触达多个 DN 时，每个 DN 被这次查询抬高的负载。
  queryLoad: number
  publicData: boolean
  finalRush?: boolean
  defaultStrategy: RankedStrategy
  options: RankedOption[]
}

// 按钮固定成物流动作，术语放在按钮第二行和结算里。每波只换副文案里的后果。
const makeOption = (
  id: RankedStrategy,
  detail: string,
  loadDelta: LoadDelta,
  queryNodes: number,
  crossNodeMovement: number,
  resourceCost: number,
  note: string,
): RankedOption => ({ id, label: strategyVocabulary[id].action, detail, loadDelta, queryNodes, crossNodeMovement, resourceCost, note })

const rankedWaveTemplates: RankedWave[] = [
  {
    id: 1,
    title: '用户活动记录进入',
    dataName: '用户活动记录',
    size: 3,
    distribution: '地区集中，编号均匀',
    access: '按用户编号查',
    publicData: false,
    dominant: 'query', queryLoad: 4,
    defaultStrategy: 'id',
    options: [
      makeOption('id', '按编号分到三个 DN，按编号查询只触达一个 DN。', [7, 8, 7], 1, 8, 7, '编号和查询条件一致，写入和查询都只落一个节点。'),
      makeOption('region', '同地区放在一个 DN，地区集中的部分会先压满一个 DN；按编号查要触达三个 DN。', [22, 5, 7], 3, 22, 6, '查询条件和分流键不一致：触达节点从 1 变成 3，地区集中的部分还会堆在一个节点。'),
      makeOption('status', '同状态放在一个 DN，状态比例不均，三个 DN 的负载差最大。', [31, 3, 2], 3, 29, 5, '状态分布不均：一个 DN 接近独占，另外两个空闲，查询也要三个 DN 都问。'),
    ],
  },
  {
    id: 2,
    title: '订单明细持续写入',
    dataName: '订单明细',
    size: 2,
    distribution: '各地区分布均匀，编号均匀',
    access: '按订单编号查',
    publicData: false,
    dominant: 'query', queryLoad: 4,
    defaultStrategy: 'id',
    options: [
      makeOption('id', '按编号分到三个 DN，单笔查询只触达一个 DN。', [6, 7, 6], 1, 7, 6, '编号均匀，按编号分流即可，单笔查询只落一个节点。'),
      makeOption('region', '同地区放在一个 DN，单笔订单查询要触达三个 DN。', [9, 8, 7], 3, 19, 5, '查询条件和分流键不一致：触达节点从 1 变成 3。'),
      makeOption('replicated', '三个 DN 各存一份，写入要同步三份，多占两份空间。', [15, 15, 15], 1, 26, 28, '大表全量复制：写入和占用都变成三倍。'),
    ],
  },
  {
    id: 3,
    title: '区域活动报名涌入',
    dataName: '区域活动报名',
    size: 3,
    distribution: '地区分布差异明显',
    access: '按地区汇总',
    publicData: false,
    dominant: 'query', queryLoad: 6,
    defaultStrategy: 'region',
    options: [
      makeOption('region', '同地区放在一个 DN，按地区汇总只触达一个 DN。', [11, 8, 6], 1, 8, 7, '汇总条件和分流键一致，报表只落一个节点；地区规模差异会留在一个 DN 上。'),
      makeOption('id', '按编号分到三个 DN，按地区汇总要触达三个 DN。', [8, 8, 8], 3, 21, 7, '查询条件和分流键不一致：地区汇总的触达节点从 1 变成 3。'),
      makeOption('status', '同状态放在一个 DN，热门状态会占满一个 DN。', [24, 5, 6], 3, 25, 6, '状态比例失衡：热门状态堆在一个节点，汇总查询也要三个 DN 都问。'),
    ],
  },
  {
    id: 4,
    title: '个人通知任务生成',
    dataName: '用户通知任务',
    size: 2,
    distribution: '编号均匀，单用户查询集中',
    access: '按用户编号查',
    publicData: false,
    dominant: 'query', queryLoad: 4,
    defaultStrategy: 'id',
    options: [
      makeOption('id', '按编号分到三个 DN，同一用户反复查询也只触达一个 DN。', [8, 7, 8], 1, 8, 6, '按用户查询和分流键一致，查询路径最短。'),
      makeOption('region', '同地区放在一个 DN，地区集中会让一个 DN 先满；按用户查要触达三个 DN。', [19, 8, 6], 3, 20, 6, '地区不是这批数据的查询条件：触达节点从 1 变成 3，还会先压满一个节点。'),
      makeOption('replicated', '三个 DN 各存一份，写入要同步三份，多占两份空间。', [13, 13, 13], 1, 24, 22, '数据量不大，但这批数据持续写入，复制要多同步两份。'),
    ],
  },
  {
    id: 5,
    title: '公共院系目录上线',
    dataName: '院系公共目录',
    size: 1,
    distribution: '数据量小，所有业务都要用',
    access: '按名称或编码查',
    publicData: true,
    dominant: 'read', queryLoad: 8,
    defaultStrategy: 'replicated',
    options: [
      makeOption('replicated', '三个 DN 各存一份，查询不再跨节点。', [5, 5, 5], 1, 7, 14, '公共小表每个 DN 各存一份，查询只落一个节点。'),
      makeOption('centralized', '只在一个 DN 存一份，另外两个 DN 每次读取都要跨节点取。', [16, 2, 2], 3, 25, 4, '公共目录只存一份：每次读取都要跨节点，触达节点从 1 变成 3。'),
      makeOption('region', '同地区放在一个 DN，公共查询被拆成三条路径。', [8, 8, 7], 3, 22, 8, '公共数据不需要按地区分流：触达节点从 1 变成 3，跨节点读取反而更多。'),
    ],
  },
  {
    id: 6,
    title: '海量业务日志进入',
    dataName: '业务日志',
    size: 5,
    distribution: '持续增长，写入量大',
    access: '按时间段检索',
    publicData: false,
    dominant: 'write', queryLoad: 6,
    defaultStrategy: 'time',
    options: [
      makeOption('time', '按时间分段放在三个 DN，按时间段检索只触达一个 DN，每条只存一份。', [12, 10, 11], 1, 10, 9, '大表按时间分流、只存一份，写入和占用都摊开。'),
      makeOption('id', '按编号分到三个 DN，按时间段检索要触达三个 DN。', [10, 11, 10], 3, 23, 9, '查询条件和分流键不一致：时间检索的触达节点从 1 变成 3。'),
      makeOption('replicated', '三个 DN 各存一份，占用和写入都变成三倍。', [28, 28, 28], 1, 31, 40, '大日志不应全量复制：占用、写入和同步都变成三倍。'),
    ],
  },
  {
    id: 7,
    title: '热门榜单刷新',
    dataName: '热门榜单缓存',
    size: 1,
    distribution: '数据量小，访问有突发尖峰',
    access: '随机读取',
    publicData: true,
    dominant: 'read', queryLoad: 8,
    defaultStrategy: 'replicated',
    options: [
      makeOption('replicated', '三个 DN 各存一份，查询不再跨节点。', [7, 6, 7], 1, 9, 16, '公共小表每个 DN 各存一份，突发访问被摊到三个节点。'),
      makeOption('centralized', '只在一个 DN 存一份，突发访问全部落在一个 DN。', [21, 3, 3], 3, 28, 5, '热点集中在单个节点：一个 DN 被读满，其他 DN 读取还要跨节点。'),
      makeOption('id', '按编号分到三个 DN，编号不是这批数据的查询条件，三个 DN 都要问。', [10, 9, 10], 3, 23, 7, '分流键和查询条件不一致：触达节点从 1 变成 3。'),
    ],
  },
  {
    id: 8,
    title: '活动轨迹批量写入',
    dataName: '活动轨迹',
    size: 4,
    distribution: '记录多，单个用户的记录连续',
    access: '按用户编号查最近记录',
    publicData: false,
    dominant: 'query', queryLoad: 5,
    defaultStrategy: 'id',
    options: [
      makeOption('id', '按编号分到三个 DN，同一用户的记录都在一个 DN。', [9, 10, 9], 1, 9, 9, '按用户查询和分流键一致，最近记录只触达一个节点。'),
      makeOption('region', '同地区放在一个 DN，地区集中带来写入压力；按用户查要触达三个 DN。', [20, 8, 7], 3, 24, 8, '地区不是主要查询条件：触达节点从 1 变成 3，还会先压满一个节点。'),
      makeOption('replicated', '三个 DN 各存一份，写入要同步三份。', [21, 21, 21], 1, 30, 34, '这批数据持续写入，全量复制会把写入放大三倍。'),
    ],
  },
  {
    id: 9,
    title: '区域营销数据汇总',
    dataName: '区域营销数据',
    size: 3,
    distribution: '地区分布明显，少数城市集中',
    access: '按地区汇总',
    publicData: false,
    dominant: 'query', queryLoad: 6,
    defaultStrategy: 'region',
    options: [
      makeOption('region', '同地区放在一个 DN，按地区汇总只触达一个 DN。', [13, 9, 7], 1, 10, 8, '汇总条件就是分流键，报表只落一个节点；热点城市会留在一个 DN 上。'),
      makeOption('id', '按编号分到三个 DN，按地区汇总要触达三个 DN。', [10, 10, 10], 3, 22, 8, '查询条件和分流键不一致：汇总的触达节点从 1 变成 3。'),
      makeOption('status', '同状态放在一个 DN，状态数量差异大。', [23, 5, 7], 3, 26, 6, '状态分布不均：一个 DN 先满，汇总还要三个 DN 都问。'),
    ],
  },
  {
    id: 10,
    title: '支付事件高峰',
    dataName: '支付事件',
    size: 4,
    distribution: '用户分布均匀，写入峰值高',
    access: '按用户和订单编号查',
    publicData: false,
    dominant: 'write', queryLoad: 5,
    defaultStrategy: 'id',
    options: [
      makeOption('id', '按编号分到三个 DN，同一用户的事件稳定落在一个 DN。', [12, 11, 12], 1, 11, 10, '写入峰值被摊开，按用户查询只触达一个节点。'),
      makeOption('time', '按时间分段放在三个 DN，写入能切开；按用户查询要触达三个 DN。', [13, 12, 12], 3, 24, 9, '只解决了写入：用户查询的触达节点从 1 变成 3。'),
      makeOption('replicated', '三个 DN 各存一份，写入峰值要同步三份。', [27, 27, 27], 1, 32, 38, '写入峰值期全量复制：同步写入变成三倍，多占两份空间。'),
    ],
  },
  {
    id: 11,
    title: '权限目录访问激增',
    dataName: '权限公共目录',
    size: 1,
    distribution: '数据量小，读取频率极高',
    access: '按编码读取',
    publicData: true,
    dominant: 'read', queryLoad: 8,
    defaultStrategy: 'replicated',
    options: [
      makeOption('replicated', '三个 DN 各存一份，查询不再跨节点。', [6, 6, 6], 1, 8, 15, '公共小表每个 DN 各存一份，读取不再经过单个节点。'),
      makeOption('centralized', '只在一个 DN 存一份，所有请求都落在一个 DN。', [19, 3, 3], 3, 29, 4, '公共目录只存一份：单个节点被读满，其他 DN 读取还要跨节点。'),
      makeOption('id', '按编号分到三个 DN，编号不是这批数据的查询条件，三个 DN 都要问。', [10, 9, 10], 3, 24, 7, '分流键和查询条件不一致：触达节点从 1 变成 3。'),
    ],
  },
  {
    id: 12,
    title: 'FINAL RUSH · 大型业务数据进入',
    dataName: '大型业务数据',
    size: 5,
    distribution: '持续大批量写入，节点余量有限',
    access: '按用户编号查 + 按时间段检索',
    publicData: false,
    dominant: 'write', queryLoad: 5,
    finalRush: true,
    defaultStrategy: 'id',
    options: [
      makeOption('id', '按编号分到三个 DN，写入摊开，按用户查询只触达一个 DN。', [15, 14, 15], 1, 13, 11, '写入摊开，按用户查询也只触达一个节点。'),
      makeOption('time', '按时间分段放在三个 DN，按时间检索可行，按用户查询要触达三个 DN。', [15, 15, 14], 3, 27, 10, '只解决了写入：用户查询的触达节点从 1 变成 3。'),
      makeOption('replicated', '三个 DN 各存一份，占用和写入都变成三倍。', [32, 32, 32], 1, 35, 43, '高压下全量复制：资源会立刻吃满。'),
    ],
  },
  {
    id: 13,
    title: 'FINAL RUSH · 高频查询突然增加',
    dataName: '用户画像查询',
    size: 3,
    distribution: '少量编号被反复查询',
    access: '按编号高频查询',
    publicData: false,
    dominant: 'query', queryLoad: 8,
    finalRush: true,
    defaultStrategy: 'id',
    options: [
      makeOption('id', '按编号分到三个 DN，同一编号反复查询只触达一个 DN。', [12, 12, 11], 1, 11, 8, '查询密度上升时，单节点路径开销最小。'),
      makeOption('broadcast', '请求同时发给三个 DN，三个 DN 都要参与，结果还要合并。', [20, 20, 19], 3, 40, 6, '广播查询：触达节点从 1 变成 3，跨节点搬运同时上升。'),
      makeOption('replicated', '三个 DN 各存一份，压力峰值上还要多同步两份。', [20, 20, 20], 1, 28, 27, '热点数据可以复制，但当前资源紧张，复制要多占两份空间。'),
    ],
  },
  {
    id: 14,
    title: 'FINAL RUSH · 公共数据访问激增',
    dataName: '公共活动目录',
    size: 2,
    distribution: '数据量小，三个 DN 同时请求',
    access: '全局高频读取',
    publicData: true,
    dominant: 'read', queryLoad: 8,
    finalRush: true,
    defaultStrategy: 'replicated',
    options: [
      makeOption('replicated', '三个 DN 各存一份，查询不再跨节点。', [10, 9, 10], 1, 10, 18, 'Final Rush 收尾：多存两份，换查询路径稳定。'),
      makeOption('centralized', '只在一个 DN 存一份，公共访问全部落在一个 DN。', [25, 3, 3], 3, 36, 5, '公共访问激增时，只存一份会先成为瓶颈。'),
      makeOption('broadcast', '请求同时发给三个 DN，三个 DN 都要参与。', [18, 18, 18], 3, 43, 8, '没有复制，每次读取都要三个 DN 一起参与：触达节点一直是 3。'),
    ],
  },
]

const coreEasyWaveIds = new Set([1, 2, 3, 4, 5, 7, 8, 11])

const difficultyForCoreWave = (wave: RankedWave): WaveDifficulty => {
  if (wave.finalRush) return 'hard'
  return coreEasyWaveIds.has(wave.id) ? 'easy' : 'medium'
}

type WaveVariantPatch = {
  title: string
  dataName: string
  size: RankedWave['size']
  distribution: string
  access: string
  publicData: boolean
  defaultStrategy: RankedWave['defaultStrategy']
  difficulty: WaveDifficulty
  finalRush?: boolean
  loadOffset?: LoadDelta
  movementOffset?: number
  resourceOffset?: number
}

const createWaveVariant = (sourceId: number, id: number, templateId: string, patch: WaveVariantPatch): RankedWave => {
  const source = rankedWaveTemplates.find((wave) => wave.id === sourceId)
  if (!source) throw new Error(`Missing ranked wave template ${sourceId}`)
  const loadOffset = patch.loadOffset ?? [0, 0, 0]
  const movementOffset = patch.movementOffset ?? 0
  const resourceOffset = patch.resourceOffset ?? 0
  const { difficulty, finalRush, loadOffset: _loadOffset, movementOffset: _movementOffset, resourceOffset: _resourceOffset, ...fields } = patch
  return {
    ...source,
    ...fields,
    id,
    templateId,
    difficulty,
    finalRush: finalRush ?? source.finalRush,
    options: source.options.map((option) => ({
      ...option,
      loadDelta: option.loadDelta.map((value, index) => Math.max(1, value + loadOffset[index])) as LoadDelta,
      crossNodeMovement: Math.max(0, option.crossNodeMovement + movementOffset),
      resourceCost: Math.max(1, option.resourceCost + resourceOffset),
    })),
  }
}

// The library deliberately contains more candidates than one run needs. A
// seeded draw below chooses without replacement, so every player sees the
// same fair 14-wave shape for a Daily Seed while different seeds still feel
// meaningfully different.
const variantWaves: RankedWave[] = [
  createWaveVariant(1, 101, 'easy-device-heartbeats', {
    title: '设备心跳事件进入', dataName: '设备心跳事件', size: 2,
    distribution: '设备编号均匀，少数园区集中', access: '按设备编号查', publicData: false, defaultStrategy: 'id', difficulty: 'easy',
    loadOffset: [1, 0, 1], movementOffset: 1,
  }),
  createWaveVariant(2, 102, 'easy-favorite-changes', {
    title: '用户收藏变更', dataName: '收藏变更记录', size: 2,
    distribution: '用户编号均匀，写入平稳', access: '按用户编号查', publicData: false, defaultStrategy: 'id', difficulty: 'easy',
    loadOffset: [0, 1, 0], resourceOffset: 1,
  }),
  createWaveVariant(5, 103, 'easy-service-catalog', {
    title: '服务标签目录上线', dataName: '服务标签目录', size: 1,
    distribution: '数据量小，所有服务都要用', access: '按标签编码查', publicData: true, defaultStrategy: 'replicated', difficulty: 'easy',
    loadOffset: [1, 1, 0], movementOffset: -1,
  }),
  createWaveVariant(3, 104, 'easy-campus-signups', {
    title: '校园活动报名', dataName: '校园活动报名', size: 3,
    distribution: '校区分布差异明显', access: '按校区汇总', publicData: false, defaultStrategy: 'region', difficulty: 'easy',
    loadOffset: [0, 1, 1], movementOffset: 1,
  }),
  createWaveVariant(4, 105, 'easy-support-notices', {
    title: '客服通知队列生成', dataName: '客服通知队列', size: 2,
    distribution: '用户编号均匀，单用户查询集中', access: '按用户编号查', publicData: false, defaultStrategy: 'id', difficulty: 'easy',
    loadOffset: [1, 0, 1], resourceOffset: 1,
  }),
  createWaveVariant(7, 106, 'easy-search-hotwords', {
    title: '热门搜索词刷新', dataName: '热门搜索词缓存', size: 1,
    distribution: '数据量小，访问有突发尖峰', access: '随机读取', publicData: true, defaultStrategy: 'replicated', difficulty: 'easy',
    loadOffset: [0, 1, 0], movementOffset: 1,
  }),
  createWaveVariant(6, 201, 'medium-monitoring-series', {
    title: '时间序列监控涌入', dataName: '时间序列监控', size: 5,
    distribution: '持续增长，写入量大', access: '按时间段检索', publicData: false, defaultStrategy: 'time', difficulty: 'medium',
    loadOffset: [1, 0, 1], resourceOffset: 1,
  }),
  createWaveVariant(10, 202, 'medium-inventory-events', {
    title: '库存变更流高峰', dataName: '库存变更事件', size: 4,
    distribution: '仓号分布均匀，写入峰值高', access: '按商品和订单编号查', publicData: false, defaultStrategy: 'id', difficulty: 'medium',
    loadOffset: [0, 1, 1], movementOffset: 1,
  }),
  createWaveVariant(9, 203, 'medium-cross-region-orders', {
    title: '跨区订单汇总', dataName: '跨区订单数据', size: 3,
    distribution: '地区分布明显，热点城市集中', access: '按地区汇总', publicData: false, defaultStrategy: 'region', difficulty: 'medium',
    loadOffset: [1, 1, 0], resourceOffset: 1,
  }),
  createWaveVariant(8, 204, 'medium-device-traces', {
    title: '设备轨迹批量归档', dataName: '设备轨迹', size: 4,
    distribution: '设备多，单台设备的记录连续', access: '按设备编号查最近记录', publicData: false, defaultStrategy: 'id', difficulty: 'medium',
    loadOffset: [1, 0, 1], movementOffset: 2,
  }),
  createWaveVariant(6, 205, 'medium-audit-stream', {
    title: '审计事件流进入', dataName: '审计事件', size: 5,
    distribution: '持续增长，按时间窗口读取', access: '按时间段检索', publicData: false, defaultStrategy: 'time', difficulty: 'medium',
    loadOffset: [0, 1, 1], resourceOffset: 2,
  }),
  createWaveVariant(10, 206, 'medium-marketing-clicks', {
    title: '营销点击流水上升', dataName: '营销点击流水', size: 4,
    distribution: '用户分布均匀，短时写入密集', access: '按用户和活动编号查', publicData: false, defaultStrategy: 'id', difficulty: 'medium',
    loadOffset: [1, 1, 0], movementOffset: 2,
  }),
  createWaveVariant(6, 207, 'medium-backup-metrics', {
    title: '备份指标持续写入', dataName: '备份指标', size: 5,
    distribution: '持续增长，按时间窗口读取', access: '按时间段检索', publicData: false, defaultStrategy: 'time', difficulty: 'medium',
    loadOffset: [1, 1, 0], resourceOffset: 1,
  }),
  createWaveVariant(9, 208, 'medium-delivery-regions', {
    title: '配送区域状态汇总', dataName: '配送区域状态', size: 3,
    distribution: '地区分布明显，少数城市集中', access: '按地区汇总', publicData: false, defaultStrategy: 'region', difficulty: 'medium',
    loadOffset: [0, 1, 1], movementOffset: 1,
  }),
  createWaveVariant(10, 209, 'medium-login-audits', {
    title: '登录审计事件激增', dataName: '登录审计事件', size: 4,
    distribution: '用户分布均匀，短时写入密集', access: '按用户和时间查', publicData: false, defaultStrategy: 'id', difficulty: 'medium',
    loadOffset: [1, 0, 1], resourceOffset: 2,
  }),
  createWaveVariant(8, 210, 'medium-mobile-traces', {
    title: '移动端轨迹汇总', dataName: '移动端轨迹', size: 4,
    distribution: '设备多，单台设备的记录连续', access: '按设备编号查最近记录', publicData: false, defaultStrategy: 'id', difficulty: 'medium',
    loadOffset: [0, 1, 1], movementOffset: 2,
  }),
  createWaveVariant(12, 301, 'hard-settlement-stream', {
    title: 'FINAL RUSH · 结算流水进入', dataName: '结算流水', size: 5,
    distribution: '持续大批量写入，节点余量有限', access: '按账户查 + 按时间段检索', publicData: false, finalRush: true, defaultStrategy: 'id', difficulty: 'hard',
    loadOffset: [1, 0, 1], resourceOffset: 1,
  }),
  createWaveVariant(13, 302, 'hard-hot-account-query', {
    title: 'FINAL RUSH · 热点账户查询', dataName: '热点账户画像', size: 3,
    distribution: '少量账户被反复查询', access: '按账户编号高频查询', publicData: false, finalRush: true, defaultStrategy: 'id', difficulty: 'hard',
    loadOffset: [0, 1, 1], movementOffset: 1,
  }),
  createWaveVariant(14, 303, 'hard-public-config-storm', {
    title: 'FINAL RUSH · 公共配置风暴', dataName: '公共配置目录', size: 2,
    distribution: '数据量小，三个 DN 同时请求', access: '全局高频读取', publicData: true, finalRush: true, defaultStrategy: 'replicated', difficulty: 'hard',
    loadOffset: [1, 0, 1], resourceOffset: 1,
  }),
  createWaveVariant(6, 304, 'hard-live-alerts', {
    title: 'FINAL RUSH · 实时告警批量进入', dataName: '实时告警事件', size: 5,
    distribution: '告警持续写入，写入压力大', access: '按时间窗口检索', publicData: false, finalRush: true, defaultStrategy: 'time', difficulty: 'hard',
    loadOffset: [1, 1, 0], movementOffset: 1,
  }),
  createWaveVariant(13, 305, 'hard-risk-profiles', {
    title: 'FINAL RUSH · 风控画像被反复查询', dataName: '风控画像', size: 3,
    distribution: '热点账户集中，查询密度高', access: '按账户编号高频查询', publicData: false, finalRush: true, defaultStrategy: 'id', difficulty: 'hard',
    loadOffset: [1, 0, 1], resourceOffset: 1,
  }),
  createWaveVariant(14, 306, 'hard-global-labels', {
    title: 'FINAL RUSH · 全局标签访问激增', dataName: '全局标签目录', size: 2,
    distribution: '数据量小，三个 DN 同时请求', access: '高频读取', publicData: true, finalRush: true, defaultStrategy: 'replicated', difficulty: 'hard',
    loadOffset: [0, 1, 1], movementOffset: 1,
  }),
]

const normalizeCoreWave = (wave: RankedWave): RankedWave => ({
  ...wave,
  templateId: `core-${String(wave.id).padStart(2, '0')}`,
  difficulty: difficultyForCoreWave(wave),
})

export const rankedWaveLibrary: RankedWave[] = [
  ...rankedWaveTemplates.map(normalizeCoreWave),
  ...variantWaves,
]

export const rankedDifficultyQuota = {
  easy: 3,
  medium: 8,
  hard: 3,
} as const satisfies Record<WaveDifficulty, number>

export const rankedWaveCount = Object.values(rankedDifficultyQuota).reduce((sum, value) => sum + value, 0)
export const rankedDurationSeconds = 90
export const rankedDecisionWindowMs = 20000
export const rankedNextWaveDelayMs = 3000

const defaultRankedSeed = 'TD-DEFAULT'

const hashSeed = (seed: string) => {
  let hash = 2166136261
  for (const character of seed) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const createSeededRandom = (seed: string) => {
  let value = hashSeed(seed)
  return () => {
    value = (value + 0x6D2B79F5) | 0
    let result = Math.imul(value ^ (value >>> 15), 1 | value)
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: readonly T[], random: () => number) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1))
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}

const wavePool = (difficulty: WaveDifficulty) => rankedWaveLibrary.filter((wave) => wave.difficulty === difficulty)

export const buildRankedWaveSet = (seed: string): RankedWave[] => {
  const random = createSeededRandom(seed || defaultRankedSeed)
  const selected = (['easy', 'medium', 'hard'] as const).flatMap((difficulty) => {
    const count = rankedDifficultyQuota[difficulty]
    const pool = wavePool(difficulty)
    if (pool.length < count) throw new Error(`Ranked wave pool for ${difficulty} is too small`)
    return shuffle(pool, random).slice(0, count)
  })
  return selected.map((wave, index) => ({
    ...wave,
    id: index + 1,
  }))
}

const rankedWaveSets = new Map<string, RankedWave[]>()

export const getRankedWaveSet = (seed = defaultRankedSeed) => {
  const key = seed || defaultRankedSeed
  const cached = rankedWaveSets.get(key)
  if (cached) return cached
  const generated = buildRankedWaveSet(key)
  rankedWaveSets.set(key, generated)
  return generated
}

export const rankedWaves = getRankedWaveSet(defaultRankedSeed)

// 教学三波：活动记录、公共目录、海量日志，各自锁定一条判断。
export const tutorialWaves: RankedWave[] = [1, 5, 6].map((sourceId, index) => ({
  ...(rankedWaveLibrary.find((wave) => wave.templateId === `core-${String(sourceId).padStart(2, '0')}`) as RankedWave),
  id: index + 1,
}))

// Kept for integrations that still expect the original single tutorial wave.
export const tutorialWave = tutorialWaves[0]

export const getRankedWave = (index: number, seed = defaultRankedSeed) => {
  const waves = getRankedWaveSet(seed)
  return waves[Math.max(0, Math.min(waves.length - 1, index))]
}
