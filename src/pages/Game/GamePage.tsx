import { useEffect, useState, type CSSProperties } from 'react'
import { getRankedWave, rankedDecisionWindowMs, rankedWaveArrivalSeconds } from '../../config/rankedWaves'
import type { DispatchStrategy, FinalChoices, GameState, RankedStrategy, ReplicationStrategy } from '../../game/GameState'
import { LogisticsCenter } from '../../components/LogisticsCenter/LogisticsCenter'
import { NPCChannel } from '../../components/NPCChannel/NPCChannel'
import { difficulties, scoreMultiplier } from '../../config/difficulty'
interface GamePageProps {
  state: GameState
  onTutorial: () => void
  onSharding: (strategy: DispatchStrategy) => void
  onShardingContinue: () => void
  onQuery: () => void
  onQueryContinue: () => void
  onSmallReplication: (strategy: ReplicationStrategy) => void
  onSmallContinue: () => void
  onLargeReplication: (strategy: ReplicationStrategy) => void
  onLargeContinue: () => void
  onGtm: () => void
  onFinalChoice: (key: keyof FinalChoices, value: DispatchStrategy | 'targeted' | 'broadcast' | ReplicationStrategy) => void
  onFinal: () => void
  onReport: () => void
  onHint: () => void
  onTutorialStep?: () => void
  onTutorialRestart?: () => void
  onRankedSubmit?: (strategy: RankedStrategy, decisionMs?: number) => void
  onRankedTimeout?: () => void
  onRankedNext?: () => void
  onRankedPrediction?: () => void
  onRankedUndo?: () => void
  onRankedFinish?: () => void
}
type StrategyOption = { id: string; label: string; detail: string }
const lessons: Record<string, [string, string, string]> = {
  tutorial: ['首席调度官，先熟悉一下工作台', '别急，这一关只是熟悉操作。中间的分拣台会接收数据，下面三个仓库会保存数据。请点击“接管工作台”，我们一起开始。', '我是科成-开放原子开源社团联络员。第一次接手不用紧张，这一步只是认识场景，不计分；点下按钮后，我会陪你做第一道选择。'],
  sharding: ['第一关 · 帮一万条报名找个合适的家', '首席调度官，我们要把一万条报名放进三个仓库。报名编号很分散，地区人数不一样，大多数人的状态却相同。三种放法各有侧重点，请先看清它们分别按什么字段来分。', '按编号：记录按编号分到三个仓库；按地区：相同地区的记录放在一起；按状态：相同报名状态的记录放在一起。选完后看负载数字，再决定这次分法是否合适。'],
  query: ['第二关 · 找到编号 #2817 的报名', '首席调度官，现在要找一名同学的报名记录。如果刚才按编号分开存，分拣台可以直接找到一个仓库；如果没有，就得逐个询问多个仓库。请点击“开始查找”，看橙色路线和访问数量。', '我是科成-开放原子开源社团联络员。你不用猜答案，只要看结果：访问一个仓库代表路径直接，访问三个代表大家一起帮忙找。'],
  'replication-small': ['第三关 · 让每个仓库都能快速查院系名单', '这份名单只有 300 条，却会被三个仓库反复使用。你可以只保留一份，也可以让每个仓库各保留一份。一个方案少占空间，另一个方案让每个仓库都能直接取到。', '首席调度官，这次只比较两件事：名单要保存几份，以及其它仓库使用时是否需要取用。看清这两个区别后再选。'],
  'replication-large': ['第四关 · 安置两百万条业务日志', '日志很多，而且还会继续增长。你可以让三个仓库共同保存这批日志，也可以让每个仓库都保留完整一份。一个方案每条只保存一次，另一个方案每个仓库都有全量数据。', '首席调度官，这次请比较保存份数和更新方式：每多一份完整日志，后续写入时就要多同步一份。'],
  gtm: ['第五关 · 让多个仓库一起完成一笔报名', '这笔报名会同时改动多个仓库。请点击“启动协同提交”，让它们一起成功，或者一起撤回，不留下半完成的结果。', '首席调度官，这一步只是让你感受“大家一起确认”的过程，不计分。完成后我再告诉你，这位协调者在 OpenTenBase 里叫 GTM。'],
  final: ['最终任务 · 和我一起扛住开放日高峰', '首席调度官，最后连续做三个选择：报名怎么放、查人时问谁、院系名单怎么存。每个按钮旁都写着会发生什么，选完我们马上看结果。', '我的建议是：让工作量分开、找人少问仓库、小名单就近放一份。你也可以选别的方案，系统会把代价清楚地展示出来。'],
}
export function GamePage(props: GamePageProps) {
  const [scale, setScale] = useState(() => Math.min(innerWidth/1920, innerHeight/1080))
  const [displayLoads, setDisplayLoads] = useState(props.state.dnLoads)
  useEffect(() => {
    const from = [...displayLoads]
    const start = Date.now()
    const timer = setInterval(() => {
      const progress = Math.min(1, Math.max(0, (Date.now() - start - 500) / 1100))
      setDisplayLoads(props.state.dnLoads.map((load, i) => Math.round(from[i] + (load-from[i])*progress)) as GameState['dnLoads'])
      if (progress === 1) clearInterval(timer)
    }, 80)
    return () => clearInterval(timer)
    // A new simulation target starts one interpolation from the last visible load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.state.dnLoads])
  useEffect(() => { const resize = () => setScale(Math.min(innerWidth/1920, innerHeight/1080)); addEventListener('resize', resize); return () => removeEventListener('resize', resize) }, [])
  return <div className="desktop-stage" style={{'--stage-scale': scale} as CSSProperties}>{props.state.mode === 'legacy' ? <Console key={`${props.state.phase}-${props.state.finalSharding}-${props.state.finalReplication}`} {...props} displayLoads={displayLoads}/> : <ModernConsole key={`${props.state.mode}-${props.state.phase}-${props.state.waveIndex}-${props.state.lastDecisionStrategy}`} {...props} displayLoads={displayLoads}/>}</div>
}

const tutorialSteps = [
  { kicker: '01 / CN', title: '数据先进入中央调度中心', body: 'CN 是 Central Node。每一批数据先抵达这里，再由它决定如何分发到三个 DN。', note: '看到中央的 CN 亮起，就代表调度入口已经接管。' },
  { kicker: '02 / DN', title: '三个 DN 负责保存与处理', body: 'DN 是 Data Node。它们像三个数据仓库，真正保存和处理进入系统的数据。', note: '观察下方三个节点：负载数字会告诉你谁正在变忙。' },
  { kicker: '03 / SHARD', title: 'Shard：把数据合理分散', body: '分片不是越碎越好，而是要让写入和查询都能找到合适的节点，避免单点过载。', note: '同一策略在不同状态下可能产生不同结果，Ranked 会保留这种状态。' },
  { kicker: '04 / REPLICATION', title: '小数据可复制，大数据要谨慎', body: '小型高频公共数据复制后能就近读取；大型业务数据复制三份，会快速抬高存储和同步成本。', note: '教学没有分数和失败惩罚，完成后再去 Ranked 冲榜。' },
]

function ModernConsole(p: GamePageProps & { displayLoads: GameState['dnLoads'] }) {
  const s = p.state
  const [selected, setSelected] = useState<RankedStrategy | ''>('')
  const [showPrediction, setShowPrediction] = useState(false)
  const [now, setNow] = useState(Date.now)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (s.mode === 'ranked' && s.phase === 'ranked' && now - s.waveStartedAt > rankedDecisionWindowMs) p.onRankedTimeout?.()
  }, [now, s.mode, s.phase, s.waveStartedAt, p.onRankedTimeout])
  const tutorial = tutorialSteps[Math.min(tutorialSteps.length - 1, s.tutorialStep)]
  const ranked = s.mode === 'ranked'
  const result = ranked && s.phase === 'ranked-result'
  const nextWaveAt = ranked && result && s.waveIndex < 13 ? s.gameStartedAt + rankedWaveArrivalSeconds[s.waveIndex + 1] * 1000 : 0
  const nextWaveReady = nextWaveAt === 0 || now >= nextWaveAt
  const nextWaveWait = Math.max(0, Math.ceil((nextWaveAt - now) / 1000))
  useEffect(() => {
    if (ranked && result && s.waveIndex < 13 && nextWaveAt > 0 && now >= nextWaveAt) p.onRankedNext?.()
  }, [now, nextWaveAt, ranked, result, s.waveIndex, p.onRankedNext])
  const wave = ranked ? getRankedWave(s.waveIndex) : undefined
  const latest = s.waveResults[s.waveResults.length - 1]
  const seconds = Math.min(90, Math.floor((now - s.gameStartedAt) / 1000))
  const remaining = Math.max(0, 90 - seconds)
  const decisionRemaining = ranked && s.phase === 'ranked' ? Math.max(0, rankedDecisionWindowMs / 1000 - (now - s.waveStartedAt) / 1000) : 0
  const effectiveMode = paused ? 'idle' : ranked && wave?.finalRush && (result || selected) ? 'sync' : result ? s.cargoMode : ranked && selected ? (selected === 'replicated' ? 'replicate' : wave?.options.find((item) => item.id === selected)?.queryNodes === 1 ? 'write' : 'query') : 'idle'
  const projected = wave?.options.map((option) => ({
    ...option,
    loads: s.dnLoads.map((load, index) => Math.min(100, Math.round(load * .82 + option.loadDelta[index] + (wave.finalRush ? 5 : 0) + (s.replicationState.largeCopies > 1 ? 2 : 0) + Math.round(s.queryPressure * .04)))) as [number, number, number],
  })) ?? []
  const statusLabel = s.systemStatus === 'OVERLOAD' ? '过载' : s.systemStatus === 'HIGH LOAD' ? '较高' : '稳定'
  const tutorialComplete = s.tutorialStep >= tutorialSteps.length
  return <main className="dispatch-console modern-console">
    <header className="dispatch-header">
      <div><h1>OpenTenBase <span>数据调度中心</span></h1><small>TenDispatch / {ranked ? 'RANKED 极速调度' : '新手教学'}</small></div>
      {ranked ? <div className="ranked-header-readout"><b>WAVE {String(s.waveIndex + 1).padStart(2, '0')} / 14</b><i style={{ '--progress': (s.waveIndex + (result ? 1 : 0)) / 14 } as CSSProperties} /><span>DAILY SEED {s.dailySeed}</span></div> : <div className="tutorial-header-readout"><b>教学 {Math.min(4, s.tutorialStep + 1)} / 4</b><span>不计分 · 可无限重试</span></div>}
      <div className="session-details"><b>{s.nickname}</b>{ranked ? <span>剩余 {remaining}s · 总分 {s.totalScore} · Combo ×{s.combo ? (s.waveResults.at(-1)?.multiplier ?? 1).toFixed(2) : '1.00'}</span> : <span>认识 CN / DN / Shard / Replication</span>}</div>
    </header>
    <section className="modern-status-bar" aria-label="实时调度指标">
      <Metric label="DN 负载" value={s.dnLoads.map((load, index) => `DN-${index + 1} ${load}%`).join(' · ')} tone={Math.max(...s.dnLoads) >= 95 ? 'danger' : Math.max(...s.dnLoads) >= 80 ? 'warning' : 'normal'} />
      <Metric label="平均查询触达" value={ranked && s.averageQueryNodes ? `${s.averageQueryNodes.toFixed(2)} 节点 · 压力 ${s.queryPressure}%` : '观察中'} />
      <Metric label="跨节点搬运" value={ranked ? `${s.crossNodeMovement}%` : '教学演示'} tone={s.crossNodeMovement >= 70 ? 'warning' : 'normal'} />
      <Metric label="资源占用" value={ranked ? `${s.resourceUsage}%` : '复制成本示例'} tone={s.resourceUsage >= 80 ? 'danger' : 'normal'} />
    </section>
    <LogisticsCenter replicaDataset={s.replicationState.lastDataset === 'business' ? 'logs' : 'public'} state={{ ...s, dnLoads: p.displayLoads, cargoMode: effectiveMode, queryNodes: latest?.queryNodes ?? s.queryNodes, systemStatus: s.systemStatus }} />
    <div className="scene-legend"><span>■ 写入</span><span>● 查询</span><span>■ 复制</span><small>{ranked ? `状态继承中 · ${statusLabel}` : '教学模拟 · 不计分'}</small><button onClick={() => setPaused(!paused)}>{paused ? '继续场景动效' : '暂停场景动效'}</button></div>
    {s.mode === 'tutorial' ? <section className="modern-controls tutorial-controls">
      <div className="modern-mission-copy"><span>{tutorial.kicker}</span><h2>{tutorial.title}</h2><p>{tutorial.body}</p><small>{tutorial.note}</small></div>
      <div className="tutorial-action-card"><div className="tutorial-progress">{tutorialSteps.map((step, index) => <i key={step.kicker} className={index <= s.tutorialStep ? 'is-done' : ''} />)}</div><p>教学不会计入排行榜，也没有失败惩罚。</p><button className="confirm-dispatch" onClick={() => { if (tutorialComplete) p.onTutorialRestart?.(); else p.onTutorialStep?.() }}>{tutorialComplete ? '重新开始教学' : s.tutorialStep === 3 ? '完成教学' : '继续认识系统'}</button><p className="operation-note">完成后返回首页，可直接进入 Ranked。</p></div>
    </section> : <section className="modern-controls ranked-controls">
      <div className="modern-mission-copy"><span>{wave?.finalRush ? `FINAL RUSH · WAVE ${wave.id}` : `WAVE ${String(wave?.id ?? 0).padStart(2, '0')} · ${wave?.publicData ? 'PUBLIC DATA' : 'DATA FLOW'}`}</span><h2>{result ? `Wave ${latest?.wave} · ${latest?.grade}` : wave?.title}</h2>{result ? <p>{latest?.note}</p> : <p><b>{wave?.dataName}</b> · 规模 {Array.from({ length: 5 }, (_, index) => index < (wave?.size ?? 1) ? '★' : '☆').join('')}<br />分布：{wave?.distribution}<br />高频访问：{wave?.access}{wave?.publicData ? ' · 公共数据' : ''}</p>}</div>
      <div className="ranked-decision-desk">
        {!result && <div className="decision-clock"><span>本波决策窗口</span><strong>{decisionRemaining.toFixed(1)}s</strong><i><b style={{ transform: `scaleX(${Math.min(1, decisionRemaining / 4)})` }} /></i></div>}
        {result ? <div className="wave-result-card"><div><strong>{latest?.score.total}/100</strong><span>{latest?.grade} · Combo {latest?.combo > 0 ? `×${latest?.multiplier.toFixed(2)}` : '已清零'}</span></div><div className="result-mini-grid"><span>负载 {latest?.score.loadBalance}/40</span><span>查询 {latest?.score.queryEfficiency}/30</span><span>资源 {latest?.score.resourceCost}/20</span><span>速度 {latest?.score.decisionSpeed}/10</span></div></div> : <div className="ranked-options">{wave?.options.map((option) => <button key={option.id} aria-pressed={selected === option.id} className={selected === option.id ? 'selected' : ''} onClick={() => setSelected(option.id)}><strong>{option.label}</strong><small>{option.detail}</small><em>查询 {option.queryNodes} DN · 搬运 {option.crossNodeMovement}% · 成本 {option.resourceCost}</em></button>)}</div>}
        {!result && showPrediction && <div className="prediction-panel"><header><b>预测视图 · 本波最高评级为 GOOD</b><span>剩余 {s.predictionUsesRemaining} 次</span></header>{projected.map((item) => <div key={item.id}><strong>{item.label}</strong><span>负载 {item.loads.join(' / ')}%</span><span>查询 {item.queryNodes} DN</span><span>搬运 {item.crossNodeMovement}%</span><span>成本 {item.resourceCost}</span></div>)}</div>}
        <div className="modern-action-row">{result && s.waveIndex < 13 && <button className="secondary-action" disabled={!nextWaveReady} onClick={() => p.onRankedNext?.()}>{nextWaveReady ? '下一波 →' : `下一波将在 ${nextWaveWait}s 到达`}</button>}{result && s.undoUsesRemaining > 0 && <button className="strategy-retry" onClick={() => p.onRankedUndo?.()}>撤回最近决策 · -50</button>}{!result && s.predictionUsesRemaining > 0 && !showPrediction && <button className="secondary-action" onClick={() => { p.onRankedPrediction?.(); setShowPrediction(true) }}>预测 ×{s.predictionUsesRemaining}</button>}{!result && <button className="confirm-dispatch" disabled={!selected} onClick={() => p.onRankedSubmit?.(selected as RankedStrategy, Date.now() - s.waveStartedAt)}>{selected ? '确认调度' : '选择一个策略'}</button>}{result && s.waveIndex === 13 && <button className="confirm-dispatch" onClick={() => p.onRankedFinish?.()}>查看本局成绩 →</button>}</div>
        <p className="operation-note">{result ? '读完本波评分后再继续。状态、复制和资源不会在下一波重置。' : '目标不是找到唯一答案：同时看负载、查询触达和跨节点成本。'}</p>
      </div>
    </section>}
    <div className="modern-footer-note">{ranked ? `预测 ${s.predictionUsesRemaining}/2 · 撤回 ${s.undoUsesRemaining}/1 · PERFECT ${s.perfectCount} · 最大 Combo ${s.maxCombo}` : 'CN → DN → Shard → Replication · 教学模式不计分'}</div>
  </main>
}

