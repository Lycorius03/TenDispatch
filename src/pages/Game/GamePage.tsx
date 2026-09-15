import type { CSSProperties } from 'react'
import type { DispatchStrategy, FinalChoices, GameState, ReplicationStrategy } from '../../game/GameState'
import { shardingScenarios, stageLabels } from '../../config/gameConfig'
import { queryScenario } from '../../scenarios/query'
import { replicationScenarios } from '../../scenarios/replication'
import { LogisticsCenter } from '../../components/LogisticsCenter/LogisticsCenter'
import { NPCChannel } from '../../components/NPCChannel/NPCChannel'
import { StatusPanel } from '../../components/StatusPanel/StatusPanel'
import { HintIcon } from '../../components/icons'
import { DecisionPanel } from './DecisionPanel'

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
}

const progressByPhase: Record<GameState['phase'], number> = {
  tutorial: 8, sharding: 20, 'sharding-result': 32, query: 40, 'query-result': 50,
  'replication-small': 58, 'replication-small-result': 65, 'replication-large': 70,
  'replication-large-result': 76, gtm: 84, final: 94, 'final-result': 100, complete: 100,
}

const phaseGroup = (phase: GameState['phase']) => phase.startsWith('sharding') ? 'sharding' : phase.startsWith('query') ? 'query' : phase.startsWith('replication') ? 'replication' : phase.startsWith('final') ? 'final' : phase

