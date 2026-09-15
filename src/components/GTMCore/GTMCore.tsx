interface GTMCoreProps {
  active: boolean
}

export function GTMCore({ active }: GTMCoreProps) {
  return (
    <div className={`gtm-core ${active ? 'is-active' : ''}`} aria-label={`GTM 全局事务协调核心，${active ? '同步中' : '待命'}`}>
      <div className="gtm-mark"><i /><span>GTM</span></div>
      <div><strong>GLOBAL TX</strong><span>{active ? 'SYNC PULSE' : 'LINK READY'}</span></div>
    </div>
  )
}
