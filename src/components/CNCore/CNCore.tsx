interface CNCoreProps {
  active: boolean
  mode: string
}

export function CNCore({ active, mode }: CNCoreProps) {
  return (
    <div className={`cn-core ${active ? 'is-active' : ''}`} aria-label={`协调节点 CN，当前模式 ${mode}`}>
      <div className="cn-rings" aria-hidden="true"><i /><i /><i /></div>
      <div className="cn-body">
        <span className="node-type">COORDINATOR</span>
        <strong>CN</strong>
        <span className="node-state">{active ? 'ROUTING' : 'STANDBY'}</span>
      </div>
    </div>
  )
}
