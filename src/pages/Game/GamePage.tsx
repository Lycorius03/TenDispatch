import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import { getRankedWave, rankedDecisionWindowMs, rankedNextWaveDelayMs, tutorialWaves } from '../../config/rankedWaves'
import type { DispatchStrategy, FinalChoices, GameState, RankedStrategy, ReplicationStrategy } from '../../game/GameState'
import { LogisticsCenter } from '../../components/LogisticsCenter/LogisticsCenter'
import { NPCChannel } from '../../components/NPCChannel/NPCChannel'
import { difficulties, scoreMultiplier } from '../../config/difficulty'
import type { RankedOption, RankedWave } from '../../config/rankedWaves'
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
  onTutorialExit?: () => void
  onTutorialWave?: (strategy: RankedStrategy) => void
  onTutorialWaveRetry?: () => void
  onRankedSubmit?: (strategy: RankedStrategy, decisionMs?: number) => void
  onRankedTimeout?: () => void
  onRankedNext?: () => void
  onRankedPrediction?: () => void
  onRankedUndo?: () => void
  onRankedFinish?: () => void
  onRankedGameOver?: () => void
}
type StrategyOption = { id: string; label: string; detail: string }

export const shuffleOptions = <T,>(options: readonly T[], random: () => number = Math.random): T[] => {
  const shuffled = [...options]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  // Wave data lists the preferred strategy first. Force that source-first item
  // away from the first card so every question is visibly reordered.
  if (shuffled.length > 1 && shuffled[0] === options[0]) {
    const swapIndex = 1 + Math.floor(random() * (shuffled.length - 1))
    ;[shuffled[0], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[0]]
  }
  return shuffled
}

export const getDecisionElapsedMs = (waveStartedAt: number, currentTime: number, pausedDurationMs: number, pausedAt: number | null) =>
  Math.max(0, (pausedAt ?? currentTime) - waveStartedAt - pausedDurationMs)

const lessons: Record<string, [string, string, string]> = {
  tutorial: ['首席调度官，先熟悉一下工作台', '这一关先认识操作位置：中间的分拣台会接收数据，下面三个仓库会保存数据。请点击“接管工作台”，我们一起开始。', '我是科成-开放原子开源社团联络员。这一步先认识场景，不计分；点下按钮后，我会陪你做第一道选择。'],
  sharding: ['第一关 · 帮一万条报名找个合适的家', '首席调度官，我们要把一万条报名放进三个仓库。报名编号很分散，地区人数不一样，大多数人的状态却相同。三种放法各有侧重点，请先看清它们分别按什么字段来分。', '按编号：记录按编号分到三个仓库；按地区：相同地区的记录放在一起；按状态：相同报名状态的记录放在一起。选完后看负载数字，再决定这次分法是否合适。'],
  query: ['第二关 · 找到编号 #2817 的报名', '首席调度官，现在要找一名同学的报名记录。如果刚才按编号分开存，分拣台可以直接找到一个仓库；否则会逐个询问多个仓库。请点击“开始查找”，看橙色路线和访问数量。', '我是科成-开放原子开源社团联络员。看结果就能判断路径：访问一个仓库代表路径直接，访问三个代表大家一起帮忙找。'],
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
  const modernMode = props.state.mode !== 'legacy'
  return <div className={`desktop-stage ${modernMode ? 'modern-stage' : ''}`} style={{'--stage-scale': scale} as CSSProperties}>{props.state.mode === 'legacy' ? <Console key={`${props.state.phase}-${props.state.finalSharding}-${props.state.finalReplication}`} {...props} displayLoads={displayLoads}/> : <ModernConsole key={`${props.state.mode}-${props.state.phase}-${props.state.waveIndex}-${props.state.tutorialStep}-${props.state.lastDecisionStrategy}`} {...props} displayLoads={displayLoads}/>}</div>
}

