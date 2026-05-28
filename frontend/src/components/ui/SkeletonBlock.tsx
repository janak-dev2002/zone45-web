interface SkeletonBlockProps {
  height?: number | string
  width?: number | string
  borderRadius?: number
  className?: string
}

export default function SkeletonBlock({ height = 20, width = '100%', borderRadius = 4, className }: SkeletonBlockProps) {
  return (
    <div
      className={`skeleton${className ? ` ${className}` : ''}`}
      style={{ height, width, borderRadius }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SkeletonBlock height={180} borderRadius={4} />
      <SkeletonBlock height={12} width="60%" />
      <SkeletonBlock height={24} />
      <SkeletonBlock height={16} />
      <SkeletonBlock height={16} width="80%" />
    </div>
  )
}

export function SkeletonPostRow() {
  return (
    <div style={{ borderTop: '1px solid #3d3a39', padding: '24px 0', display: 'flex', gap: 32 }}>
      <div style={{ flexShrink: 0 }}>
        <SkeletonBlock height={14} width={100} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SkeletonBlock height={22} />
        <SkeletonBlock height={14} />
        <SkeletonBlock height={14} width="70%" />
      </div>
    </div>
  )
}
