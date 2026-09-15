import { SignalIcon } from '../icons'
import { npcConfig } from '../../config/npcConfig'

interface NPCChannelProps {
  message: string
  compact?: boolean
}

export function NPCChannel({ message, compact = false }: NPCChannelProps) {
  return (
    <aside className={`npc-channel ${compact ? 'is-compact' : ''}`} aria-live="polite">
      <div className="npc-avatar"><img src={npcConfig.avatarSrc} alt={npcConfig.avatarAlt} /><i /></div>
      <div className="npc-content">
        <header><span><SignalIcon /> 通讯频道</span><i>LIVE</i></header>
        <p>{message}</p>
        <small>{npcConfig.shortName}</small>
      </div>
    </aside>
  )
}
