type ThumbKind = 'line' | 'grid' | 'bars' | 'kanban' | 'map' | 'sparkline'

interface ProjectThumbProps {
  kind?: ThumbKind
  coverImageUrl?: string | null
}

export default function ProjectThumb({ kind = 'sparkline', coverImageUrl }: ProjectThumbProps) {
  if (coverImageUrl) {
    return (
      <img
        src={coverImageUrl}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
    )
  }

  const w = '100%'
  const h = '100%'
  const style = { position: 'absolute' as const, inset: 0 }

  if (kind === 'line') {
    return (
      <svg viewBox="0 0 320 180" width={w} height={h} preserveAspectRatio="none" style={style}>
        {[40, 80, 120].map(y => (
          <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="#3d3a39" strokeDasharray="2 4" />
        ))}
        <path d="M0 140 L40 120 L80 130 L120 90 L160 100 L200 60 L240 75 L280 50 L320 65"
          stroke="#00d992" strokeWidth="2" fill="none" />
        <path d="M0 140 L40 120 L80 130 L120 90 L160 100 L200 60 L240 75 L280 50 L320 65 L320 180 L0 180 Z"
          fill="url(#gradLine)" opacity=".3" />
        <defs>
          <linearGradient id="gradLine" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#00d992" stopOpacity=".6" />
            <stop offset="100%" stopColor="#00d992" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    )
  }

  if (kind === 'grid') {
    return (
      <svg viewBox="0 0 320 180" width={w} height={h} preserveAspectRatio="none" style={style}>
        {Array.from({ length: 5 }).map((_, r) =>
          Array.from({ length: 9 }).map((_, c) => {
            const lit = ((r * 7 + c * 3) % 5 === 0)
            return (
              <rect key={`${r}-${c}`} x={30 + c * 28} y={28 + r * 24} width="20" height="16" rx="2"
                fill={lit ? '#00d992' : '#1a1a1a'} stroke="#3d3a39" strokeWidth="1" />
            )
          })
        )}
      </svg>
    )
  }

  if (kind === 'bars') {
    return (
      <svg viewBox="0 0 320 180" width={w} height={h} preserveAspectRatio="none" style={style}>
        <line x1="20" y1="150" x2="300" y2="150" stroke="#3d3a39" />
        {[60, 90, 50, 120, 70, 130, 100, 140, 80, 110].map((bh, i) => (
          <rect key={i} x={28 + i * 28} y={150 - bh} width="18" height={bh}
            fill={i === 7 ? '#00d992' : '#1a1a1a'} stroke="#3d3a39" />
        ))}
      </svg>
    )
  }

  if (kind === 'kanban') {
    return (
      <svg viewBox="0 0 320 180" width={w} height={h} preserveAspectRatio="none" style={style}>
        {[0, 1, 2].map(c => (
          <g key={c} transform={`translate(${20 + c * 100}, 20)`}>
            <rect x="0" y="0" width="80" height="140" fill="#0a0a0a" stroke="#3d3a39" rx="4" />
            <rect x="8" y="10" width="64" height="3" fill={c === 1 ? '#00d992' : '#3d3a39'} />
            {[0, 1, 2, 3].map(r => (
              <rect key={r} x="8" y={22 + r * 28} width="64" height="20" fill="#1a1a1a" stroke="#3d3a39" rx="2" />
            ))}
          </g>
        ))}
      </svg>
    )
  }

  if (kind === 'map') {
    return (
      <svg viewBox="0 0 320 180" width={w} height={h} preserveAspectRatio="none" style={style}>
        <path d="M20 140 Q 80 50, 160 90 T 300 60" stroke="#3d3a39" strokeWidth="1" fill="none" strokeDasharray="4 4" />
        <path d="M20 140 Q 80 50, 160 90" stroke="#00d992" strokeWidth="2" fill="none" />
        {([[20, 140], [85, 95], [160, 90], [240, 70], [300, 60]] as [number, number][]).map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="6" fill="#00d992" opacity=".2" />
            <circle cx={x} cy={y} r="3" fill={i < 3 ? '#00d992' : '#3d3a39'} />
          </g>
        ))}
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 320 180" width={w} height={h} preserveAspectRatio="none" style={style}>
      {Array.from({ length: 5 }).map((_, r) => (
        <g key={r} transform={`translate(0, ${30 + r * 28})`}>
          <text x="20" y="0" fontFamily="JetBrains Mono" fontSize="9" fill="#6b6664">node-{(r + 1).toString().padStart(2, '0')}</text>
          <line x1="80" y1="0" x2="280" y2="0" stroke="#1a1a1a" />
          <path
            d={`M80 0 ${Array.from({ length: 8 }).map((_, i) => {
              const off = ((r * 3 + i * 5) % 11) - 5
              return `L${80 + (i + 1) * 25} ${off}`
            }).join(' ')}`}
            stroke={r === 2 ? '#00d992' : '#3d3a39'}
            strokeWidth="1.5"
            fill="none"
          />
        </g>
      ))}
    </svg>
  )
}
