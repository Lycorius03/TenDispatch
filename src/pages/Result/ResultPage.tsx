import type { CSSProperties } from 'react'
import type { GameRecord } from '../../services/GameRepository'
import { ArrowIcon, ClockIcon, RotateIcon, TrophyIcon } from '../../components/icons'

interface ResultPageProps {
  record: GameRecord
  onRanking: () => void
  onRestart: () => void
}

const stars = (score: number, max: number) => {
  const count = Math.max(1, Math.round((score / max) * 5))
  return `${'★'.repeat(count)}${'☆'.repeat(5 - count)}`
}

export function ResultPage({ record, onRanking, onRestart }: ResultPageProps) {
  const { breakdown } = record
  return (
    <main className="result-page">
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-symbol">TD</span><span><strong>TenDispatch</strong><small>DISPATCH REPORT</small></span></div>
        <span className={`system-badge status-${record.behavior.systemStatus === 'STABLE' ? 'stable' : 'load'}`}><i /> {record.behavior.systemStatus ?? '报告已归档'}</span>
      </header>
      <section className="report-shell">
        <div className="score-hero">
          <div className="score-radar" role="img" aria-label={`综合评分 ${breakdown.total} 分，满分 100 分`}><i aria-hidden="true" /><i aria-hidden="true" /><i aria-hidden="true" /><span>{breakdown.total}</span></div>
          <div className="score-copy"><span>TENDISPATCH 调度报告</span><h1>{breakdown.title}</h1><p>{breakdown.feedback}</p><div className="report-meta"><span>调度员 <b>{record.nickname}</b></span><span><ClockIcon /> {record.duration} 秒</span></div></div>
        </div>
        <div className="report-grid">
          <section className="score-breakdown">
            <header><h2>能力维度</h2><span>总分 100</span></header>
            <ScoreRow label="数据分布" score={breakdown.distribution} max={30} stars={stars(breakdown.distribution, 30)} />
            <ScoreRow label="查询调度" score={breakdown.query} max={25} stars={stars(breakdown.query, 25)} />
            <ScoreRow label="资源策略" score={breakdown.replication} max={20} stars={stars(breakdown.replication, 20)} />
            <ScoreRow label="架构认知" score={breakdown.architecture} max={15} stars={stars(breakdown.architecture, 15)} />
            <ScoreRow label="独立决策" score={breakdown.independence} max={10} stars={stars(breakdown.independence, 10)} />
          </section>
          <section className="behavior-report">
            <header><h2>行为记录</h2><span>LOCAL RECORD</span></header>
            <dl>
              <div><dt>首次分片策略</dt><dd>{strategyLabel(record.behavior.initialSharding)}</dd></div>
              <div><dt>最终分片策略</dt><dd>{strategyLabel(record.behavior.finalSharding)}</dd></div>
              <div><dt>触发数据倾斜</dt><dd>{record.behavior.skewTriggered ? '是 · 已观察' : '否'}</dd></div>
              <div><dt>查询平均触碰 DN</dt><dd>{record.behavior.averageQueryNodes} 个</dd></div>
              <div><dt>小型数据策略</dt><dd>{replicationLabel(record.behavior.finalReplication)}</dd></div>
              <div><dt>提示使用次数</dt><dd>{record.behavior.hintCount} 次</dd></div>
            </dl>
          </section>
        </div>
        <div className="report-actions"><button className="primary-button" onClick={onRanking}><TrophyIcon /> 进入数据调度榜 <ArrowIcon /></button><button className="secondary-action" onClick={onRestart}><RotateIcon /> 再次调度</button></div>
      </section>
      <footer className="result-footer"><span>电子科技大学成都学院开放原子开源社团</span><span>OpenTenBase 活动互动项目</span><a href="https://docs.opentenbase.org/" target="_blank" rel="noreferrer">了解 OpenTenBase <ArrowIcon /></a></footer>
    </main>
  )
}

function ScoreRow({ label, score, max, stars: starText }: { label: string; score: number; max: number; stars: string }) {
  return <div className="score-row"><span>{label}</span><b>{starText}</b><div><i style={{ '--score': score / max } as CSSProperties} /></div><strong>{score}<small>/{max}</small></strong></div>
}

const strategyLabel = (strategy?: string) => strategy === 'id' ? '按编号分配' : strategy === 'region' ? '按地区分配' : strategy === 'status' ? '按状态分配' : '—'
const replicationLabel = (strategy?: string) => strategy === 'replicated' ? '每个 DN 保存副本' : strategy === 'centralized' ? '集中保存' : '—'
