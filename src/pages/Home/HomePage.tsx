import { useState } from 'react'
import type { GameState } from '../../game/GameState'
import { LogisticsCenter } from '../../components/LogisticsCenter/LogisticsCenter'
import { ArrowIcon, PlayIcon, TrophyIcon } from '../../components/icons'

interface HomePageProps {
  previewState: Pick<GameState, 'dnLoads' | 'cargoMode' | 'queryNodes' | 'systemStatus'>
  onStart: (nickname: string) => void
  onAnonymous: () => void
  onRanking: () => void
}

export function HomePage({ previewState, onStart, onAnonymous, onRanking }: HomePageProps) {
  const [nickname, setNickname] = useState('')
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (nickname.trim()) onStart(nickname.trim().slice(0, 18))
    else onAnonymous()
  }

  return (
    <main className="home-page">
      <header className="topbar">
        <a className="brand-lockup" href="./" aria-label="TenDispatch 首页"><span className="brand-symbol">TD</span><span><strong>TenDispatch</strong><small>OpenTenBase 数据调度中心</small></span></a>
        <button className="text-button" onClick={onRanking}><TrophyIcon /> 数据调度榜</button>
      </header>

      <section className="home-stage">
        <div className="home-copy">
          <div className="system-ready"><i /> SYSTEM READY · CN-01</div>
          <h1>数据来了，<br />送到<span>正确的地方。</span></h1>
          <p>进入未来数据物流中心，亲手调度 OpenTenBase 集群。看见每一次分配如何改变节点压力、查询路径与系统效率。</p>
          <form className="entry-form" onSubmit={submit}>
            <label htmlFor="nickname">调度员昵称</label>
            <div className="input-line">
              <input id="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={18} placeholder="输入昵称，或匿名进入" autoComplete="off" />
              <button className="primary-button" type="submit"><PlayIcon /> 接入调度中心</button>
            </div>
            <button className="anonymous-button" type="button" onClick={onAnonymous}>匿名调度 <ArrowIcon /></button>
          </form>
          <div className="maker-line"><span>PROJECT BY</span><strong>电子科技大学成都学院<br />开放原子开源社团</strong></div>
        </div>
        <div className="home-scene-wrap">
          <div className="scene-callout callout-cn"><span>01</span><p><b>CN</b>接收并规划全部数据流</p></div>
          <div className="scene-callout callout-dn"><span>03</span><p><b>DN</b>共同保存并处理数据</p></div>
          <LogisticsCenter state={previewState} preview />
        </div>
      </section>
      <footer className="home-footer"><span>SHARDING</span><i /><span>QUERY ROUTING</span><i /><span>REPLICATION</span><i /><span>GTM</span></footer>
    </main>
  )
}
