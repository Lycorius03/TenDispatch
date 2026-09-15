interface TransportTrackProps {
  mode: 'idle' | 'write' | 'query' | 'replicate' | 'sync' | 'final'
  queryNodes: number
}

const paths = ['M 400 112 C 400 205, 145 190, 145 310', 'M 400 112 L 400 310', 'M 400 112 C 400 205, 655 190, 655 310']

export function TransportTrack({ mode, queryNodes }: TransportTrackProps) {
  const [reduceMotion, setReduceMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduceMotion(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  const activeIndexes = mode === 'query' && queryNodes === 1 ? [1] : [0, 1, 2]
  return (
    <svg className={`transport-track mode-${mode}`} viewBox="0 0 800 390" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id="trackGlow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <path className="intake-line" d="M400 -8V70" />
      {paths.map((path, index) => (
        <g key={path} className={activeIndexes.includes(index) ? 'path-active' : 'path-muted'}>
          <path className="track-bed" d={path} />
          <path className="track-energy" d={path} pathLength="100" />
          {mode !== 'idle' && activeIndexes.includes(index) && !reduceMotion && <circle className={`cargo-dot cargo-${index}`} r={mode === 'replicate' ? 7 : 5}><animateMotion dur={`${1.4 + index * 0.15}s`} repeatCount="indefinite" path={path} /></circle>}
        </g>
      ))}
      {mode !== 'idle' && !reduceMotion && <rect className="intake-cargo" x="394" y="0" width="12" height="18" rx="2"><animate attributeName="y" values="0;58;0" dur="1.4s" repeatCount="indefinite" /></rect>}
    </svg>
  )
}
import { useEffect, useState } from 'react'
