import { npcConfig } from '../../config/npcConfig'
export function NPCChannel({ message, compact = false }: { message: string; compact?: boolean }) {
  return <aside className={`npc-channel${compact ? ' is-compact' : ''}`} aria-live="polite"><div className="npc-avatar hologram-avatar"><img src={npcConfig.avatarSrc} alt={npcConfig.avatarAlt}/><i/></div><div className="npc-content"><header>科成-开放原子开源社团联络员 <span>在线</span></header><p>{message}</p><small>科成-开放原子开源社团</small></div></aside>
}