const tutorialSteps = [
  { kicker: '01 / YOUR MISSION', title: '只用三条线索完成判断', body: '每题只按一个顺序看：先看高频访问，再看数据分布，最后看图上三个 DN 的当前负载；然后选方案、确认并观察结果。', note: '教学不限时、不计分、不失败，选错了也能重试。' },
  { kicker: '02 / CN + DN', title: '数据从哪里来，又要到哪里去', body: '画面上方是数据入口，中间的 CN 是调度台，下方三个 DN 是存放和处理数据的节点。操作重点在选项卡：选一个方案并确认，然后观察哪个 DN 变忙。', note: 'DN 负载就是节点当前有多忙；数字越高，余量越少。' },
  { kicker: '03 / TASK CARD', title: '任务卡先看高频访问和分布', body: '“高频访问”告诉你这批数据最常按什么方式使用，优先找规则能直接对上的方案；“分布”告诉你压力容易均匀摊开还是集中到一处。', note: '先把这两句话与方案名称和说明对上。' },
  { kicker: '04 / LIVE LOAD', title: '再看图上的当前 DN 负载', body: '图上的 DN 百分比就是此刻的忙碌程度。数字越高，剩余空间越少；如果某个节点已经很忙，就避免让新方案继续把压力堆向它。', note: '固定顺序：高频访问 → 数据分布 → 当前负载。' },
  { kicker: '05 / TRAINING 1', title: '训练 1 · 把三条线索连起来', body: '先找与高频访问最匹配的方案，再用数据分布和当前 DN 负载检查它会不会制造新的热点，然后确认。', note: '本波不限时；只需要说清楚这三条依据。' },
  { kicker: '06 / REVIEW 1', title: '复盘 1 · 看负载怎样变化', body: '把任务卡中的高频访问、数据分布和确认后的新负载放在一起看，判断方案是否既匹配使用方式，又没有让忙节点更拥挤。', note: '你可以重试这一波，观察另一种选择会怎样改变负载。' },
  { kicker: '07 / TRAINING 2', title: '训练 2 · 小型公共数据要不要复制', body: '先看高频访问是否来自所有业务，再看数据分布和图上的当前负载，判断“少存一份”还是“多处就近保存”更合适。', note: '确认后直接观察三个 DN 的新负载。' },
  { kicker: '08 / REVIEW 2', title: '复盘 2 · 线索与负载是否一致', body: '高频访问写着所有业务都会反复读取，分布提示它是小型公共数据；再看图上负载，就能判断方案是否把读取压力合理分散。', note: '继续前可以换一个方案，直接比较三个 DN 的变化。' },
  { kicker: '09 / TRAINING 3', title: '训练 3 · 大型持续写入', body: '先看高频访问需要怎样使用数据，再看分布是否容易集中，最后检查图上哪个 DN 已经最忙，避免继续消耗它的余量。', note: '不要背答案，始终按三条线索判断。' },
  { kicker: '10 / REVIEW 3', title: '复盘 3 · 固定自己的检查顺序', body: '每波都按同一套顺序：高频访问 → 数据分布 → 当前 DN 负载 → 选方案 → 确认 → 看新负载。正式模式没确认的波次按 0 分。', note: '这套顺序比记住某个固定答案更重要。' },
  { kicker: '11 / RANKED READY', title: '正式模式还会发生什么', body: 'Ranked 共 14 波，状态会连续继承；每波 20 秒。打开“判断方法”时本题计时暂停，关闭后继续；未确认直接记 0 分。', note: '遇到犹豫时仍按高频访问、数据分布、当前负载依次判断。' },
]

const tutorialTrainingGoals = [
  { label: '访问与分布', question: '高频访问是按用户查询，数据分布又有集中风险；结合图上的当前负载，哪个方案既对得上访问方式，又不容易制造热点？' },
  { label: '高频读取', question: '高频访问是所有业务反复读取，数据本身很小；结合当前 DN 负载，哪个方案更合适？' },
  { label: '负载余量', question: '数据量大且持续写入；结合它的分布和图上已有负载，哪个方案最不容易耗尽 DN 余量？' },
]

