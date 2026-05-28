interface LogomarkProps {
  size?: number
  color?: string
}

export function Logomark({ size = 22, color = '#00d992' }: LogomarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M12 12 H52 V20 H30 L52 42 V52 H12 V44 H34 L12 22 Z" fill={color} />
    </svg>
  )
}

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Logomark size={size} />
      <span style={{ fontWeight: 600, color: '#ffffff', fontSize: 16, letterSpacing: '-0.2px' }}>
        ZoneForty5
      </span>
    </div>
  )
}
