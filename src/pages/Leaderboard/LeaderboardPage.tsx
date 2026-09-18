import { useMemo, useState } from 'react'
import type { GameRecord } from '../../services/GameRepository'
import { bestRecordPerNickname } from '../../services/leaderboard'
import { ArrowIcon, ClockIcon, RotateIcon, TrophyIcon } from '../../components/icons'

interface LeaderboardPageProps {
  records: GameRecord[]
  onHome: () => void
  onRestart: () => void
}

export function LeaderboardPage({ records, onHome, onRestart }: LeaderboardPageProps) {
  const [view, setView] = useState<'today' | 'overall'>('today')
  const rankedRecords = records.filter((record) => record.mode === 'ranked' || record.breakdown.mode === 'ranked')
  const visibleRecords = useMemo(() => {
    const seed = new Date()
    const seedLabel = `TD-${seed.getFullYear()}${String(seed.getMonth() + 1).padStart(2, '0')}${String(seed.getDate()).padStart(2, '0')}`
    const scoped = view === 'today' ? rankedRecords.filter((record) => record.dailySeed === seedLabel) : rankedRecords
    return bestRecordPerNickname(scoped)
  }, [rankedRecords, view])
  return <main className="ranking-page">
    <header className="topbar"><button className="brand-lockup brand-button" onClick={onHome}><span className="brand-symbol">TD</span><span><strong>OpenTenBase</strong><small>RANKING CONSOLE</small></span></button><button className="text-button" onClick={onHome}>返回首页 <ArrowIcon /></button></header>
    <section className="ranking-shell">
      <header className="ranking-heading"><div><TrophyIcon /><span>同一 Daily Seed · 本机记录</span></div><h1>数据调度榜</h1><p>同一个呼号只占一行，取其中最好的一局。排序按总分，同分时比较 PERFECT 数量、最大 Combo、完成时间和平均决策速度。联网总榜接入后可复用同一记录协议。</p></header>
      <div className="ranking-tabs" role="tablist"><button className={view === 'today' ? 'is-active' : ''} onClick={() => setView('today')}>今日榜</button><button className={view === 'overall' ? 'is-active' : ''} onClick={() => setView('overall')}>总榜</button><span>我的最佳：{myBest(visibleRecords) ?? '—'}</span></div>
      <div className="ranking-table" role="table" aria-label="TenDispatch Ranked 本机排行榜">
        <div className="ranking-row ranking-header" role="row"><span role="columnheader">排名</span><span role="columnheader">调度员</span><span role="columnheader">PERFECT / Combo</span><span role="columnheader">完成时间</span><span role="columnheader">积分</span></div>
        {visibleRecords.length === 0 ? <div className="ranking-empty"><TrophyIcon /><strong>{view === 'today' ? '今日榜还在等第一局' : '调度席位仍然空着'}</strong><p>完成一局 Ranked，14 波回放和你的最佳成绩会出现在这里。</p><button className="primary-button" onClick={onRestart}>开始 Ranked <ArrowIcon /></button></div> : visibleRecords.slice(0, 100).map((record, index) => <div className={`ranking-row ${index < 3 ? 'top-rank' : ''}`} role="row" key={record.id}><span role="cell" className="rank-number">{String(index + 1).padStart(2, '0')}</span><strong role="cell">{record.nickname}</strong><span role="cell">{record.behavior.perfectCount ?? record.breakdown.perfectCount ?? 0} PERFECT · ×{comboLabel(record.behavior.maxCombo ?? record.breakdown.maxCombo ?? 0)}</span><span role="cell"><ClockIcon /> {record.duration}s</span><b role="cell">{record.score}</b></div>)}
      </div>
      <button className="primary-button ranking-restart" onClick={onRestart}><RotateIcon /> 发起新调度</button>
    </section>
  </main>
}

const comboLabel = (combo: number) => combo >= 5 ? '1.50' : combo === 4 ? '1.30' : combo === 3 ? '1.20' : combo === 2 ? '1.10' : '1.00'

const myBest = (records: GameRecord[]) => records.length ? Math.max(...records.map((record) => record.score)) : undefined
