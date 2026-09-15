import { difficulties, type Difficulty } from '../../config/difficulty'
import type { CSSProperties } from 'react'
import type { GameRecord } from '../../services/GameRepository'
import { comboMultiplier } from '../../game/GameEngine'
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
  if (record.mode === 'ranked' || record.breakdown.mode === 'ranked') return <RankedResultPage record={record} onRanking={onRanking} onRestart={onRestart} />
  const { breakdown } = record
  const scoreLabel = breakdown.multiplier === 0
    ? '练习完成，不计积分'
    : `综合积分 ${breakdown.total}，本难度最高 ${breakdown.maximum ?? 100}`
  return (
    <main className="result-page">
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-symbol">TD</span><span><strong>OpenTenBase</strong><small>DISPATCH REPORT</small></span></div>
        <span className={`system-badge status-${record.behavior.systemStatus === 'STABLE' ? 'stable' : 'load'}`}><i /> {record.behavior.systemStatus ?? '报告已归档'}</span>
      </header>
      <section className="report-shell">
        <div className="score-hero">
          <div className="score-radar" role="img" aria-label={scoreLabel}><i aria-hidden="true" /><i aria-hidden="true" /><i aria-hidden="true" /><span className={breakdown.multiplier === 0 ? 'practice-label' : undefined}>{breakdown.multiplier === 0 ? '练习' : breakdown.total}</span></div>
          <div className="score-copy"><span>OpenTenBase 调度报告</span><h1>{breakdown.title}</h1><p>{breakdown.feedback}</p><div className="report-meta"><span>调度员 <b>{record.nickname}</b></span><span><ClockIcon /> {record.duration} 秒 · {difficulties[record.difficulty as Difficulty]?.label ?? '旧版'}</span></div></div>
        </div>
        <div className="report-grid">
          <section className="score-breakdown">
            <header><h2>能力维度</h2><span>{breakdown.multiplier === 0 ? '练习反馈 · 不计积分' : `基础表现 ${breakdown.baseTotal ?? breakdown.total} × ${breakdown.multiplier ?? 1} = ${breakdown.total} 积分`}</span></header>
            <ScoreRow label="报名分得均不均" score={breakdown.distribution} max={30} stars={stars(breakdown.distribution, 30)} />
            <ScoreRow label="找人问了几个仓库" score={breakdown.query} max={25} stars={stars(breakdown.query, 25)} />
            <ScoreRow label="大小数据怎么存" score={breakdown.replication} max={20} stars={stars(breakdown.replication, 20)} />
            <ScoreRow label="高峰是否稳定" score={breakdown.architecture} max={15} stars={stars(breakdown.architecture, 15)} />
            <ScoreRow label="独立完成" score={breakdown.independence} max={10} stars={stars(breakdown.independence, 10)} />
          </section>
          <section className="behavior-report">
            <header><h2>行为记录</h2><span>LOCAL RECORD</span></header>
            <dl><div><dt>额外流量压力</dt><dd>{record.sessionOptions ? `${record.sessionOptions.pressure}%` : '旧版未记录'}</dd></div>
              <div><dt>第一次报名分法</dt><dd>{strategyLabel(record.behavior.initialSharding)}</dd></div>
              <div><dt>最后采用的分法</dt><dd>{strategyLabel(record.behavior.finalSharding)}</dd></div>
              <div><dt>是否曾挤在一个仓库</dt><dd>{record.behavior.skewTriggered ? '是 · 后续可调整' : '否'}</dd></div>
              <div><dt>查找询问的仓库</dt><dd>{record.behavior.averageQueryNodes} 个</dd></div>
              <div><dt>院系名单存法</dt><dd>{replicationLabel(record.behavior.finalReplication)}</dd></div>
              <div><dt>提示使用次数</dt><dd>{record.behavior.hintCount} 次</dd></div>
            </dl>
          </section>
        </div>
        <p className="report-explanation">教程接管和启动协调不加分；正式任务的基础表现由分配 30、查询路径 25、存储选择 20、高峰稳定性 15、独立决策 10 构成，再乘难度倍率。查询得分反映之前的存放选择；首次选择和补救分别记录。挑战中每次提示扣 2 基础分，每次重新分配扣 2 基础分，独立决策最低为 0。当前难度倍率为：新手 ×0.75、简单 ×1、中等 ×1.5、高级 ×2。</p><p className="report-explanation">开放日任务结束，开源协作继续：你可以阅读 OpenTenBase 文档、复现问题、反馈缺陷，逐步参与社区贡献。</p><div className="report-actions"><button className="primary-button" onClick={onRanking}><TrophyIcon /> 进入数据调度榜 <ArrowIcon /></button><button className="secondary-action" onClick={onRestart}><RotateIcon /> 再次调度</button></div>
      </section>
      <footer className="result-footer"><span>电子科技大学成都学院开放原子开源社团</span><span>OpenTenBase 活动互动项目</span><a href="https://docs.opentenbase.org/" target="_blank" rel="noreferrer">了解 OpenTenBase <ArrowIcon /></a></footer>
    </main>
  )
}