const previewRankedLoads = (state: Pick<GameState, 'dnLoads' | 'replicationState' | 'queryPressure'>, wave: RankedWave, option: RankedOption) => state.dnLoads.map((load, index) => Math.min(100, Math.round(load * .82 + option.loadDelta[index] + (wave.finalRush ? 5 : 0) + (state.replicationState.largeCopies > 1 ? 2 : 0) + Math.round(state.queryPressure * .04)))) as [number, number, number]

function ModernConsole(p: GamePageProps & { displayLoads: GameState['dnLoads'] }) {
  const s = p.state
  const [selected, setSelected] = useState<RankedStrategy | ''>('')
  const [showPrediction, setShowPrediction] = useState(false)
  const [decisionGuideOpenedAt, setDecisionGuideOpenedAt] = useState<number | null>(null)
  const [decisionPausedMs, setDecisionPausedMs] = useState(0)
  const [now, setNow] = useState(Date.now)
  const [resultStartedAt] = useState(Date.now)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(timer)
  }, [])
  const showDecisionGuide = decisionGuideOpenedAt !== null
  const decisionElapsedMs = getDecisionElapsedMs(s.waveStartedAt, now, decisionPausedMs, decisionGuideOpenedAt)
  useEffect(() => {
    if (s.mode === 'ranked' && s.phase === 'ranked' && !showDecisionGuide && decisionElapsedMs > rankedDecisionWindowMs) p.onRankedTimeout?.()
  }, [decisionElapsedMs, showDecisionGuide, s.mode, s.phase, p.onRankedTimeout])
  const tutorial = tutorialSteps[Math.max(0, Math.min(tutorialSteps.length - 1, s.tutorialStep - 1))]
  const ranked = s.mode === 'ranked'
  const result = ranked && s.phase === 'ranked-result'
  const dead = ranked && s.phase === 'ranked-dead'
  const nextWaveAt = ranked && result && s.waveIndex < 13 ? resultStartedAt + rankedNextWaveDelayMs : 0
  const nextWaveReady = nextWaveAt === 0 || now >= nextWaveAt
  const nextWaveWait = Math.max(0, Math.ceil((nextWaveAt - now) / 1000))
  useEffect(() => {
    if (ranked && result && s.waveIndex < 13 && nextWaveAt > 0 && now >= nextWaveAt) p.onRankedNext?.()
  }, [now, nextWaveAt, ranked, result, s.waveIndex, p.onRankedNext])
  const wave = ranked ? getRankedWave(s.waveIndex, s.dailySeed) : undefined
  const tutorialWave = tutorialWaves[s.tutorialWaveIndex] ?? tutorialWaves[0]
  const rankedOptions = useMemo(() => wave ? shuffleOptions(wave.options) : [], [s.dailySeed, s.waveIndex, wave?.id])
  const tutorialOptions = useMemo(() => shuffleOptions(tutorialWave.options), [s.tutorialWaveIndex, tutorialWave.id])
  const latest = s.waveResults[s.waveResults.length - 1]
  const decisionRemaining = ranked && s.phase === 'ranked' ? Math.max(0, rankedDecisionWindowMs / 1000 - decisionElapsedMs / 1000) : 0
  const toggleDecisionGuide = () => {
    const timestamp = Date.now()
    if (decisionGuideOpenedAt !== null) {
      setDecisionPausedMs((duration) => duration + timestamp - decisionGuideOpenedAt)
      setDecisionGuideOpenedAt(null)
      return
    }
    setDecisionGuideOpenedAt(timestamp)
  }
  const effectiveMode = paused ? 'idle' : !ranked ? s.cargoMode : dead ? 'idle' : wave?.finalRush && (result || selected) ? 'sync' : result ? s.cargoMode : selected ? (selected === 'replicated' ? 'replicate' : wave?.options.find((item) => item.id === selected)?.queryNodes === 1 ? 'write' : 'query') : 'idle'
  const projected = wave?.options.map((option) => ({
    ...option,
    loads: previewRankedLoads(s, wave, option),
  })) ?? []
  const tutorialProjected = tutorialOptions.map((option) => ({ ...option, loads: previewRankedLoads(s, tutorialWave, option) }))
  const tutorialBestOption = tutorialWave.options.find((option) => option.id === tutorialWave.defaultStrategy) ?? tutorialWave.options[0]
  const statusLabel = s.systemStatus === 'OVERLOAD' ? '过载' : s.systemStatus === 'HIGH LOAD' ? '较高' : '稳定'
  const tutorialChoosing = s.mode === 'tutorial' && [5, 7, 9].includes(s.tutorialStep)
  const tutorialResult = s.mode === 'tutorial' && [6, 8, 10].includes(s.tutorialStep) && s.tutorialWaveCompleted
  const tutorialSelected = tutorialWave.options.find((option) => option.id === s.tutorialStrategy)
  const tutorialGreeting = s.mode === 'tutorial' && s.tutorialStep === 0
  const tutorialGuideStep = s.mode === 'tutorial' && s.tutorialStep >= 1 && s.tutorialStep <= 4
  const tutorialFocus = s.tutorialStep === 1 ? 'scene' : s.tutorialStep <= 3 ? 'task' : 'options'
  const advanceTutorialFromBlank = (event: ReactMouseEvent<HTMLElement>) => {
    if (!tutorialGuideStep || !(event.target instanceof Element)) return
    if (event.target.closest('button, a, input, select, textarea, [data-tutorial-static]')) return
    p.onTutorialStep?.()
  }
  return <main className="dispatch-console modern-console" onClick={advanceTutorialFromBlank}>
    <header className="dispatch-header">
      <div><h1>OpenTenBase <span>数据调度中心</span></h1><small>TenDispatch / {ranked ? 'RANKED 极速调度' : '新手教学'}</small></div>
      {ranked ? <div className={`ranked-header-readout ${dead ? 'is-dead' : ''}`}><b>{dead ? 'DEAD · ' : ''}WAVE {String(s.waveIndex + 1).padStart(2, '0')} / 14</b><i style={{ '--progress': (s.waveIndex + (result ? 1 : 0)) / 14 } as CSSProperties} /><span>{dead ? 'NODE CAPACITY REACHED · RUN ENDED' : `DAILY SEED ${s.dailySeed}`}</span></div> : <div className="tutorial-header-readout"><b>{tutorialGreeting ? '欢迎' : `教学 ${Math.min(11, Math.max(1, s.tutorialStep))} / 11`}</b><span>3 波训练 · 不限时 · 不计分 · 可重试</span></div>}
      <div className="session-details"><b>{s.nickname}</b>{ranked ? <span>{dead ? `本局已结束 · 总分 ${s.totalScore}` : `${showDecisionGuide ? '本波计时已暂停' : `本波 ${decisionRemaining.toFixed(1)}s`} · 总分 ${s.totalScore} · Combo ×${s.combo ? (s.waveResults.at(-1)?.multiplier ?? 1).toFixed(2) : '1.00'}`}</span> : <span>CN / DN / Shard / Replication · 训练一波</span>}</div>
    </header>
    <section className="modern-status-bar" aria-label="实时调度指标">
      <Metric label="DN 负载" value={s.dnLoads.map((load, index) => `DN-${index + 1} ${load}%`).join(' · ')} tone={Math.max(...s.dnLoads) >= 95 ? 'danger' : Math.max(...s.dnLoads) >= 80 ? 'warning' : 'normal'} />
      <Metric label="平均查询触达" value={ranked && s.averageQueryNodes ? `${s.averageQueryNodes.toFixed(2)} 节点 · 压力 ${s.queryPressure}%` : '观察中'} />
      <Metric label="跨节点搬运" value={ranked ? `${s.crossNodeMovement}%` : '教学演示'} tone={s.crossNodeMovement >= 70 ? 'warning' : 'normal'} />
      <Metric label="资源占用" value={ranked ? `${s.resourceUsage}%` : '复制成本示例'} tone={s.resourceUsage >= 80 ? 'danger' : 'normal'} />
    </section>
    <LogisticsCenter replicaDataset={s.replicationState.lastDataset === 'business' ? 'logs' : 'public'} state={{ ...s, dnLoads: p.displayLoads, cargoMode: effectiveMode, queryNodes: latest?.queryNodes ?? s.queryNodes, systemStatus: s.systemStatus }} />
    <div className="scene-legend"><span>■ 写入</span><span>● 查询</span><span>■ 复制</span><small>{ranked ? `状态继承中 · ${statusLabel}` : '教学模拟 · 不计分'}</small><button onClick={() => setPaused(!paused)}>{paused ? '继续场景动效' : '暂停场景动效'}</button></div>
    {tutorialGuideStep && <><div className={`tutorial-spotlight is-${tutorialFocus}`} aria-hidden="true" /><aside className="tutorial-guide-dialog" data-tutorial-static><span>教学提示 · {tutorialSteps[s.tutorialStep - 1].kicker}</span><NPCChannel message={s.npcMessage} /></aside></>}
    {s.mode === 'tutorial' ? <section className="modern-controls tutorial-controls">
      {tutorialGreeting && <TutorialWelcome message={s.npcMessage} onStart={() => p.onTutorialStep?.()} onExit={() => p.onTutorialExit?.()} />}
      {tutorialChoosing ? <>
        <TutorialMissionCard wave={tutorialWave} waveIndex={s.tutorialWaveIndex} loads={s.dnLoads} />
        <div className="ranked-decision-desk tutorial-wave-desk"><div className="tutorial-npc-coach"><NPCChannel message={s.npcMessage} /></div><div className="tutorial-wave-rule"><b>按三步判断</b><span>{tutorialTrainingGoals[s.tutorialWaveIndex].question}</span></div><div className="ranked-options tutorial-wave-options">{tutorialProjected.map((option) => <button key={option.id} aria-pressed={selected === option.id} className={selected === option.id ? 'selected' : ''} onClick={() => setSelected(option.id)}><strong>{option.label}</strong><small>{option.detail}</small></button>)}</div><div className="tutorial-score-key"><span><b>① 高频访问</b>{tutorialWave.access}</span><span><b>② 数据分布</b>{tutorialWave.distribution}</span><span><b>③ 当前负载</b>{s.dnLoads.map((load, index) => `DN-${index + 1} ${load}%`).join(' · ')}</span></div><div className="modern-action-row"><button className="secondary-action" onClick={() => p.onTutorialRestart?.()}>重新开始教学</button><button className="confirm-dispatch" disabled={!selected} onClick={() => p.onTutorialWave?.(selected as RankedStrategy)}>{selected ? '确认并查看结果' : '先选择一个策略'}</button></div><p className="operation-note">教学波不限时；按“高频访问 → 数据分布 → 当前负载”依次判断。</p></div>
      </> : <>
        {tutorialGuideStep ? <TutorialMissionCard wave={tutorialWave} waveIndex={s.tutorialWaveIndex} loads={s.dnLoads} staticPreview /> : <div className="modern-mission-copy"><span>{tutorial.kicker}</span><h2>{tutorial.title}</h2><p>{tutorial.body}</p><small>{tutorial.note}</small></div>}
        <div className="tutorial-action-card"><div className="tutorial-progress">{tutorialSteps.map((step, index) => <i key={step.kicker} className={index < Math.max(0, s.tutorialStep - 1) || s.tutorialCompleted ? 'is-done' : ''} />)}</div>{tutorialGuideStep ? <TutorialOptionPreview wave={tutorialWave} /> : <div className="tutorial-npc-coach"><NPCChannel message={s.npcMessage} /></div>}{tutorialResult && <div className="tutorial-wave-result"><b>训练 {s.tutorialWaveIndex + 1} 结果 · {tutorialSelected?.label ?? '未记录'}</b><span>高频访问：{tutorialWave.access}</span><span>数据分布：{tutorialWave.distribution}</span><span>确认后的负载：{s.dnLoads.map((load, index) => `DN-${index + 1} ${load}%`).join(' · ')}</span><small>对照三条线索，看看这个结果是否符合你的判断。</small><div className={`tutorial-feedback ${tutorialSelected?.id === tutorialBestOption.id ? 'is-best' : 'is-review'}`}><strong>{tutorialSelected?.id === tutorialBestOption.id ? `判断正确：${tutorialBestOption.label}` : `这次选的是“${tutorialSelected?.label}”`}</strong><p>本波更合适的方案：<b>{tutorialBestOption.label}</b>。它更符合高频访问和数据分布，也更能控制当前 DN 负载。</p>{tutorialSelected?.id !== tutorialBestOption.id && <div className="tutorial-option-analysis"><b>三个方案对负载的影响</b>{tutorialProjected.map((option) => <span key={option.id} className={option.id === tutorialBestOption.id ? 'is-best' : ''}><strong>{option.label}{option.id === tutorialBestOption.id ? ' · 更合适' : ''}</strong><small>确认后负载：{option.loads.map((load, index) => `DN-${index + 1} ${load}%`).join(' · ')}</small></span>)}<p>为什么选它：高频访问是“{tutorialWave.access}”，数据分布是“{tutorialWave.distribution}”；再结合当前 DN 余量，这个方案更符合三条线索。</p></div>}</div></div>}<p>{tutorialResult ? '对照三条线索读完结果，再决定重试还是继续。' : tutorialGuideStep ? '当前高亮区域就是本步要认识的信息；点击画面空白处继续。' : '按提示熟悉操作，再亲手完成三波训练；教学全程不限时、不计分。'}</p><div className="tutorial-action-row">{tutorialResult && <button className="secondary-action" onClick={() => p.onTutorialWaveRetry?.()}>换个方案再试</button>}<button className="secondary-action" onClick={() => p.onTutorialExit?.()}>暂时退出教学</button>{!tutorialGuideStep && <button className="confirm-dispatch" disabled={tutorialGreeting} onClick={() => p.onTutorialStep?.()}>{s.tutorialStep === 6 ? '继续训练 2' : s.tutorialStep === 8 ? '继续训练 3' : s.tutorialStep === 10 ? '整理正式模式操作顺序' : s.tutorialStep === 11 ? '完成教学，返回首页' : '继续'}</button>}</div><p className="operation-note">固定顺序：高频访问 → 数据分布 → 当前 DN 负载；想比较结果时可以重试。</p></div>
      </>}
    </section> : dead ? <section className="modern-controls ranked-controls ranked-death-controls">
      <div className="modern-mission-copy"><span>GAME OVER · NODE CAPACITY</span><h2>节点负载已满，调度中止</h2><p>{s.deathReason ?? '任一 DN 达到 100% 负载，极速模式立即结束本局。'}</p><small>本局不会再进入下一波；记住先看余量，再确认高压策略。</small></div><div className="ranked-death-card"><div className="ranked-death-readout"><span>DEAD AT WAVE</span><strong>{String(s.waveIndex + 1).padStart(2, '0')} / 14</strong></div><div className="ranked-death-loads">{s.dnLoads.map((load, index) => <span key={index} className={load >= 100 ? 'is-fatal' : ''}>DN-{index + 1} <b>{load}%</b></span>)}</div><button className="confirm-dispatch" onClick={() => p.onRankedGameOver?.()}>返回模式选择 →</button></div>
    </section> : <section className="modern-controls ranked-controls">
      <div className="modern-mission-copy"><span>{wave?.finalRush ? `FINAL RUSH · WAVE ${wave.id}` : `WAVE ${String(wave?.id ?? 0).padStart(2, '0')} · ${wave?.publicData ? 'PUBLIC DATA' : 'DATA FLOW'}`}</span><h2>{result ? `Wave ${latest?.wave} · ${latest?.grade}` : wave?.title}</h2>{result ? <p>{latest?.note}</p> : <p><b>{wave?.dataName}</b> · 规模 {Array.from({ length: 5 }, (_, index) => index < (wave?.size ?? 1) ? '★' : '☆').join('')}<br />数据分布：{wave?.distribution}<br />高频访问：{wave?.access}{wave?.publicData ? ' · 公共数据' : ''}</p>}<small>本局目标：撑完 14 波后，让三个 DN 都保持低负载。比较选项卡下的查询、搬运、成本，选择综合负担最小的方案。</small><small className="ranked-death-rule">死亡条件：任一 DN 负载达到 100%，立即结束本局。</small></div>
      <div className="ranked-decision-desk">
        {!result && <div className={`decision-clock ${showDecisionGuide ? 'is-paused' : ''}`}><span>本波决策窗口</span><strong>{decisionRemaining.toFixed(1)}s</strong><i><b style={{ transform: `scaleX(${Math.min(1, decisionRemaining / (rankedDecisionWindowMs / 1000))})` }} /></i><small>{showDecisionGuide ? '判断方法展开中：本波计时已暂停' : '未确认策略：本波直接 0 分'}</small></div>}
        {!result && <button className="decision-guide-toggle" aria-expanded={showDecisionGuide} aria-controls="decision-data-guide" onClick={toggleDecisionGuide}>{showDecisionGuide ? '关闭判断方法 · 继续计时' : '？ 查看判断方法（暂停计时）'}</button>}
        {!result && showDecisionGuide && <DecisionDataGuide />}
        {result ? <div className="wave-result-card"><div><strong>{latest?.score.total}/100</strong><span>{latest?.grade} · Combo {latest?.combo > 0 ? `×${latest?.multiplier.toFixed(2)}` : '已清零'}</span></div><div className="result-mini-grid"><span>负载 {latest?.score.loadBalance}/40</span><span>查询 {latest?.score.queryEfficiency}/30</span><span>资源 {latest?.score.resourceCost}/20</span><span>速度 {latest?.score.decisionSpeed}/10</span></div></div> : <div className="ranked-options" aria-describedby={showDecisionGuide ? 'decision-data-guide' : undefined}>{rankedOptions.map((option) => <button key={option.id} aria-pressed={selected === option.id} className={selected === option.id ? 'selected' : ''} disabled={showDecisionGuide} title={showDecisionGuide ? '判断方法展开时不能选择策略' : undefined} onClick={() => { if (!showDecisionGuide) setSelected(option.id) }}><strong>{option.label}</strong><small>{option.detail}</small><em>查询 {option.queryNodes} DN · 搬运 {option.crossNodeMovement}% · 成本 {option.resourceCost}</em></button>)}</div>}
        {!result && showPrediction && <div className="prediction-panel"><header><b>预测视图 · 本波最高评级为 GOOD</b><span>剩余 {s.predictionUsesRemaining} 次</span></header>{rankedOptions.map((option) => { const item = projected.find((projectedOption) => projectedOption.id === option.id); return <div key={option.id}><strong>{option.label}</strong><span>负载 {item?.loads.join(' / ') ?? '—'}%</span><span>查询 {option.queryNodes} DN</span><span>搬运 {option.crossNodeMovement}%</span><span>成本 {option.resourceCost}</span></div> })}</div>}
        <div className="modern-action-row">{result && s.waveIndex < 13 && <button className="secondary-action" disabled={!nextWaveReady} onClick={() => p.onRankedNext?.()}>{nextWaveReady ? '下一波 →' : `下一波将在 ${nextWaveWait}s 到达`}</button>}{result && s.undoUsesRemaining > 0 && <button className="strategy-retry" onClick={() => p.onRankedUndo?.()}>撤回最近决策 · -50</button>}{!result && s.predictionUsesRemaining > 0 && !showPrediction && <button className="secondary-action" disabled={showDecisionGuide} title={showDecisionGuide ? '判断方法展开时不能使用预测' : undefined} onClick={() => { if (!showDecisionGuide) { p.onRankedPrediction?.(); setShowPrediction(true) } }}>预测 ×{s.predictionUsesRemaining}</button>}{!result && <button className="confirm-dispatch" disabled={showDecisionGuide || !selected} title={showDecisionGuide ? '关闭判断方法后才能确认调度' : undefined} onClick={() => { if (!showDecisionGuide && selected) p.onRankedSubmit?.(selected as RankedStrategy, getDecisionElapsedMs(s.waveStartedAt, Date.now(), decisionPausedMs, decisionGuideOpenedAt)) }}>{selected ? '确认调度' : '选择一个策略'}</button>}{result && s.waveIndex === 13 && <button className="confirm-dispatch" onClick={() => p.onRankedFinish?.()}>查看本局成绩 →</button>}</div>
        <p className="operation-note">{result ? '读完本波评分后再继续。状态、复制和资源不会在下一波重置。' : '比较选项卡下的查询、搬运、成本，选择你认为综合负担最小的方案。'}</p>
      </div>
    </section>}
    <div className="modern-footer-note">{ranked ? dead ? '本局已结束 · 任一 DN 达到 100% 即死' : `预测 ${s.predictionUsesRemaining}/2 · 撤回 ${s.undoUsesRemaining}/1 · PERFECT ${s.perfectCount} · 最大 Combo ${s.maxCombo}` : 'CN → DN → Shard → Replication · 教学关不计分'}</div>
  </main>
}

