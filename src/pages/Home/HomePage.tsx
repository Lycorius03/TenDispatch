import { useState } from 'react'
import type { GameState } from '../../game/GameState'
import { LogisticsCenter } from '../../components/LogisticsCenter/LogisticsCenter'
import { getDailySeed, randomNickname, sessionModes, type SessionMode, type SessionOptions } from '../../config/difficulty'

interface HomePageProps {
  previewState: Pick<GameState, 'dnLoads' | 'cargoMode' | 'queryNodes' | 'systemStatus'>
  onStart: (nickname: string, options: SessionOptions) => void
  onRanking: () => void
  playerNickname?: string
  onNicknameChange?: (nickname: string) => void
  onRandomNickname?: () => string
}

export function HomePage({ previewState, onStart, onRanking, playerNickname, onNicknameChange, onRandomNickname }: HomePageProps) {
  const [nickname, setNickname] = useState(() => playerNickname ?? randomNickname())
  const [mode, setMode] = useState<Exclude<SessionMode, 'legacy'>>('ranked')
  const selected = sessionModes[mode]
  return <main className="home-page">
    <header className="topbar"><div className="brand-lockup"><span className="brand-symbol">TD</span><span><strong>OpenTenBase 数据调度中心</strong><small>TenDispatch · 科成-开放原子开源社团</small></span></div><button className="text-button" onClick={onRanking}>查看排行榜</button></header>
    <section className="home-stage"><div className="home-copy">
      <span className="system-ready"><i /> DISPATCH NETWORK ONLINE</span>
      <h1>首席调度官，<br/><span>让数据跑得更聪明。</span></h1>
      <p>在 OpenTenBase 数据物流中心中连续调度 14 波数据。观察三个 DN 的负载、查询触达节点数和跨节点搬运成本，在状态继承与 Combo 倍率之间冲击更高排名。</p>
      <form className="entry-form" onSubmit={e => { e.preventDefault(); if (nickname.trim()) onStart(nickname.trim(), { mode, dailySeed: getDailySeed(), difficulty: mode === 'tutorial' ? 'novice' : 'easy', pressure: 0, guide: mode === 'tutorial' }) }}>
        <label htmlFor="nickname">你的调度呼号 <small>必填 · 本机成绩会保留最佳记录</small></label>
        <div className="input-line"><input id="nickname" required maxLength={18} value={nickname} onChange={e => { const value = e.target.value; setNickname(value); onNicknameChange?.(value) }} placeholder="请输入昵称" autoComplete="off"/><button type="button" className="secondary-action" onClick={() => { const next = onRandomNickname?.() ?? randomNickname(); setNickname(next); onNicknameChange?.(next) }}>随机呼号</button></div>
        <fieldset className="mode-picker"><legend>选择调度模式</legend><div className="mode-cards">{(Object.keys(sessionModes) as Array<Exclude<SessionMode, 'legacy'>>).map((id) => <button type="button" key={id} aria-pressed={mode === id} onClick={() => setMode(id)}><span>{id === 'ranked' ? 'RANKED' : 'TUTORIAL'}</span><strong>{sessionModes[id].label}</strong><small>{sessionModes[id].description}</small></button>)}</div></fieldset>
        <p className="daily-seed-line">今日 Daily Seed <b>{getDailySeed()}</b> · 所有 Ranked 玩家使用同一波次顺序</p>
        <button className="primary-button" type="submit" disabled={!nickname.trim()}>{mode === 'ranked' ? '进入 Ranked 极速调度 →' : '开始新手教学 →'}</button>
      </form>
      <p className="entry-note">{selected.description}。速度只占每波 10%，更重要的是持续观察状态、处理目标冲突。高级玩家可用 Combo 冲过 1400 基础分。</p>
    </div><div className="home-scene-wrap"><LogisticsCenter state={previewState} preview/><p className="preview-caption">CN 中央调度 / DN 保存与处理 / GTM 自动协调</p></div></section>
    <footer className="home-footer">教程不计分 <span>·</span> Ranked 90 秒 / 14 波 <span>·</span> Final Rush 最后 20 秒提高决策密度</footer>
  </main>
}
