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

export interface RankedWave {
  id: number
  templateId?: string
  difficulty?: WaveDifficulty
  title: string
  dataName: string
  size: 1 | 2 | 3 | 4 | 5
  // 任务卡只说两件事：这批货长什么样、待会怎么找。
  distribution: string
  access: string
  publicData: boolean
  finalRush?: boolean
  defaultStrategy: RankedStrategy
  options: RankedOption[]
}

// 按钮固定成物流动作，术语交给第二行和结算。每波只换副文案里的后果。
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
    distribution: '地区扎堆，编号均匀',
    access: '按人查',
    publicData: false,
    defaultStrategy: 'id',
    options: [
      makeOption('id', '一批货拆到三个仓；按编号找人只打一个仓。', [7, 8, 7], 1, 8, 7, '对上了：按人找就按人分流，写入摊平，查询只打一个仓。'),
      makeOption('region', '同地区的货放一起；热点地区会压红一个仓，按人查要问三个仓。', [22, 5, 7], 3, 22, 6, '地区扎堆还按地区放，热点地区挤爆一个仓，按人查也要问三个仓。'),
      makeOption('status', '同状态的货挤在一个仓；三个仓的负载差得最开。', [31, 3, 2], 3, 29, 5, '状态分布不均：一个仓几乎装满，另外两个闲着，查询还要三个仓都问。'),
    ],
  },
  {
    id: 2,
    title: '订单明细持续写入',
    dataName: '订单明细',
    size: 2,
    distribution: '各地区差不多，编号匀',
    access: '按编号查单笔',
    publicData: false,
    defaultStrategy: 'id',
    options: [
      makeOption('id', '一批货拆到三个仓；按编号找人只打一个仓。', [6, 7, 6], 1, 7, 6, '对上了：编号均匀就按编号分流，单笔查询只打一个仓。'),
      makeOption('region', '同地区的货放一起；单笔订单查询要三个仓都问一遍。', [9, 8, 7], 3, 19, 5, '查询条件和分流键不一致：触达节点从 1 变成 3。'),
      makeOption('replicated', '三个仓各放一份；写入要同步三份，多占两份货位。', [15, 15, 15], 1, 26, 28, '大表全量复制：写入和货位都变成三倍。'),
    ],
  },
  {
    id: 3,
    title: '区域活动报名涌入',
    dataName: '区域活动报名',
    size: 3,
    distribution: '地区就是天然分界',
    access: '按地区汇总',
    publicData: false,
    defaultStrategy: 'region',
    options: [
      makeOption('region', '同地区的货放一起；按地区汇总只打一个仓。', [7, 8, 7], 1, 8, 7, '对上了：按地区汇总就按地区分流，报表只打一个仓。'),
      makeOption('id', '一批货拆到三个仓；按人查还行，按地区汇总要问三个仓。', [8, 8, 8], 3, 21, 7, '查询条件和分流键不一致：地区报表的触达节点从 1 变成 3。'),
      makeOption('status', '同状态的货挤在一个仓；热门状态会压红一个仓。', [24, 5, 6], 3, 25, 6, '状态比例失衡：热门状态挤爆一个仓，汇总查询也要三个仓都问。'),
    ],
  },
  {
    id: 4,
    title: '个人通知任务生成',
    dataName: '用户通知任务',
    size: 2,
    distribution: '编号均匀，一个人被反复问',
    access: '按人查',
    publicData: false,
    defaultStrategy: 'id',
    options: [
      makeOption('id', '一批货拆到三个仓；同一个人反复来查也只打一个仓。', [8, 7, 8], 1, 8, 6, '对上了：按人查就按人分流，路径最短。'),
      makeOption('region', '同地区的货放一起；地区热点让一个仓先忙，按人查要问三个仓。', [19, 8, 6], 3, 20, 6, '地区不是这批货的查询条件：触达节点从 1 变成 3，还有一个仓先红。'),
      makeOption('replicated', '三个仓各放一份；写入要同步三份，多占两份货位。', [13, 13, 13], 1, 24, 22, '小数据能复制，但这批货一直在写，复制要多同步两份。'),
    ],
  },
  {
    id: 5,
    title: '公共院系目录上线',
    dataName: '院系公共目录',
    size: 1,
    distribution: '很小，但谁都用',
    access: '谁都来读（按名称与编码）',
    publicData: true,
    defaultStrategy: 'replicated',
    options: [
      makeOption('replicated', '三个仓各放一份；谁来都能就地读。', [5, 5, 5], 1, 7, 14, '对上了：小而公共就每仓一份，读得就近，查询只打一个仓。'),
      makeOption('centralized', '只占一份货位；三个仓每次要用都得跨仓搬一次。', [16, 2, 2], 3, 25, 4, '公共目录只放一个仓：每次都跨仓搬一次，触达节点从 1 变成 3。'),
      makeOption('region', '同地区的货放一起；公共查询被拆成三条路径。', [8, 8, 7], 3, 22, 8, '公共数据不用按地区分流：触达节点从 1 变成 3，搬运反而更多。'),
    ],
  },
  {
    id: 6,
    title: '海量业务日志进入',
    dataName: '业务日志',
    size: 5,
    distribution: '一直在涨，量大',
    access: '按时间段翻',
    publicData: false,
    defaultStrategy: 'time',
    options: [
      makeOption('time', '每段时间放一个仓；按时间段翻只打一个仓，每条只存一份。', [12, 10, 11], 1, 10, 9, '对上了：大表按时间分流、只存一份，写入和货位都摊开。'),
      makeOption('id', '一批货拆到三个仓；按人查还行，按时间段翻要问三个仓。', [10, 11, 10], 3, 23, 9, '查询条件和分流键不一致：时间检索的触达节点从 1 变成 3。'),
      makeOption('replicated', '三个仓各放一份；空间和写入都变成三倍。', [28, 28, 28], 1, 31, 40, '大日志禁止三份全抄：空间、写入、同步都变成三倍。'),
    ],
  },
  {
    id: 7,
    title: '热门榜单刷新',
    dataName: '热门榜单缓存',
    size: 1,
    distribution: '很小，访问忽高忽低',
    access: '谁都来读（随机）',
    publicData: true,
    defaultStrategy: 'replicated',
    options: [
      makeOption('replicated', '三个仓各放一份；谁来都能就地读。', [7, 6, 7], 1, 9, 16, '对上了：小而公共就每仓一份，访问尖峰被摊开。'),
      makeOption('centralized', '只占一份货位；访问尖峰全挤向一个仓。', [21, 3, 3], 3, 28, 5, '热点集中会放大单节点压力：一个仓被挤红，其他仓还要跨仓搬。'),
      makeOption('id', '一批货拆到三个仓；编号不是它的查询条件，三个仓都要问。', [10, 9, 10], 3, 23, 7, '分流键和查询条件不一致：触达节点从 1 变成 3。'),
    ],
  },
  {
    id: 8,
    title: '活动轨迹批量写入',
    dataName: '活动轨迹',
    size: 4,
    distribution: '人多，单个人的记录连在一起',
    access: '按人查最近记录',
    publicData: false,
    defaultStrategy: 'id',
    options: [
      makeOption('id', '一批货拆到三个仓；同一个人的记录都落在一个仓。', [9, 10, 9], 1, 9, 9, '对上了：按人查就按人分流，最近记录只打一个仓。'),
      makeOption('region', '同地区的货放一起；地区热点带来写入压力，按人查要问三个仓。', [20, 8, 7], 3, 24, 8, '地区不是主要查询条件：触达节点从 1 变成 3，还有一个仓先红。'),
      makeOption('replicated', '三个仓各放一份；写入要同步三份。', [21, 21, 21], 1, 30, 34, '大表还在持续写入，全量复制会把写入放大三倍。'),
    ],
  },
  {
    id: 9,
    title: '区域营销数据汇总',
    dataName: '区域营销数据',
    size: 3,
    distribution: '地区明显，几个城市特别挤',
    access: '按地区汇总',
    publicData: false,
    defaultStrategy: 'region',
    options: [
      makeOption('region', '同地区的货放一起；按地区汇总只打一个仓。', [9, 10, 8], 1, 10, 8, '对上了：汇总条件就是分流键，报表只打一个仓。'),
      makeOption('id', '一批货拆到三个仓；按人查还行，按地区汇总要问三个仓。', [10, 10, 10], 3, 22, 8, '查询条件和分流键不一致：汇总的触达节点从 1 变成 3。'),
      makeOption('status', '同状态的货挤在一个仓；状态数量差得很大。', [23, 5, 7], 3, 26, 6, '状态分布不均：一个仓先红，汇总还要三个仓都问。'),
    ],
  },
  {
    id: 10,
    title: '支付事件高峰',
    dataName: '支付事件',
    size: 4,
    distribution: '用户匀，写入高峰猛',
    access: '按人和编号追',
    publicData: false,
    defaultStrategy: 'id',
    options: [
      makeOption('id', '一批货拆到三个仓；同一个人的事件稳定走一个仓。', [12, 11, 12], 1, 11, 10, '对上了：写入高峰摊平，按人追只打一个仓。'),
      makeOption('time', '每段时间放一个仓；写入能切开，按人追要问三个仓。', [13, 12, 12], 3, 24, 9, '只解决了写入：用户追踪的触达节点从 1 变成 3。'),
      makeOption('replicated', '三个仓各放一份；写入高峰要同步三份。', [27, 27, 27], 1, 32, 38, '高峰期全量复制：写入同步变成三倍，货位也多占两份。'),
    ],
  },
  {
    id: 11,
    title: '权限目录访问激增',
    dataName: '权限公共目录',
    size: 1,
    distribution: '很小，读得极凶',
    access: '谁都来读（按编码）',
    publicData: true,
    defaultStrategy: 'replicated',
    options: [
      makeOption('replicated', '三个仓各放一份；谁来都能就地读。', [6, 6, 6], 1, 8, 15, '对上了：小而公共就每仓一份，读取不再穿一个节点。'),
      makeOption('centralized', '只占一份货位；所有请求都穿过一个仓。', [19, 3, 3], 3, 29, 4, '公共目录只放一个仓：一个节点被读红，其他仓还要跨仓搬。'),
      makeOption('id', '一批货拆到三个仓；编号不是它的查询条件，三个仓都要问。', [10, 9, 10], 3, 24, 7, '分流键没对上公共访问：触达节点从 1 变成 3。'),
    ],
  },
  {
    id: 12,
    title: 'FINAL RUSH · 大型业务数据进入',
    dataName: '大型业务数据',
    size: 5,
    distribution: '连续大批量写入，仓里余量不多',
    access: '按人查 + 按时间段翻',
    publicData: false,
    finalRush: true,
    defaultStrategy: 'id',
    options: [
      makeOption('id', '一批货拆到三个仓；写入摊开，按人追只打一个仓。', [15, 14, 15], 1, 13, 11, 'Final Rush 第一击：写入和查询同时压住了。'),
      makeOption('time', '每段时间放一个仓；按时间翻还行，按人追要问三个仓。', [15, 15, 14], 3, 27, 10, '只解决写入：用户追踪的触达节点从 1 变成 3。'),
      makeOption('replicated', '三个仓各放一份；空间和写入都变成三倍。', [32, 32, 32], 1, 35, 43, '高压下全量复制：资源立刻被挤爆。'),
    ],
  },
  {
    id: 13,
    title: 'FINAL RUSH · 高频查询突然增加',
    dataName: '用户画像查询',
    size: 3,
    distribution: '一小撮编号被反复查',
    access: '按编号高频反复查',
    publicData: false,
    finalRush: true,
    defaultStrategy: 'id',
    options: [
      makeOption('id', '一批货拆到三个仓；同一个编号反复查也只打一个仓。', [12, 12, 11], 1, 11, 8, '查询密度上升时，只打一个仓的路径最省。'),
      makeOption('broadcast', '三条查询同时发出；三个仓都要搬一次再合并结果。', [20, 20, 19], 3, 40, 6, '广播查询：触达节点从 1 变成 3，搬运同时抬高。'),
      makeOption('replicated', '三个仓各放一份；压力峰值上还要多同步两份。', [20, 20, 20], 1, 28, 27, '小热点可以复制，但此刻资源已经紧张，复制要多占两份货位。'),
    ],
  },
  {
    id: 14,
    title: 'FINAL RUSH · 公共数据访问激增',
    dataName: '公共活动目录',
    size: 2,
    distribution: '小目录，三个仓同时来读',
    access: '谁都来读（全局高频）',
    publicData: true,
    finalRush: true,
    defaultStrategy: 'replicated',
    options: [
      makeOption('replicated', '三个仓各放一份；谁来都能就地读。', [10, 9, 10], 1, 10, 18, 'Final Rush 收尾：用多存两份换查询路径稳定。'),
      makeOption('centralized', '只占一份货位；公共访问全挤向一个仓。', [25, 3, 3], 3, 36, 5, '公共访问激增时，只放一个仓会立刻成为瓶颈。'),
      makeOption('broadcast', '三条查询同时发出；三个仓都要搬一次。', [18, 18, 18], 3, 43, 8, '没有复制，却每次都要三个仓一起搬：触达节点一直是 3。'),
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
    distribution: '设备编号匀，少数园区集中', access: '按设备编号查', publicData: false, defaultStrategy: 'id', difficulty: 'easy',
    loadOffset: [1, 0, 1], movementOffset: 1,
  }),
  createWaveVariant(2, 102, 'easy-favorite-changes', {
    title: '用户收藏变更', dataName: '收藏变更记录', size: 2,
    distribution: '用户编号匀，写入平稳', access: '按用户编号查', publicData: false, defaultStrategy: 'id', difficulty: 'easy',
    loadOffset: [0, 1, 0], resourceOffset: 1,
  }),
  createWaveVariant(5, 103, 'easy-service-catalog', {
    title: '服务标签目录上线', dataName: '服务标签目录', size: 1,
    distribution: '很小，所有服务都读', access: '谁都来读（按标签编码）', publicData: true, defaultStrategy: 'replicated', difficulty: 'easy',
    loadOffset: [1, 1, 0], movementOffset: -1,
  }),
  createWaveVariant(3, 104, 'easy-campus-signups', {
    title: '校园活动报名', dataName: '校园活动报名', size: 3,
    distribution: '校区就是天然分界', access: '按校区汇总', publicData: false, defaultStrategy: 'region', difficulty: 'easy',
    loadOffset: [0, 1, 1], movementOffset: 1,
  }),
  createWaveVariant(4, 105, 'easy-support-notices', {
    title: '客服通知队列生成', dataName: '客服通知队列', size: 2,
    distribution: '用户编号匀，一个人常来查', access: '按人查', publicData: false, defaultStrategy: 'id', difficulty: 'easy',
    loadOffset: [1, 0, 1], resourceOffset: 1,
  }),
  createWaveVariant(7, 106, 'easy-search-hotwords', {
    title: '热门搜索词刷新', dataName: '热门搜索词缓存', size: 1,
    distribution: '很小，访问忽高忽低', access: '谁都来读（随机）', publicData: true, defaultStrategy: 'replicated', difficulty: 'easy',
    loadOffset: [0, 1, 0], movementOffset: 1,
  }),
  createWaveVariant(6, 201, 'medium-monitoring-series', {
    title: '时间序列监控涌入', dataName: '时间序列监控', size: 5,
    distribution: '一直在涨，写入量大', access: '按时间段翻', publicData: false, defaultStrategy: 'time', difficulty: 'medium',
    loadOffset: [1, 0, 1], resourceOffset: 1,
  }),
  createWaveVariant(10, 202, 'medium-inventory-events', {
    title: '库存变更流高峰', dataName: '库存变更事件', size: 4,
    distribution: '仓号均匀，写入峰值高', access: '按商品与订单追', publicData: false, defaultStrategy: 'id', difficulty: 'medium',
    loadOffset: [0, 1, 1], movementOffset: 1,
  }),
  createWaveVariant(9, 203, 'medium-cross-region-orders', {
    title: '跨区订单汇总', dataName: '跨区订单数据', size: 3,
    distribution: '地区明显，热点城市挤', access: '按地区汇总', publicData: false, defaultStrategy: 'region', difficulty: 'medium',
    loadOffset: [1, 1, 0], resourceOffset: 1,
  }),
  createWaveVariant(8, 204, 'medium-device-traces', {
    title: '设备轨迹批量归档', dataName: '设备轨迹', size: 4,
    distribution: '设备多，单台记录连着', access: '按设备查最近记录', publicData: false, defaultStrategy: 'id', difficulty: 'medium',
    loadOffset: [1, 0, 1], movementOffset: 2,
  }),
  createWaveVariant(6, 205, 'medium-audit-stream', {
    title: '审计事件流进入', dataName: '审计事件', size: 5,
    distribution: '持续增长，按时间窗口读', access: '按时间段翻', publicData: false, defaultStrategy: 'time', difficulty: 'medium',
    loadOffset: [0, 1, 1], resourceOffset: 2,
  }),
  createWaveVariant(10, 206, 'medium-marketing-clicks', {
    title: '营销点击流水上升', dataName: '营销点击流水', size: 4,
    distribution: '用户匀，短时写入密集', access: '按用户与活动追', publicData: false, defaultStrategy: 'id', difficulty: 'medium',
    loadOffset: [1, 1, 0], movementOffset: 2,
  }),
  createWaveVariant(6, 207, 'medium-backup-metrics', {
    title: '备份指标持续写入', dataName: '备份指标', size: 5,
    distribution: '持续增长，按时间窗口读', access: '按时间段翻', publicData: false, defaultStrategy: 'time', difficulty: 'medium',
    loadOffset: [1, 1, 0], resourceOffset: 1,
  }),
  createWaveVariant(9, 208, 'medium-delivery-regions', {
    title: '配送区域状态汇总', dataName: '配送区域状态', size: 3,
    distribution: '地区明显，少数城市挤', access: '按地区汇总', publicData: false, defaultStrategy: 'region', difficulty: 'medium',
    loadOffset: [0, 1, 1], movementOffset: 1,
  }),
  createWaveVariant(10, 209, 'medium-login-audits', {
    title: '登录审计事件激增', dataName: '登录审计事件', size: 4,
    distribution: '用户匀，短时写入密集', access: '按用户与时间追', publicData: false, defaultStrategy: 'id', difficulty: 'medium',
    loadOffset: [1, 0, 1], resourceOffset: 2,
  }),
  createWaveVariant(8, 210, 'medium-mobile-traces', {
    title: '移动端轨迹汇总', dataName: '移动端轨迹', size: 4,
    distribution: '设备多，单台记录连着', access: '按设备查最近记录', publicData: false, defaultStrategy: 'id', difficulty: 'medium',
    loadOffset: [0, 1, 1], movementOffset: 2,
  }),
  createWaveVariant(12, 301, 'hard-settlement-stream', {
    title: 'FINAL RUSH · 结算流水进入', dataName: '结算流水', size: 5,
    distribution: '连续大批量写入，余量不多', access: '按账户追 + 按时间翻', publicData: false, finalRush: true, defaultStrategy: 'id', difficulty: 'hard',
    loadOffset: [1, 0, 1], resourceOffset: 1,
  }),
  createWaveVariant(13, 302, 'hard-hot-account-query', {
    title: 'FINAL RUSH · 热点账户查询', dataName: '热点账户画像', size: 3,
    distribution: '一小撮账户被反复查', access: '按账户编号高频查', publicData: false, finalRush: true, defaultStrategy: 'id', difficulty: 'hard',
    loadOffset: [0, 1, 1], movementOffset: 1,
  }),
  createWaveVariant(14, 303, 'hard-public-config-storm', {
    title: 'FINAL RUSH · 公共配置风暴', dataName: '公共配置目录', size: 2,
    distribution: '小目录，三个仓同时来读', access: '谁都来读（全局高频）', publicData: true, finalRush: true, defaultStrategy: 'replicated', difficulty: 'hard',
    loadOffset: [1, 0, 1], resourceOffset: 1,
  }),
  createWaveVariant(12, 304, 'hard-live-alerts', {
    title: 'FINAL RUSH · 实时告警批量进入', dataName: '实时告警事件', size: 5,
    distribution: '告警连续涌入，写入压力陡增', access: '按设备与时间翻', publicData: false, finalRush: true, defaultStrategy: 'time', difficulty: 'hard',
    loadOffset: [1, 1, 0], movementOffset: 1,
  }),
  createWaveVariant(13, 305, 'hard-risk-profiles', {
    title: 'FINAL RUSH · 风控画像被反复查询', dataName: '风控画像', size: 3,
    distribution: '热点账户集中，查询密度高', access: '按账户编号高频查', publicData: false, finalRush: true, defaultStrategy: 'id', difficulty: 'hard',
    loadOffset: [1, 0, 1], resourceOffset: 1,
  }),
  createWaveVariant(14, 306, 'hard-global-labels', {
    title: 'FINAL RUSH · 全局标签访问激增', dataName: '全局标签目录', size: 2,
    distribution: '很小，三个仓同时来读', access: '谁都来读（高频）', publicData: true, finalRush: true, defaultStrategy: 'replicated', difficulty: 'hard',
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

// 教学三波锁死：活动记录、公共目录、海量日志——正好对上三条铁律。
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