export function GamePage(props: GamePageProps) {
  const { state } = props
  const averageLoad = Math.round(state.dnLoads.reduce((sum, load) => sum + load, 0) / 3)
  const finalReady = Boolean(state.finalChoices.sharding && state.finalChoices.query && state.finalChoices.publicData)

  const panel = () => {
    switch (state.phase) {
      case 'tutorial':
        return <DecisionPanel title="建立第一条调度链路" description="少量数据已进入 CN。启动基础调度，让三个数据节点共同承担压力。" actionLabel="启动基础调度" onAction={props.onTutorial} />
      case 'sharding':
        return <DecisionPanel title="10,000 条报名数据正在进入" description="为 CN 配置数据分配规则。先看数据特征，再选择它们如何进入不同 DN。" options={(Object.entries(shardingScenarios) as [DispatchStrategy, typeof shardingScenarios[DispatchStrategy]][]).map(([id, scenario]) => ({ id, label: scenario.label, description: scenario.description, meta: id === 'id' ? 'ID' : id === 'region' ? '地区' : '状态' }))} onSelect={(id) => props.onSharding(id as DispatchStrategy)} />
      case 'sharding-result': {
        const skew = state.finalSharding === 'status'
        return <DecisionPanel tone={skew ? 'warning' : 'default'} title={skew ? '检测到数据倾斜' : state.finalSharding === 'id' ? '节点负载已恢复均衡' : '分配完成，节点存在压力差'} description={skew ? '82% 的数据进入 DN-01。大量“已报名”记录被集中到了同一个节点。' : state.finalSharding === 'id' ? '33 / 34 / 33。这个分配依据在 OpenTenBase 中对应 Distribution Key（分布键）。' : '地区体量不完全相同，当前可以继续，也可以切换到更均衡的编号规则。'}>
          <div className="result-metrics"><span><small>DN-01</small><b>{state.dnLoads[0]}%</b></span><span><small>DN-02</small><b>{state.dnLoads[1]}%</b></span><span><small>DN-03</small><b>{state.dnLoads[2]}%</b></span></div>
          <div className="dual-actions">
            {state.finalSharding !== 'id' && <button className="secondary-action" onClick={() => props.onSharding('id')}>改为按编号分配</button>}
            <button className="panel-action" onClick={props.onShardingContinue} disabled={skew}>进入查询高峰</button>
          </div>
        </DecisionPanel>
      }
      case 'query':
        return <DecisionPanel title="查询请求 #Q-2817" description={`${queryScenario.request}。请求会先进入 CN，再由当前数据布局决定访问路径。`} actionLabel="执行查询" onAction={props.onQuery}><div className="cargo-manifest query-manifest"><span>QUERY</span><strong>USER #2817</strong><small>全部活动记录</small></div></DecisionPanel>
      case 'query-result':
        return <DecisionPanel title={state.queryNodes === 1 ? '查询直接命中 DN-02' : '三个 DN 同时参与查询'} description="数据放在哪里，会直接影响一次查询需要访问多少节点。" actionLabel="处理公共数据" onAction={props.onQueryContinue}><div className="result-metrics"><span><small>访问节点</small><b>{state.queryNodes}</b></span><span><small>数据搬运</small><b>{state.queryNodes === 1 ? '低' : '高'}</b></span><span><small>响应效率</small><b>{state.queryNodes === 1 ? '高' : '下降'}</b></span></div></DecisionPanel>
      case 'replication-small':
        return <DecisionPanel tone="gold" title="院系信息：小型高频数据" description="它目前只在 DN-01，但 DN-02 和 DN-03 都在频繁调用。如何保存更合适？" options={[
          { id: 'centralized', label: '集中保存', description: '只在 DN-01 保存一份', meta: '1 COPY' },
          { id: 'replicated', label: '每个 DN 都保存一份', description: '三个节点就近读取完整副本', meta: '3 COPIES' },
        ]} onSelect={(id) => props.onSmallReplication(id as ReplicationStrategy)}><div className="cargo-manifest gold-manifest"><span>PUBLIC DATA</span><strong>{replicationScenarios.publicData.name}</strong><small>体量小 · 访问频率高</small></div></DecisionPanel>
      case 'replication-small-result':
        return <DecisionPanel tone="gold" title={state.finalReplication === 'replicated' ? 'Replication Table 已建立' : '跨节点搬运仍在增加'} description={state.finalReplication === 'replicated' ? '每个数据节点都有完整的一份，公共查询可以就近完成。' : '集中保存节省了空间，但 DN-02 与 DN-03 需要持续访问 DN-01。'}><div className="flow-readout"><span>DN-02</span><i>→</i><span>{state.finalReplication === 'replicated' ? 'LOCAL COPY' : 'DN-01'}</span><span>DN-03</span><i>→</i><span>{state.finalReplication === 'replicated' ? 'LOCAL COPY' : 'DN-01'}</span></div><div className="dual-actions">{state.finalReplication !== 'replicated' && <button className="secondary-action" onClick={() => props.onSmallReplication('replicated')}>建立三个就近副本</button>}<button className="panel-action" onClick={props.onSmallContinue}>检查大型数据</button></div></DecisionPanel>
      case 'replication-large':
        return <DecisionPanel tone="warning" title="海量业务日志：2,000,000 条" description="复制表并不适合所有数据。为这批大型持续写入数据选择存储方式。" options={[
          { id: 'centralized', label: '保持分片存储', description: '不同日志继续分布在各个 DN', meta: 'SHARDED' },
          { id: 'replicated', label: '每个 DN 都保存全部', description: '三份完整日志持续同步', meta: '×3 STORAGE' },
        ]} onSelect={(id) => props.onLargeReplication(id as ReplicationStrategy)}><div className="cargo-manifest danger-manifest"><span>LARGE DATA</span><strong>{replicationScenarios.businessLogs.records.toLocaleString()}</strong><small>持续写入 · 体量巨大</small></div></DecisionPanel>
      case 'replication-large-result': {
        const copied = state.largeReplication === 'replicated'
        return <DecisionPanel tone={copied ? 'warning' : 'default'} title={copied ? '复制成本正在快速上升' : '大型数据保持分片存储'} description={copied ? '复制减少了部分访问，但存储、写入与同步成本同时上升。' : '不同数据需要不同存储策略。大型日志没有制造额外副本。'} actionLabel="进入 GTM 事件" onAction={props.onLargeContinue}><div className="cost-list"><span>存储占用 <b>{copied ? '↑↑↑' : '稳定'}</b></span><span>写入压力 <b>{copied ? '↑' : '均衡'}</b></span><span>同步成本 <b>{copied ? '↑' : '低'}</b></span></div></DecisionPanel>
      }
      case 'gtm':
        return <DecisionPanel title="多个 DN 正在共同处理事务" description="GTM 全局事务协调核心已连接。启动一次同步波纹，让参与节点获得一致的全局事务信息。" actionLabel="启动 GTM 同步" onAction={props.onGtm} />
      case 'final':
        return <DecisionPanel tone="warning" title="FINAL DISPATCH" description="写入、查询和公共数据访问同时达到峰值。组合已有机制，完成最后一次调度。" actionLabel="执行最终调度" onAction={props.onFinal} actionDisabled={!finalReady}>
          <div className="final-decisions">
            <ChoiceRow label="数据分片" value={state.finalChoices.sharding} options={[['id', '编号均衡'], ['status', '状态集中']]} onChange={(value) => props.onFinalChoice('sharding', value as DispatchStrategy)} />
            <ChoiceRow label="查询路径" value={state.finalChoices.query} options={[['targeted', '定向节点'], ['broadcast', '广播全部']]} onChange={(value) => props.onFinalChoice('query', value as 'targeted' | 'broadcast')} />
            <ChoiceRow label="公共小数据" value={state.finalChoices.publicData} options={[['replicated', '就近副本'], ['centralized', '集中读取']]} onChange={(value) => props.onFinalChoice('publicData', value as ReplicationStrategy)} />
          </div>
        </DecisionPanel>
      case 'final-result':
        return <DecisionPanel tone={state.systemStatus === 'OVERLOAD' ? 'warning' : 'default'} title={state.systemStatus ?? 'DISPATCH COMPLETE'} description={state.systemStatus === 'STABLE' ? '写入、查询与公共数据访问均已进入稳定路径。三个 DN 正在共同承接峰值流量。' : state.systemStatus === 'HIGH LOAD' ? '系统完成了峰值任务，但部分节点仍处于高负载。报告将标出可以优化的位置。' : '系统完成了峰值任务，节点出现明显过载。报告将还原本次关键决策。'} actionLabel="生成调度报告" onAction={props.onReport}><div className="result-metrics"><span><small>DN-01</small><b>{state.dnLoads[0]}%</b></span><span><small>DN-02</small><b>{state.dnLoads[1]}%</b></span><span><small>DN-03</small><b>{state.dnLoads[2]}%</b></span></div></DecisionPanel>
      default:
        return null
    }
  }

  return (
    <main className="game-page">
      <header className="game-topbar">
        <div className="brand-lockup compact"><span className="brand-symbol">TD</span><span><strong>TenDispatch</strong><small>LIVE SESSION</small></span></div>
        <div className="phase-readout"><span>{stageLabels[phaseGroup(state.phase) as keyof typeof stageLabels] ?? '系统运行'}</span><div><i style={{ '--progress': progressByPhase[state.phase] / 100 } as CSSProperties} /></div><b>{progressByPhase[state.phase]}%</b></div>
        <div className="player-chip"><span>OPERATOR</span><strong>{state.nickname}</strong></div>
      </header>
      <div className="game-layout">
        <section className="scene-column">
          <StatusPanel averageLoad={averageLoad} mode={state.cargoMode} status={state.systemStatus} />
          <LogisticsCenter state={state} />
          <NPCChannel message={state.npcMessage} />
        </section>
        <aside className="control-column">
          <div className="control-label"><span>CN / CONTROL INPUT</span><b>等待调度指令</b></div>
          {panel()}
          <button className="hint-button" onClick={props.onHint}><HintIcon /> 获取调度提示 <span>{state.hintCount > 0 ? `已使用 ${state.hintCount}` : '可选'}</span></button>
        </aside>
      </div>
    </main>
  )
}

function ChoiceRow({ label, value, options, onChange }: { label: string; value?: string; options: [string, string][]; onChange: (value: string) => void }) {
  return <div className="choice-row"><span>{label}</span><div>{options.map(([id, text]) => <button key={id} className={value === id ? 'is-selected' : ''} aria-pressed={value === id} onClick={() => onChange(id)}>{text}</button>)}</div></div>
}
