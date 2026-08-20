// Isotipo de Alto Test (la catenaria) — variante con los puntos de anclaje explícitos en
// cada extremo (placa + perno) en vez del punto simple de site/src/components/ui/Logomark.tsx.
// Placa siempre clara y perno siempre oscuro: ambos extremos se usan sobre fondo tinta
// (toolbar, portada), así que necesitan contraste propio, no heredado del tono de la curva.
type Tone = 'signal' | 'steel' | 'paper'

const STROKE: Record<Tone, string> = {
  signal: '#C2491F',
  steel: '#4C6B7A',
  paper: '#F4F5F2',
}

const PLATE = '#F4F5F2'
const BOLT = '#10151E'

function AnchorPoint({ cx, cy, size }: { cx: number; cy: number; size: number }) {
  const half = size / 2
  return (
    <g>
      <rect x={cx - half} y={cy - half} width={size} height={size} rx={size * 0.26} fill={PLATE} />
      <circle cx={cx} cy={cy} r={size * 0.2} fill={BOLT} />
    </g>
  )
}

export function Logomark({
  tone = 'steel',
  width = 34,
  height = 14,
}: {
  tone?: Tone
  width?: number
  height?: number
}) {
  return (
    <svg width={width} height={height} viewBox="0 0 34 14" aria-hidden="true">
      <path d="M2,7 Q17,13 32,7" stroke={STROKE[tone]} strokeWidth={2} fill="none" />
      <AnchorPoint cx={2} cy={7} size={4.2} />
      <AnchorPoint cx={32} cy={7} size={4.2} />
    </svg>
  )
}