function RankedResultPage({ record, onRanking, onRestart }: ResultPageProps) {
  const { breakdown } = record
  const waves = breakdown.waveScores ?? []
  const worst = breakdown.worstWave ?? record.behavior.worstWave
  const topDistance = record.distanceTop10 === undefined ? '—' : `${record.distanceTop10} 分`
  return <main className="result-page ranked-result-page">
    <header className="topbar"><div className="brand-lockup"><span className="brand-symbol">TD</span><span><strong>OpenTenBase</strong><small>RANKED DISPATCH REPORT · {record.dailySeed}</small></span></div><span className="system-badge status-stable"><i /> {record.behavior.systemStatus ?? '调度完成'}</span></header>
    <section className="report-shell">
      <section className="ranked-score-hero"><div><span>本局 Ranked 成绩</span><strong>{record.score}</strong><small>基础波次分 {breakdown.baseTotal ?? 0} · Combo 加成后</small></div><div className="ranked-placement"><p>个人最佳 <b>{record.personalBest ?? record.score}</b></p><p>本机今日排名 <b>#{record.rank ?? '—'}</b></p><p>距 TOP 10 <b>{topDistance}</b></p></div></section>
      <div className="ranked-result-grid"><div className="ranked-result-stat"><span>PERFECT 波次</span><strong>{record.behavior.perfectCount ?? breakdown.perfectCount ?? 0}</strong><small>/ 14</small></div><div className="ranked-result-stat"><span>最大 Combo</span><strong>×{comboMultiplier(record.behavior.maxCombo ?? breakdown.maxCombo ?? 0).toFixed(2)}</strong><small>{record.behavior.maxCombo ?? breakdown.maxCombo ?? 0} 波连续优秀</small></div><div className="ranked-result-stat"><span>平均决策</span><strong>{breakdown.averageDecisionMs ?? 0}<small> ms</small></strong><small>速度只占 10%</small></div><div className="ranked-result-stat"><span>最多失分</span><strong>Wave {worst?.wave ?? '—'}</strong><small>{worst?.reason ?? '保持连续观察'}</small></div></div>
      <div className="ranked-wave-table"><header><h2>14 波调度回放</h2><span>Score / Grade / Combo</span></header>{waves.map((wave) => <div className={`ranked-wave-row grade-${wave.grade.toLowerCase()}`} key={`${wave.wave}-${wave.strategy}`}><b>W{String(wave.wave).padStart(2, '0')}</b><span>{wave.grade}</span><span>{wave.strategy}</span><i><em style={{ width: `${wave.score.total}%` }} /></i><strong>{wave.score.total}</strong><small>{wave.combo > 0 ? `×${wave.multiplier.toFixed(2)}` : '清零'}</small></div>)}</div>
      <p className="next-improvement"><b>下一局最容易提升：</b>{breakdown.feedback}</p>
      <div className="report-actions"><button className="primary-button" onClick={onRestart}><RotateIcon /> 再挑战一次</button><button className="secondary-action" onClick={onRanking}><TrophyIcon /> 查看今日榜</button></div>
    </section>
    <footer className="result-footer"><span>本机排行榜 · Daily Seed 保证同日波次一致</span><span>教程成绩不会进入 Ranked</span><a href="https://docs.opentenbase.org/" target="_blank" rel="noreferrer">了解 OpenTenBase <ArrowIcon /></a></footer>
  </main>
}

function ScoreRow({ label, score, max, stars: starText }: { label: string; score: number; max: number; stars: string }) {
  return <div className="score-row"><span>{label}</span><b>{starText}</b><div><i style={{ '--score': score / max } as CSSProperties} /></div><strong>{score}<small>/{max}</small></strong></div>
}

const strategyLabel = (strategy?: string) => strategy === 'id' ? '按编号分配' : strategy === 'region' ? '按地区分配' : strategy === 'status' ? '按状态分配' : '—'
const replicationLabel = (strategy?: string) => strategy === 'replicated' ? '三个仓库各存一份' : strategy === 'centralized' ? '只在一个仓库存一份' : '—'