function Metric({ label, value, tone = 'normal' }: { label: string; value: string; tone?: 'normal' | 'warning' | 'danger' }) {
  return <div className={`modern-metric tone-${tone}`}><span>{label}</span><strong>{value}</strong></div>
}

function Console(p: GamePageProps & { displayLoads: GameState['dnLoads'] }) {
  const s = p.state
  const multiplier = scoreMultiplier(s.options.difficulty)
  const [selected, setSelected] = useState('')
  const [now, setNow] = useState(Date.now)
  const [entered] = useState(Date.now)
  const [finalStep, setFinalStep] = useState(0)
  const result = s.phase.endsWith('-result')
  const group = s.phase.replace('-result', '')
  const lesson = lessons[group] || lessons.final
  const [npcOpen, setNpcOpen] = useState(s.options.guide)
  const [hint, setHint] = useState(false)
  const [paused, setPaused] = useState(false)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(timer) }, [])
  const seconds = Math.floor((now - s.gameStartedAt)/1000)
  const observation = result ? Math.max(0, Math.ceil((entered + 3000 - now)/1000)) : 0
  const settling = result && now-entered < 1600
  const wave = Math.floor((now-entered)/4000) % 3
  const finalMode = wave === 0 ? 'write' : wave === 1 ? 'query' : s.finalChoices.publicData === 'replicated' ? 'replicate' : 'query'
  const effectiveMode = paused ? 'idle' : s.phase === 'final-result' ? finalMode : result ? s.cargoMode : s.phase === 'final' && now-entered < 1200 ? 'sync' : 'idle'
  const phases = ['tutorial','sharding','query','replication-small','replication-large','gtm','final']
  const stage = phases.indexOf(group)
  let options: StrategyOption[] = []
  let action = () => {}
  let label = '确认调度'
  let title = lesson[0]
  let description = lesson[1]
  if (s.phase === 'tutorial') { label = '接管工作台（练习）'; action = p.onTutorial }
  if (s.phase === 'sharding') { options = [
    { id: 'id', label: '按报名编号分开存', detail: '记录按编号分到三个仓库' },
    { id: 'region', label: '按地区分开存', detail: '相同地区的记录放在一起' },
    { id: 'status', label: '按报名状态分开存', detail: '相同状态的记录放在一起' },
  ]; action = () => p.onSharding(selected as DispatchStrategy) }
  if (s.phase === 'query') { label = '开始查找 #2817'; action = p.onQuery }
  if (s.phase === 'replication-small') { options = [
    { id: 'centralized', label: '只在一个仓库存一份', detail: '省两份空间，其他仓库要来回取' },
    { id: 'replicated', label: '三个仓库各存一份', detail: '每处都有名单，更新时同步三份' },
  ]; action = () => p.onSmallReplication(selected as ReplicationStrategy) }
  if (s.phase === 'replication-large') { options = [
    { id: 'centralized', label: '三个仓库分担日志', detail: '每条日志只保存一份，分在三处' },
    { id: 'replicated', label: '每个仓库存全量日志', detail: '每处都有完整日志，更新时同步三份' },
  ]; action = () => p.onLargeReplication(selected as ReplicationStrategy) }
  if (s.phase === 'gtm') { label = '启动协同提交（演示）'; action = p.onGtm }
  if (s.phase === 'final') {
    const keys: (keyof FinalChoices)[] = ['sharding','query','publicData']
    const sets: StrategyOption[][] = [
      [
        { id: 'id', label: '按报名编号分开存', detail: '记录按编号分到三个仓库' },
        { id: 'region', label: '按地区分开存', detail: '相同地区的记录放在一起' },
        { id: 'status', label: '按报名状态分开存', detail: '相同状态的记录放在一起' },
      ],
      [
        { id: 'targeted', label: '按编号只问目标仓库', detail: '根据编号把请求发给一个仓库' },
        { id: 'broadcast', label: '三个仓库全部询问', detail: '把同一个请求发给三个仓库' },
      ],
      [
        { id: 'replicated', label: '三个仓库各备一份', detail: '每处都有名单，更新时同步三份' },
        { id: 'centralized', label: '只在一个仓库存一份', detail: '只保留一份，其它仓库需要取用' },
      ],
    ]
    options = finalStep < 3 ? sets[finalStep] : []
    title = finalStep < 3 ? `最终选择 ${finalStep+1}/3 · ${['报名怎么放','查人时问谁','院系名单怎么用'][finalStep]}` : '三个选择已就绪'
    description = finalStep < 3 ? lesson[1] : `报名：${s.finalChoices.sharding === 'id' ? '按编号轮流放' : s.finalChoices.sharding === 'region' ? '相同地区放一起' : '相同状态放一起'}；查人：${s.finalChoices.query === 'targeted' ? '只问目标仓库' : '三个仓库全问'}；院系名单：${s.finalChoices.publicData === 'replicated' ? '各备一份' : '只存一份'}。`
    label = finalStep < 3 ? '确认此项策略' : '执行峰值调度'
    action = () => { if (finalStep < 3) { p.onFinalChoice(keys[finalStep], selected as DispatchStrategy); setSelected(''); setFinalStep(finalStep+1) } else p.onFinal() }
  }
  if (result) {
    title = settling ? '正在执行你的选择…' : s.phase === 'final-result' ? `高峰结果 · ${s.systemStatus === 'STABLE' ? '运行稳定' : s.systemStatus === 'HIGH LOAD' ? '负载偏高' : '出现过载'}` : '看看你的选择带来了什么'
    description = settling ? '数据经过中央分拣台，沿着亮起的路线进入仓库。' : s.npcMessage
    label = '继续下一波任务'
    action = s.phase === 'sharding-result' ? p.onShardingContinue : s.phase === 'query-result' ? p.onQueryContinue : s.phase === 'replication-small-result' ? p.onSmallContinue : s.phase === 'replication-large-result' ? p.onLargeContinue : p.onReport
    if (s.phase === 'final-result') label = '生成调度报告'
  }
  const message = hint ? lesson[2] : result ? (settling ? '指令已收到。先看路线，再比较三个仓库的负载数字。' : s.npcMessage) : lesson[2]
  return <main className="dispatch-console">
    <header className="dispatch-header"><div><h1>OpenTenBase <span>数据调度中心</span></h1><small>TenDispatch / 科成-开放原子开源社团</small></div><nav aria-label="任务进度">{phases.map((phase,i) => <span key={phase} className={i <= stage ? 'passed' : ''}>{String(i+1).padStart(2,'0')}</span>)}</nav><div className="session-details"><b>{s.nickname}</b><span>{difficulties[s.options.difficulty].label} · 教程不计分 · 正式任务积分 ×{multiplier} · {seconds}s · {s.options.pressure}% 额外流量</span></div></header>
    <LogisticsCenter replicaDataset={s.phase === 'replication-large-result' ? 'logs' : 'public'} state={{...s, dnLoads:p.displayLoads, cargoMode: effectiveMode, queryNodes:s.phase === 'replication-small-result' && s.finalReplication === 'centralized' ? 3 : s.phase === 'final-result' ? (s.finalChoices.query === 'targeted' && s.finalChoices.sharding === 'id' ? 1 : 3) : s.queryNodes}}/>
    <div className="scene-legend"><span>■ 写入</span><span>● 查询</span><span>■ 公共副本</span><small>教学模拟 / 负载不代表真实数据库基准</small><button onClick={() => setPaused(!paused)}>{paused ? '继续场景动效' : '暂停场景动效'}</button></div>
    <section className="dispatch-controls"><div className="mission-copy"><span>当前任务 {stage+1} / 7</span><h2>{title}</h2><p>{description}</p></div><div className="strategy-desk">
      <div className="strategy-options">{options.map((option) => <button key={option.id} aria-pressed={selected === option.id} className={selected === option.id ? 'selected' : ''} onClick={() => setSelected(option.id)}><strong>{option.label}</strong><small>{option.detail}</small></button>)}</div>
      <div className="dispatch-action-row">
        {s.phase === 'sharding-result' && s.finalSharding !== 'id' && <button className="strategy-retry" disabled={observation > 0} onClick={() => p.onSharding('id')}>调整为编号分配</button>}
        {s.phase === 'replication-small-result' && s.finalReplication !== 'replicated' && <button className="strategy-retry" disabled={observation > 0} onClick={() => p.onSmallReplication('replicated')}>改为就近副本</button>}
        <button className="confirm-dispatch" disabled={observation > 0 || (options.length > 0 && !selected)} onClick={action}>{observation > 0 ? `执行中 · ${observation}s` : label}</button>
      </div><p className="operation-note">{result ? '先读上面的结果，再观察负载数字和亮起的路线。' : selected ? `你选择了：${options.find(option => option.id === selected)?.label}。确认后立即执行。` : options.length ? '先读每项后果，再选一种做法。' : '按下按钮后，场景会显示这一步发生了什么。'}</p>
    </div></section>
    <div className="npc-dock">{npcOpen && <div className="npc-bubble"><button className="close-npc" aria-label="关闭通讯" onClick={() => setNpcOpen(false)}>×</button><NPCChannel key={message} message={message}/></div>}{s.options.guide && <button className="request-hint" onClick={() => { if (!hint) p.onHint(); setHint(true); setNpcOpen(true) }}>获取调度提示 / 呼叫社团联络员</button>}</div>
  </main>
}
