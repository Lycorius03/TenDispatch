import type { GameRecord } from '../../services/GameRepository'
import { ArrowIcon, ClockIcon, RotateIcon, TrophyIcon } from '../../components/icons'

interface LeaderboardPageProps {
  records: GameRecord[]
  onHome: () => void
  onRestart: () => void
}

export function LeaderboardPage({ records, onHome, onRestart }: LeaderboardPageProps) {
  return (
    <main className="ranking-page">
      <header className="topbar">
        <button className="brand-lockup brand-button" onClick={onHome}><span className="brand-symbol">TD</span><span><strong>TenDispatch</strong><small>RANKING</small></span></button>
        <button className="text-button" onClick={onHome}>返回首页 <ArrowIcon /></button>
      </header>
      <section className="ranking-shell">
        <header className="ranking-heading"><div><TrophyIcon /><span>本机排行榜</span></div><h1>数据调度榜</h1><p>优先比较总分；同分时，提示更少、完成更快的调度员排名靠前。</p></header>
        <div className="ranking-table" role="table" aria-label="TenDispatch 本地排行榜">
          <div className="ranking-row ranking-header" role="row"><span role="columnheader">排名</span><span role="columnheader">调度员</span><span role="columnheader">称号</span><span role="columnheader">完成时间</span><span role="columnheader">总分</span></div>
          {records.length === 0 ? <div className="ranking-empty"><TrophyIcon /><strong>调度席位仍然空着</strong><p>完成一次 TenDispatch，第一份报告就会出现在这里。</p><button className="primary-button" onClick={onRestart}>开始第一次调度 <ArrowIcon /></button></div> : records.slice(0, 20).map((record, index) => (
            <div className={`ranking-row ${index < 3 ? 'top-rank' : ''}`} role="row" key={record.id}>
              <span role="cell" className="rank-number">{String(index + 1).padStart(2, '0')}</span>
              <strong role="cell">{record.nickname}</strong>
              <span role="cell">{record.title}</span>
              <span role="cell"><ClockIcon /> {record.duration} 秒</span>
              <b role="cell">{record.score}</b>
            </div>
          ))}
        </div>
        {records.length > 0 && <button className="primary-button ranking-restart" onClick={onRestart}><RotateIcon /> 发起新调度</button>}
      </section>
    </main>
  )
}