function TutorialWelcome({ message, onStart, onExit }: { message: string; onStart: () => void; onExit: () => void }) {
  return <div className="tutorial-welcome-backdrop">
    <div className="tutorial-welcome" role="dialog" aria-modal="true" aria-labelledby="tutorial-welcome-title">
      <span className="tutorial-welcome-kicker">INCOMING MESSAGE / 教学频道已接入</span>
      <h2 id="tutorial-welcome-title">欢迎来到 TenDispatch</h2>
      <NPCChannel message={message} />
      <div className="tutorial-briefing-grid"><div><b>你是谁</b><span>数据物流中心的首席调度官</span></div><div><b>你要做什么</b><span>为每批数据选择合适的存放方案</span></div><div><b>判断看哪里</b><span>高频访问、数据分布、图上当前 DN 负载</span></div><div><b>怎么学习</b><span>按固定顺序完成 3 波不限时训练，每波都可重试</span></div></div>
      <p className="tutorial-welcome-note">教学不会计时、不会计分、不会中途失败。你只需要练会一个顺序：先看高频访问，再看数据分布，最后看图上的当前负载。</p>
      <div className="tutorial-welcome-actions"><button className="secondary-action" onClick={onExit}>暂时退出</button><button className="confirm-dispatch" onClick={onStart}>开始第一步：认识工作台 →</button></div>
    </div>
  </div>
}

