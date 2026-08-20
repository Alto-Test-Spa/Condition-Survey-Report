// Wordmark de Alto Test (texto + catenaria) — misma variante con anclajes explícitos que
// Logomark.tsx, ver ese archivo para el porqué de placa clara + perno oscuro fijos.
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

export function Wordmark({
  tone = 'steel',
  textClassName = 'text-[15px]',
}: {
  tone?: Tone
  textClassName?: string
}) {
  return (
    <span className="inline-flex flex-col items-center">
      <span className={`font-mono font-semibold tracking-[0.03em] ${textClassName}`}>ALTO TEST</span>
      <svg viewBox="0 0 100 16" preserveAspectRatio="none" className="mt-1 h-3.5 w-full" aria-hidden="true">
        <path
          d="M2,5 Q50,15 98,5"
          stroke={STROKE[tone]}
          strokeWidth={2.2}
          vectorEffect="non-scaling-stroke"
          fill="none"
          strokeLinecap="round"
        />
        <AnchorPoint cx={2} cy={5} size={5} />
        <AnchorPoint cx={98} cy={5} size={5} />
      </svg>
    </span>
  )
}
