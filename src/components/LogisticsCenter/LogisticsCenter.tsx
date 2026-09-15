import { useEffect, useState } from 'react'
import type { GameState } from '../../game/GameState'
const routes = [390, 960, 1530].map(x => `M960 410 C960 485 ${x} 485 ${x} 610`)
interface Props { state: Pick<GameState, 'dnLoads' | 'cargoMode' | 'queryNodes' | 'systemStatus'>; preview?: boolean; replicaDataset?: 'public' | 'logs' }
export function LogisticsCenter({ state, preview = false, replicaDataset = 'public' }: Props) {
  const [reduce, setReduce] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => { const m = matchMedia('(prefers-reduced-motion: reduce)'); const fn = () => setReduce(m.matches); m.addEventListener('change', fn); return () => m.removeEventListener('change', fn) }, [])
  const mode = state.cargoMode
  const active = mode !== 'idle'
  const replication = mode === 'replicate'
  const sync = mode === 'sync'
  const color = mode === 'query' ? '#FF9F43' : replication ? '#FFD166' : '#32C7F4'
  const skew = Math.max(...state.dnLoads) - Math.min(...state.dnLoads) > 35
  return <section className={`dispatch-scene ${preview ? 'preview' : ''}`} aria-label="OpenTenBase 数据物流中心">
    <svg viewBox="0 90 1920 730" role="img" aria-label={`CN 调度到三个 DN，负载 ${state.dnLoads.join('、')}%。${skew ? '检测到数据倾斜' : ''}`}>
      <defs><pattern id="floorGrid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#9fcdf5" strokeOpacity=".05"/></pattern></defs>
      <rect x="0" y="90" width="1920" height="730" fill="url(#floorGrid)"/>
      <g fill="none" stroke="#32C7F4" opacity=".06"><path d="M80 190H540L610 260V420M1840 390H1770V480H1660M80 760V500H170"/><path d="M80 800H1840"/></g>
      <text x="80" y="135" className="scene-caption">OPEN TENBASE / LIVE DATA FLOOR</text>
      <text x="80" y="162" className="scene-sub">写入数据 · 查询请求 · 公共副本</text>
      <g className="intake-panel"><rect x="760" y="110" width="400" height="80" rx="4"/><text x="960" y="144" textAnchor="middle">INCOMING DATA / 数据入口</text><text x="960" y="174" textAnchor="middle" className="scene-sub">{active ? '数据沿固定轨道进入协调节点' : '数据待命 · 等待你的调度策略'}</text></g>
      {[920,960,1000].map(x => <path key={x} d={`M${x} 190V225Q${x} 245 960 250`} stroke="#235272" strokeWidth="8" fill="none"/>)}
      {active && !sync && mode !== 'query' && !replication && Array.from({length: 9}, (_, i) => <rect key={i} x="-13" y="-9" width="26" height="18" rx="2" fill={color} opacity={reduce ? 0 : .8}><animateMotion path={`M${920+(i%3)*40} 190V225Q${920+(i%3)*40} 245 960 250`} dur="1.2s" begin={`${-Math.floor(i/3) * .4}s`} repeatCount="indefinite"/></rect>)}
      {routes.map((path, i) => { const lit = active && !sync && (mode !== 'query' || state.queryNodes !== 1 || i === 1); return <g key={path}>
        <path d={path} fill="none" stroke="#16344b" strokeWidth="8"/>
        <path className={lit ? 'output-live' : ''} style={{animationDelay:`${i*.18}s`}} d={path} fill="none" stroke={lit ? color : '#264862'} strokeWidth="3" opacity={lit ? .8 : .5}/>
        {lit && !reduce && Array.from({length: 1}, (_, j) => <g key={`${mode}-${j}`}>
          {mode === 'query' ? <circle r="6" fill={color}><animateMotion path={path} dur="1.2s" repeatCount="indefinite"/></circle> : <rect x={replication ? -17 : -13} y={replication ? -12 : -9} width={replication ? 34 : 26} height={replication ? 24 : 18} rx="2" fill={color}><animateMotion path={path} dur={replication ? '.9s' : Math.max(...state.dnLoads) >= 80 ? '.7s' : '1.2s'} begin={replication ? '.7s' : `${-j * .6}s`} repeatCount={replication ? '1' : 'indefinite'} fill="freeze"/></rect>}
        </g>)}
      </g> })}
      <g className={`coordinator ${active ? 'active' : ''}`}><rect x="760" y="250" width="400" height="160" rx="6" fill="#0D2138" stroke="#32C7F4" strokeWidth="2"/>
        <path d="M775 275V265H800M1120 395H1145V380" stroke="#32C7F4" fill="none" strokeWidth="3"/>
        <circle cx="960" cy="320" r="52" fill="none" stroke="#2c6b91" strokeDasharray="45 10" className={active ? 'cn-spin' : ''}/>
        <circle cx="960" cy="320" r="44" fill={active ? '#14435a' : '#10283D'} stroke="#32C7F4"/>
        <text x="960" y="332" textAnchor="middle" className="cn-title">CN</text>
        <text x="790" y="322" className="scene-sub">协调节点</text><text x="1040" y="322" className="scene-sub">{active ? '调度中' : '待命'}</text>
        <text x="960" y="392" textAnchor="middle" className="scene-sub">COORDINATOR NODE</text>
        {[790, 1130].map(x => <circle key={x} cx={x} cy="350" r="4" fill={active ? '#32C7F4' : '#35516a'}/>)}
        {[930, 960, 990].map(x => <rect key={x} x={x-7} y="405" width="14" height="8" fill={active ? color : '#35516a'}/>)}
        {replication && <rect className="replica-origin" x="943" y="308" width="34" height="24" fill="#FFD166"/>}
        {replication && !reduce && [-1,0,1].map(i => <rect key={i} x="-17" y="-12" width="34" height="24" fill="#FFD166" className="replica-splinter"><animateMotion path={`M960 320Q${960+i*65} 370 960 410`} begin=".3s" dur=".4s" fill="freeze"/></rect>)}
      </g>
      {state.dnLoads.map((load, i) => { const x = 210 + i * 570; const tint = load >= 95 ? '#FF625C' : load >= 80 ? '#FF9F43' : load >= 60 ? '#FFD166' : '#32C7F4'; return <g key={i}>
        {skew && load === Math.max(...state.dnLoads) && Array.from({length: Math.min(6, 3 + Math.floor((load-60)/10))}, (_, j) => <rect key={j} x={x+142+(j%3)*28} y={554-Math.floor(j/3)*22} width="26" height="18" fill={tint}/>)}
        <rect className={load >= 80 ? 'warehouse-pulse' : ''} x={x} y="590" width="360" height="180" fill="#0B1728" stroke={tint} strokeOpacity=".7"/>
        <text x={x+20} y="617" className="dn-title">DN-0{i+1}</text><text x={x+111} y="617" className="scene-sub">DATA NODE</text>
        <circle className={load >= 95 ? 'critical-light' : ''} cx={x+332} cy="612" r="5" fill={tint}/>
        <path d={`M${x} 630h360`} stroke="#22405a"/>
        {Array.from({length:24}, (_, j) => <rect key={j} x={x+20+(j%8)*40} y={646+Math.floor(j/8)*23} width="30" height="15" rx="1" fill={j < Math.round(load/100*24) ? tint : '#142c43'} opacity={j < Math.round(load/100*24) ? .7 : .8}/>)}
        <text x={x+20} y="733" className="scene-sub">节点负载</text><text x={x+335} y="733" textAnchor="end" fill={tint}>{load}%</text>
        <rect x={x+20} y="746" width="320" height="12" fill="#142c43"/><rect x={x+20} y="746" width={320*load/100} height="12" fill={tint} className="load-fill"/>
        {replication && <g className="replica-arrival"><rect x={x+298} y="648" width="34" height="24" fill="#FFD166"/><text x={x+20} y="792" fill="#FFD166" className="scene-sub">{replicaDataset === 'logs' ? '海量日志副本 · 三倍存储代价' : '公共数据副本已就位'}</text></g>}
      </g> })}
      <g opacity={sync ? 1 : .35}><rect x="1650" y="130" width="160" height="140" fill="none" stroke="#345776"/><circle cx="1730" cy="184" r="32" fill="#10243B" stroke="#8BBAD8"/><circle cx="1730" cy="184" r="6" fill="#9ee9ff"/><text x="1730" y="245" textAnchor="middle" className="scene-sub">GTM / 全局事务</text>
        {sync && <>{[0, 1].map(i => <circle key={i} className="sync-ring" style={{animationDelay:`${i*.6}s`}} cx="1730" cy="184" r="32" fill="none" stroke="#9ee9ff"/>)}{[390,960,1530].map(x => <path key={x} d={`M1730 220Q1730 450 ${x} 590`} fill="none" stroke="#9ee9ff" strokeWidth="1" className="sync-line"/>)}</>}
      </g>
      {skew && <g className="skew-banner"><rect x="210" y="300" width="360" height="64" fill="#332719" stroke="#FF9F43"/><text x="390" y="326" textAnchor="middle" fill="#FF9F43">DATA SKEW DETECTED</text><text x="390" y="352" textAnchor="middle" className="scene-sub">检测到数据倾斜 · 注意入口排队</text></g>}
      {mode === 'query' && <g><rect x="1450" y="340" width="260" height="120" fill="#1C201F" stroke="#92623B"/>{[`访问节点：${state.queryNodes || 3}/3`, `跨节点搬运：${state.queryNodes === 1 ? '低' : '高'}`, `查询效率：${state.queryNodes === 1 ? '快' : '慢'}`].map((text,i) => <text key={text} x="1470" y={370+i*32} className="scene-sub">{text}</text>)}</g>}
    </svg>
  </section>
}
