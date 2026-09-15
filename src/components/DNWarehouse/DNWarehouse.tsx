interface DNWarehouseProps {
  id: number
  load: number
  active: boolean
  query: boolean
}

export function DNWarehouse({ id, load, active, query }: DNWarehouseProps) {
  const state = load >= 85 ? 'danger' : load >= 70 ? 'warning' : 'normal'
  const blocks = Math.max(2, Math.round(load / 10))
  return (
    <article className={`dn-warehouse state-${state} ${active ? 'is-active' : ''} ${query ? 'is-querying' : ''}`} aria-label={`DN-0${id} 数据节点，负载 ${load}%`}>
      <header>
        <div>
          <span className="node-type">DATA NODE</span>
          <strong>DN-0{id}</strong>
        </div>
        <span className="status-light"><i />{state === 'danger' ? '拥堵' : state === 'warning' ? '高负载' : '稳定'}</span>
      </header>
      <div className="warehouse-bay" aria-hidden="true">
        <div className="bay-grid">
          {Array.from({ length: blocks }, (_, index) => <i key={index} style={{ '--delay': `${index * 40}ms` } as CSSProperties} />)}
        </div>
      </div>
      <footer>
        <div className="load-copy"><span>节点负载</span><b>{load}%</b></div>
        <div className="load-track"><i style={{ '--load': load / 100 } as CSSProperties} /></div>
      </footer>
    </article>
  )
}
import type { CSSProperties } from 'react'
