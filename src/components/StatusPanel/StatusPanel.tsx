import { DatabaseIcon, SignalIcon } from '../icons'

interface StatusPanelProps {
  averageLoad: number
  mode: string
  status?: string
}

export function StatusPanel({ averageLoad, mode, status }: StatusPanelProps) {
  return (
    <div className="status-strip">
      <div><SignalIcon /><span>集群状态</span><strong className={status === 'OVERLOAD' ? 'danger-text' : ''}>{status ?? 'ONLINE'}</strong></div>
      <div><DatabaseIcon /><span>平均负载</span><strong>{averageLoad}%</strong></div>
      <div className="desktop-only"><span>当前链路</span><strong>{mode === 'query' ? 'QUERY' : mode === 'sync' ? 'GTM SYNC' : mode === 'replicate' ? 'REPLICATION' : 'DATA WRITE'}</strong></div>
    </div>
  )
}
