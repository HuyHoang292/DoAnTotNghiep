import { useEffect, useRef, useState } from 'react'
import type { NormalizedBox, SimulatedSignalConfig, StopLine } from '@/lib/types'

type SignalState = 'GREEN' | 'YELLOW' | 'RED'

// Cùng công thức với SimulatedSignal trong ai-service/red_light.py
function signalAt(config: SimulatedSignalConfig, t: number): { state: SignalState; remaining: number } {
  const cycle = config.green + config.yellow + config.red
  const phase = (t + config.offset) % cycle
  if (phase < config.green) return { state: 'GREEN', remaining: config.green - phase }
  if (phase < config.green + config.yellow) return { state: 'YELLOW', remaining: config.green + config.yellow - phase }
  return { state: 'RED', remaining: cycle - phase }
}

const LAMP_ON: Record<SignalState, string> = {
  RED: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]',
  YELLOW: 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]',
  GREEN: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]',
}

const COUNT_COLOR: Record<SignalState, string> = {
  RED: 'text-red-400',
  YELLOW: 'text-amber-300',
  GREEN: 'text-emerald-300',
}

export function RedLightVideo({
  src,
  stopLine,
  signalConfig,
  roi,
  draftPoint,
  drawing,
  onPick,
}: {
  src: string
  stopLine?: StopLine | null
  signalConfig?: SimulatedSignalConfig | null
  roi?: NormalizedBox | null
  draftPoint?: { x: number; y: number } | null
  drawing?: boolean
  onPick?: (x: number, y: number) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [time, setTime] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setTime(videoRef.current?.currentTime ?? 0), 200)
    return () => window.clearInterval(timer)
  }, [])

  const signal = signalConfig ? signalAt(signalConfig, time) : null
  const lineColor = !signal ? '#38bdf8' : signal.state === 'GREEN' ? '#34d399' : signal.state === 'YELLOW' ? '#fbbf24' : '#ef4444'

  let arrow: { x1: number; y1: number; x2: number; y2: number } | null = null
  if (stopLine && size) {
    const dx = (stopLine.x2 - stopLine.x1) * size.w
    const dy = (stopLine.y2 - stopLine.y1) * size.h
    const length = Math.hypot(dx, dy) || 1
    const midX = ((stopLine.x1 + stopLine.x2) / 2) * size.w
    const midY = ((stopLine.y1 + stopLine.y2) / 2) * size.h
    const reach = size.h * 0.08 * stopLine.travelSide
    arrow = { x1: midX, y1: midY, x2: midX + (-dy / length) * reach, y2: midY + (dx / length) * reach }
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
        src={src}
        controls={!drawing}
        autoPlay
        muted
        loop
        playsInline
        onLoadedMetadata={(e) => setSize({ w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight })}
        className="block w-full"
      />

      {size && (
        <svg
          viewBox={`0 0 ${size.w} ${size.h}`}
          preserveAspectRatio="none"
          onClick={(e) => {
            if (!drawing || !onPick) return
            const rect = e.currentTarget.getBoundingClientRect()
            onPick((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height)
          }}
          className={`absolute inset-0 h-full w-full ${drawing ? 'cursor-crosshair' : 'pointer-events-none'}`}
        >
          <defs>
            <marker id="travel-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M0 0 L10 5 L0 10 z" fill={lineColor} />
            </marker>
          </defs>
          {stopLine && (
            <line
              x1={stopLine.x1 * size.w}
              y1={stopLine.y1 * size.h}
              x2={stopLine.x2 * size.w}
              y2={stopLine.y2 * size.h}
              stroke={lineColor}
              strokeWidth={size.h * 0.006}
            />
          )}
          {arrow && (
            <line {...arrow} stroke={lineColor} strokeWidth={size.h * 0.004} markerEnd="url(#travel-arrow)" />
          )}
          {roi && (
            <rect
              x={roi.x1 * size.w}
              y={roi.y1 * size.h}
              width={(roi.x2 - roi.x1) * size.w}
              height={(roi.y2 - roi.y1) * size.h}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={size.h * 0.004}
            />
          )}
          {draftPoint && <circle cx={draftPoint.x * size.w} cy={draftPoint.y * size.h} r={size.h * 0.01} fill="#38bdf8" />}
        </svg>
      )}

      {signal && (
        <div className="pointer-events-none absolute right-2 top-2 flex flex-col items-center gap-1 rounded-lg bg-black/80 px-2 py-1.5">
          {(['RED', 'YELLOW', 'GREEN'] as const).map((state) => (
            <span
              key={state}
              className={`h-3.5 w-3.5 rounded-full ${signal.state === state ? LAMP_ON[state] : 'bg-white/15'}`}
            />
          ))}
          <span className={`font-mono text-sm font-bold ${COUNT_COLOR[signal.state]}`}>
            {Math.ceil(signal.remaining)}
          </span>
          <span className="text-[9px] font-semibold tracking-wide text-white/60">GIẢ LẬP</span>
        </div>
      )}
    </div>
  )
}
