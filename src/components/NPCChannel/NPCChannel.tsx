import { useState } from 'react'
import { npcConfig } from '../../config/npcConfig'
export function NPCChannel({ message, compact = false }: { message: string; compact?: boolean }) {
  // Keep each page as a complete thought. Splitting every N characters can cut a
  // cause from its result and makes beginner guidance much harder to follow.
  const chunks = message.match(/[^。！？]+[。！？]?/gu) || [message]
  const [page, setPage] = useState(0)
  const index = Math.min(page, chunks.length-1)
  return <aside className={`npc-channel${compact ? ' is-compact' : ''}`} aria-live="polite"><div className="npc-avatar hologram-avatar"><img src={npcConfig.avatarSrc} alt={npcConfig.avatarAlt}/><i/></div><div className="npc-content"><header>科成-开放原子开源社团联络员 <span>在线</span></header><p>{chunks[index]}</p><small>科成-开放原子开源社团</small>{chunks.length > 1 && <button onClick={() => setPage((index+1)%chunks.length)}>继续说明 {index+1}/{chunks.length}</button>}</div></aside>
}
