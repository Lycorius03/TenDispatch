import type { RankedStrategy } from '../game/GameState'

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
  distribution: string
  access: string
  publicData: boolean
  finalRush?: boolean
  defaultStrategy: RankedStrategy
  options: RankedOption[]
}

const makeOption = (
  id: RankedStrategy,
  label: string,
  detail: string,
  loadDelta: LoadDelta,
  queryNodes: number,
  crossNodeMovement: number,
  resourceCost: number,
  note: string,
): RankedOption => ({ id, label, detail, loadDelta, queryNodes, crossNodeMovement, resourceCost, note })

const rankedWaveTemplates: RankedWave[] = [
  {
    id: 1,
    title: '用户活动记录进入',
    dataName: '用户活动记录',
    size: 3,
    distribution: '地区高度集中，编号均匀',
    access: '按用户查询',
    publicData: false,
    defaultStrategy: 'id',
    options: [
      makeOption('id', '按用户编号分片', '按编号轮流写入三个 DN，查询能锁定目标节点。', [7, 8, 7], 1, 8, 7, '编号分片让写入和查询都保持稳定。'),
      makeOption('region', '按地区分片', '相同地区的数据放在一起，热点地区会堆向一个 DN。', [22, 5, 7], 3, 22, 6, '地区集中会带来局部热点和跨节点查询。'),
      makeOption('status', '按状态分片', '状态比例不均，数据会明显倾斜。', [31, 3, 2], 3, 29, 5, '状态字段分布不均，最容易制造数据倾斜。'),
    ],
  },
  {
    id: 2,
    title: '订单明细持续写入',
    dataName: '订单明细',
    size: 2,
    distribution: '各地区较均匀',
    access: '按订单编号查询',
    publicData: false,
    defaultStrategy: 'id',
    options: [
      makeOption('id', '按订单编号分片', '编号范围清晰，写入与单笔查询都能直达。', [6, 7, 6], 1, 7, 6, '目标节点明确，平均触达节点数接近 1.0。'),
      makeOption('region', '按地区分片', '地区分布均衡，但订单查询仍要问多个 DN。', [9, 8, 7], 3, 19, 5, '写入还算平均，查询路径却变长。'),
      makeOption('replicated', '复制到三个 DN', '每个 DN 都有订单全量副本。', [15, 15, 15], 1, 26, 28, '查询很快，但大型业务数据的复制成本过高。'),
    ],
  },
  {
    id: 3,
    title: '区域活动报名涌入',
    dataName: '区域活动报名',
    size: 3,
    distribution: '地区是最明显的自然分布',
    access: '按地区汇总',
    publicData: false,
    defaultStrategy: 'region',
    options: [
      makeOption('region', '按地区分片', '同一地区的报名就近汇总，报表查询路径短。', [7, 8, 7], 1, 8, 7, '查询条件与分布键一致，地区报表可以直达。'),
      makeOption('id', '按用户编号分片', '写入平均，但地区报表需要广播。', [8, 8, 8], 3, 21, 7, '编号适合找人，不适合按地区做聚合。'),
      makeOption('status', '按报名状态分片', '热门状态会集中到一个 DN。', [24, 5, 6], 3, 25, 6, '状态比例失衡，负载和查询都不理想。'),
    ],
  },
  {
    id: 4,
    title: '个人通知任务生成',
    dataName: '用户通知任务',
    size: 2,
    distribution: '用户编号均匀，单用户访问频繁',
    access: '按用户查询',
    publicData: false,
    defaultStrategy: 'id',
    options: [
      makeOption('id', '按用户编号分片', '相同用户的任务保持可定位。', [8, 7, 8], 1, 8, 6, '访问路径清晰，写入压力也比较均匀。'),
      makeOption('region', '按地区分片', '地区热点会让一部分 DN 先变忙。', [19, 8, 6], 3, 20, 6, '地区不是这类个人查询的主要条件。'),
      makeOption('replicated', '复制高频通知', '所有 DN 都保存通知任务。', [13, 13, 13], 1, 24, 22, '小数据能复制，但写入同步会增加成本。'),
    ],
  },
  {
    id: 5,
    title: '公共院系目录上线',
    dataName: '院系公共目录',
    size: 1,
    distribution: '规模小，所有业务都会访问',
    access: '按名称与编码查询',
    publicData: true,
    defaultStrategy: 'replicated',
    options: [
      makeOption('replicated', '复制到三个 DN', '每个节点就近读取一份小型公共数据。', [5, 5, 5], 1, 7, 14, '小型高频公共数据适合复制，查询不必跨节点。'),
      makeOption('centralized', '只保存一份', '只占一个位置，其他 DN 访问要跨节点取用。', [16, 2, 2], 3, 25, 4, '节省存储，但会增加跨节点搬运。'),
      makeOption('region', '按地区分片', '目录很小，却把公共查询拆成多条路径。', [8, 8, 7], 3, 22, 8, '公共数据不需要为了分片牺牲访问效率。'),
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
    defaultStrategy: 'time',
    options: [
      makeOption('time', '按时间范围分片', '每个 DN 负责一段时间，日志只保存一份。', [12, 10, 11], 1, 10, 9, '大数据优先分摊写入和存储，避免全量复制。'),
      makeOption('id', '按用户编号分片', '用户查询方便，但时间范围检索需要多节点协作。', [10, 11, 10], 3, 23, 9, '分布键和主要检索条件不一致。'),
      makeOption('replicated', '三个 DN 各存全量', '每个节点都保存完整日志。', [28, 28, 28], 1, 31, 40, '大型业务数据不应随意复制，资源成本会迅速升高。'),
    ],
  },
  {
    id: 7,
    title: '热门榜单刷新',
    dataName: '热门榜单缓存',
    size: 1,
    distribution: '小型公共数据，访问突发',
    access: '所有业务随机读取',
    publicData: true,
    defaultStrategy: 'replicated',
    options: [
      makeOption('replicated', '复制热点榜单', '让三个 DN 都能本地读取最新榜单。', [7, 6, 7], 1, 9, 16, '复制小数据缓解公共访问尖峰。'),
      makeOption('centralized', '集中保存榜单', '更新简单，但所有访问都挤向一个入口。', [21, 3, 3], 3, 28, 5, '热点集中会放大单节点压力。'),
      makeOption('id', '按用户编号分片', '用户编号并不是榜单的访问条件。', [10, 9, 10], 3, 23, 7, '不匹配访问方式，查询需要广播。'),
    ],
  },
  {
    id: 8,
    title: '活动轨迹批量写入',
    dataName: '活动轨迹',
    size: 4,
    distribution: '用户多，单用户轨迹连续',
    access: '按用户查询最近记录',
    publicData: false,
    defaultStrategy: 'id',
    options: [
      makeOption('id', '按用户编号分片', '同一用户的轨迹保持在可定位的节点。', [9, 10, 9], 1, 9, 9, '承接连续查询时，目标节点最明确。'),
      makeOption('region', '按地区分片', '地区热点带来局部写入压力。', [20, 8, 7], 3, 24, 8, '地区并非最近记录查询的主要条件。'),
      makeOption('replicated', '复制全部轨迹', '读路径简单，但写入需要同步三份。', [21, 21, 21], 1, 30, 34, '大型持续写入不适合全量复制。'),
    ],
  },
  {
    id: 9,
    title: '区域营销数据汇总',
    dataName: '区域营销数据',
    size: 3,
    distribution: '区域访问明显，热点城市集中',
    access: '按地区汇总',
    publicData: false,
    defaultStrategy: 'region',
    options: [
      makeOption('region', '按地区分片', '把主要聚合条件直接放进分布规则。', [9, 10, 8], 1, 10, 8, '地区报表可以少访问节点，热点仍在可控范围。'),
      makeOption('id', '按用户编号分片', '单用户定位不错，但区域汇总要访问三个 DN。', [10, 10, 10], 3, 22, 8, '适合用户查询，不适合区域聚合。'),
      makeOption('status', '按营销状态分片', '同一状态数量差异大，容易形成热点。', [23, 5, 7], 3, 26, 6, '状态分布不均，查询也需要广播。'),
    ],
  },
  {
    id: 10,
    title: '支付事件高峰',
    dataName: '支付事件',
    size: 4,
    distribution: '用户分布均匀，写入峰值高',
    access: '按用户与订单追踪',
    publicData: false,
    defaultStrategy: 'id',
    options: [
      makeOption('id', '按用户编号分片', '把同一用户的事件稳定导向一个节点。', [12, 11, 12], 1, 11, 10, '高峰写入均衡，同时保留目标查询路径。'),
      makeOption('time', '按时间范围分片', '写入能按时间切开，但用户追踪需要多节点。', [13, 12, 12], 3, 24, 9, '写入不错，查询条件却没有对齐。'),
      makeOption('replicated', '复制支付事件', '所有节点保留完整事件流。', [27, 27, 27], 1, 32, 38, '支付事件持续写入，复制同步代价过大。'),
    ],
  },
  {
    id: 11,
    title: '权限目录访问激增',
    dataName: '权限公共目录',
    size: 1,
    distribution: '数据小，读取频率极高',
    access: '所有请求按编码读取',
    publicData: true,
    defaultStrategy: 'replicated',
    options: [
      makeOption('replicated', '复制权限目录', '把小型高频目录放到每个 DN。', [6, 6, 6], 1, 8, 15, '三处本地读取，减少跨节点等待。'),
      makeOption('centralized', '只保留一份', '更新简单，但访问全部穿过一个节点。', [19, 3, 3], 3, 29, 4, '存储省了，查询和热点成本上升。'),
      makeOption('id', '按用户编号分片', '目录访问并不以用户编号为主要条件。', [10, 9, 10], 3, 24, 7, '分布规则没有匹配公共访问。'),
    ],
  },
  {
    id: 12,
    title: 'FINAL RUSH · 大型业务数据进入',
    dataName: '大型业务数据',
    size: 5,
    distribution: '连续大批量写入，节点余量有限',
    access: '按用户追踪与时间检索',
    publicData: false,
    finalRush: true,
    defaultStrategy: 'id',
    options: [
      makeOption('id', '按用户编号分片', '把持续写入摊开，同时保留主要查询路径。', [15, 14, 15], 1, 13, 11, 'Final Rush 第一击：让写入和查询同时可控。'),
      makeOption('time', '按时间范围分片', '日志连续写入较自然，但用户追踪要跨节点。', [15, 15, 14], 3, 27, 10, '只解决写入，不解决用户查询。'),
      makeOption('replicated', '全量复制', '三台 DN 同时接收完整大型数据。', [32, 32, 32], 1, 35, 43, '在高压状态下复制大型数据会立即挤爆资源。'),
    ],
  },
  {
    id: 13,
    title: 'FINAL RUSH · 高频查询突然增加',
    dataName: '用户画像查询',
    size: 3,
    distribution: '同一批热点用户被反复查询',
    access: '按用户编号高频查询',
    publicData: false,
    finalRush: true,
    defaultStrategy: 'id',
    options: [
      makeOption('id', '按编号直达目标 DN', '根据用户编号只触达一个节点。', [12, 12, 11], 1, 11, 8, '查询密度上升时，单节点路径最重要。'),
      makeOption('broadcast', '三个 DN 全部查询', '把请求广播给全体节点再合并结果。', [20, 20, 19], 3, 40, 6, '查询节点数和跨节点搬运同时上升。'),
      makeOption('replicated', '复制热点画像', '查询快，但在压力峰值时要同步副本。', [20, 20, 20], 1, 28, 27, '小热点可复制，但当前资源已经很紧张。'),
    ],
  },
  {
    id: 14,
    title: 'FINAL RUSH · 公共数据访问激增',
    dataName: '公共活动目录',
    size: 2,
    distribution: '公共数据请求同时涌入三个 DN',
    access: '全局高频读取',
    publicData: true,
    finalRush: true,
    defaultStrategy: 'replicated',
    options: [
      makeOption('replicated', '就近复制公共数据', '小型公共数据在每个 DN 保留一份。', [10, 9, 10], 1, 10, 18, 'Final Rush 收尾：用小副本换查询路径稳定。'),
      makeOption('centralized', '集中保存一份', '所有 DN 都要回到同一个节点读取。', [25, 3, 3], 3, 36, 5, '公共访问激增时，集中副本会制造瓶颈。'),
      makeOption('broadcast', '每次请求广播', '三个 DN 都参与读取后再合并。', [18, 18, 18], 3, 43, 8, '没有复制状态，却付出持续的跨节点搬运。'),
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
    distribution: '设备编号均匀，少数园区访问集中', access: '按设备编号查询', publicData: false, defaultStrategy: 'id', difficulty: 'easy',
    loadOffset: [1, 0, 1], movementOffset: 1,
  }),
  createWaveVariant(2, 102, 'easy-favorite-changes', {
    title: '用户收藏变更', dataName: '收藏变更记录', size: 2,
    distribution: '用户编号均匀，写入频率平稳', access: '按用户编号查询', publicData: false, defaultStrategy: 'id', difficulty: 'easy',
    loadOffset: [0, 1, 0], resourceOffset: 1,
  }),
  createWaveVariant(5, 103, 'easy-service-catalog', {
    title: '服务标签目录上线', dataName: '服务标签目录', size: 1,
    distribution: '规模小，所有服务都会读取', access: '按标签编码查询', publicData: true, defaultStrategy: 'replicated', difficulty: 'easy',
    loadOffset: [1, 1, 0], movementOffset: -1,
  }),
  createWaveVariant(3, 104, 'easy-campus-signups', {
    title: '校园活动报名', dataName: '校园活动报名', size: 3,
    distribution: '校区是最明显的自然分布', access: '按校区汇总', publicData: false, defaultStrategy: 'region', difficulty: 'easy',
    loadOffset: [0, 1, 1], movementOffset: 1,
  }),
  createWaveVariant(4, 105, 'easy-support-notices', {
    title: '客服通知队列生成', dataName: '客服通知队列', size: 2,
    distribution: '用户编号均匀，单用户访问频繁', access: '按用户查询', publicData: false, defaultStrategy: 'id', difficulty: 'easy',
    loadOffset: [1, 0, 1], resourceOffset: 1,
  }),
  createWaveVariant(7, 106, 'easy-search-hotwords', {
    title: '热门搜索词刷新', dataName: '热门搜索词缓存', size: 1,
    distribution: '小型公共数据，访问突发', access: '所有业务随机读取', publicData: true, defaultStrategy: 'replicated', difficulty: 'easy',
    loadOffset: [0, 1, 0], movementOffset: 1,
  }),
  createWaveVariant(6, 201, 'medium-monitoring-series', {
    title: '时间序列监控涌入', dataName: '时间序列监控', size: 5,
    distribution: '持续增长，写入量大', access: '按时间段检索', publicData: false, defaultStrategy: 'time', difficulty: 'medium',
    loadOffset: [1, 0, 1], resourceOffset: 1,
  }),
  createWaveVariant(10, 202, 'medium-inventory-events', {
    title: '库存变更流高峰', dataName: '库存变更事件', size: 4,
    distribution: '仓库分布均匀，写入峰值高', access: '按商品与订单追踪', publicData: false, defaultStrategy: 'id', difficulty: 'medium',
    loadOffset: [0, 1, 1], movementOffset: 1,
  }),
  createWaveVariant(9, 203, 'medium-cross-region-orders', {
    title: '跨区订单汇总', dataName: '跨区订单数据', size: 3,
    distribution: '区域访问明显，热点城市集中', access: '按地区汇总', publicData: false, defaultStrategy: 'region', difficulty: 'medium',
    loadOffset: [1, 1, 0], resourceOffset: 1,
  }),
  createWaveVariant(8, 204, 'medium-device-traces', {
    title: '设备轨迹批量归档', dataName: '设备轨迹', size: 4,
    distribution: '设备多，单设备轨迹连续', access: '按设备查询最近记录', publicData: false, defaultStrategy: 'id', difficulty: 'medium',
    loadOffset: [1, 0, 1], movementOffset: 2,
  }),
  createWaveVariant(6, 205, 'medium-audit-stream', {
    title: '审计事件流进入', dataName: '审计事件', size: 5,
    distribution: '持续增长，按时间窗口读取', access: '按时间段检索', publicData: false, defaultStrategy: 'time', difficulty: 'medium',
    loadOffset: [0, 1, 1], resourceOffset: 2,
  }),
  createWaveVariant(10, 206, 'medium-marketing-clicks', {
    title: '营销点击流水上升', dataName: '营销点击流水', size: 4,
    distribution: '用户分布均匀，短时写入密集', access: '按用户与活动追踪', publicData: false, defaultStrategy: 'id', difficulty: 'medium',
    loadOffset: [1, 1, 0], movementOffset: 2,
  }),
  createWaveVariant(6, 207, 'medium-backup-metrics', {
    title: '备份指标持续写入', dataName: '备份指标', size: 5,
    distribution: '数据持续增长，按时间窗口读取', access: '按时间段检索', publicData: false, defaultStrategy: 'time', difficulty: 'medium',
    loadOffset: [1, 1, 0], resourceOffset: 1,
  }),
  createWaveVariant(9, 208, 'medium-delivery-regions', {
    title: '配送区域状态汇总', dataName: '配送区域状态', size: 3,
    distribution: '区域访问明显，少数城市形成热点', access: '按地区汇总', publicData: false, defaultStrategy: 'region', difficulty: 'medium',
    loadOffset: [0, 1, 1], movementOffset: 1,
  }),
  createWaveVariant(10, 209, 'medium-login-audits', {
    title: '登录审计事件激增', dataName: '登录审计事件', size: 4,
    distribution: '用户分布均匀，短时写入密集', access: '按用户与时间追踪', publicData: false, defaultStrategy: 'id', difficulty: 'medium',
    loadOffset: [1, 0, 1], resourceOffset: 2,
  }),
  createWaveVariant(8, 210, 'medium-mobile-traces', {
    title: '移动端轨迹汇总', dataName: '移动端轨迹', size: 4,
    distribution: '设备数量多，单设备记录连续', access: '按设备查询最近记录', publicData: false, defaultStrategy: 'id', difficulty: 'medium',
    loadOffset: [0, 1, 1], movementOffset: 2,
  }),
  createWaveVariant(12, 301, 'hard-settlement-stream', {
    title: 'FINAL RUSH · 结算流水进入', dataName: '结算流水', size: 5,
    distribution: '连续大批量写入，节点余量有限', access: '按账户追踪与时间检索', publicData: false, finalRush: true, defaultStrategy: 'id', difficulty: 'hard',
    loadOffset: [1, 0, 1], resourceOffset: 1,
  }),
  createWaveVariant(13, 302, 'hard-hot-account-query', {
    title: 'FINAL RUSH · 热点账户查询', dataName: '热点账户画像', size: 3,
    distribution: '同一批热点账户被反复查询', access: '按账户编号高频查询', publicData: false, finalRush: true, defaultStrategy: 'id', difficulty: 'hard',
    loadOffset: [0, 1, 1], movementOffset: 1,
  }),
  createWaveVariant(14, 303, 'hard-public-config-storm', {
    title: 'FINAL RUSH · 公共配置风暴', dataName: '公共配置目录', size: 2,
    distribution: '公共数据请求同时涌入三个 DN', access: '全局高频读取', publicData: true, finalRush: true, defaultStrategy: 'replicated', difficulty: 'hard',
    loadOffset: [1, 0, 1], resourceOffset: 1,
  }),
  createWaveVariant(12, 304, 'hard-live-alerts', {
    title: 'FINAL RUSH · 实时告警批量进入', dataName: '实时告警事件', size: 5,
    distribution: '告警连续涌入，写入压力陡增', access: '按设备与时间检索', publicData: false, finalRush: true, defaultStrategy: 'time', difficulty: 'hard',
    loadOffset: [1, 1, 0], movementOffset: 1,
  }),
  createWaveVariant(13, 305, 'hard-risk-profiles', {
    title: 'FINAL RUSH · 风控画像被反复查询', dataName: '风控画像', size: 3,
    distribution: '热点账户集中，查询密度极高', access: '按账户编号高频查询', publicData: false, finalRush: true, defaultStrategy: 'id', difficulty: 'hard',
    loadOffset: [1, 0, 1], resourceOffset: 1,
  }),
  createWaveVariant(14, 306, 'hard-global-labels', {
    title: 'FINAL RUSH · 全局标签访问激增', dataName: '全局标签目录', size: 2,
    distribution: '小型公共数据，三个 DN 同时请求', access: '按标签编码高频读取', publicData: true, finalRush: true, defaultStrategy: 'replicated', difficulty: 'hard',
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
export const rankedDecisionWindowMs = 15000
export const rankedWaveArrivalSeconds = [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 68, 77, 86] as const

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
