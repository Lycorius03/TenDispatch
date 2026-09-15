import type { GameState } from '../../game/GameState'
import { CNCore } from '../CNCore/CNCore'
import { DNWarehouse } from '../DNWarehouse/DNWarehouse'
import { GTMCore } from '../GTMCore/GTMCore'
import { TransportTrack } from '../TransportTrack/TransportTrack'

interface LogisticsCenterProps {
  state: Pick<GameState, 'dnLoads' | 'cargoMode' | 'queryNodes' | 'systemStatus'>
  preview?: boolean
}

export function LogisticsCenter({ state, preview = false }: LogisticsCenterProps) {
  const active = state.cargoMode !== 'idle'
  return (
    <section className={`logistics-center ${preview ? 'is-preview' : ''}`} aria-label="OpenTenBase 数据物流中心">
      <div className="scene-grid" aria-hidden="true" />
      <div className="scene-heading"><span>OTB / CLUSTER MAP</span><b>03 DATA NODES</b></div>
      <GTMCore active={state.cargoMode === 'sync' || state.cargoMode === 'final'} />
      <div className="cn-position"><CNCore active={active} mode={state.cargoMode} /></div>
      <TransportTrack mode={state.cargoMode} queryNodes={state.queryNodes} />
      <div className="dn-row">
        {state.dnLoads.map((load, index) => (
          <DNWarehouse key={index} id={index + 1} load={load} active={active && (state.cargoMode !== 'query' || state.queryNodes === 3 || index === 1)} query={state.cargoMode === 'query'} />
        ))}
      </div>
    </section>
  )
}