function TutorialMissionCard({ wave, waveIndex, loads, staticPreview = false }: { wave: RankedWave; waveIndex: number; loads: GameState['dnLoads']; staticPreview?: boolean }) {
  return <div className="modern-mission-copy" {...(staticPreview ? { 'data-tutorial-static': true } : {})}><span>TRAINING WAVE {waveIndex + 1} / 3 · {tutorialTrainingGoals[waveIndex].label}</span><h2>{wave.title}</h2><p><b>{wave.dataName}</b><br />数据分布：{wave.distribution}<br />高频访问：{wave.access}{wave.publicData ? ' · 公共数据' : ''}</p><small>当前负载：{loads.map((load, index) => `DN-${index + 1} ${load}%`).join(' · ')}</small></div>
}

function TutorialOptionPreview({ wave }: { wave: RankedWave }) {
  return <div className="tutorial-option-preview" data-tutorial-static><b>方案卡 / 对照任务线索</b>{wave.options.map((option) => <span key={option.id}><strong>{option.label}</strong><em>{option.detail}</em></span>)}</div>
}

export function DecisionDataGuide() {
  return <aside className="decision-data-guide decision-data-guide--simple" id="decision-data-guide" aria-label="判断方法">
    <header><b>只看选项卡的三项数字</b><span>本题计时已暂停</span></header>
    <div><strong>选择综合负担最小的方案</strong><p>比较每张选项卡下的<b>查询、搬运、成本</b>。不必要求单项都最低；选你认为三项合起来最小、最划算的方案。数字越小，通常代表参与查询的节点更少、跨节点搬运更少、资源占用更少。</p></div>
    <footer>暂停期间不能选择或确认策略。比较完三项数字后，关闭说明，再确认你的选择。</footer>
  </aside>
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
