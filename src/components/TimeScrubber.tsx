import { agentById } from '../agents'
import type { BlockMeta } from '../types'

type TimeScrubberProps = {
  totalFrames: number
  currentFrame: number
  meta: Record<string, BlockMeta>
  onScrub: (frame: number) => void
  onReplay: () => void
}

export function TimeScrubber({ totalFrames, currentFrame, meta, onScrub, onReplay }: TimeScrubberProps) {
  const sortedFrames = Object.entries(meta).sort(([, a], [, b]) => a.proposedAt - b.proposedAt)
  const safeTotal = Math.max(totalFrames, 1)

  return (
    <section className="scrubber-shell" aria-label="Generation timeline">
      <div className="scrubber-heading">
        <div>
          <p className="eyebrow">Time scrubber</p>
          <h2>Replay how the swarm built this.</h2>
        </div>
        <button className="secondary-action" type="button" onClick={onReplay}>
          Replay generation
        </button>
      </div>
      <div className="scrubber-strip">
        {sortedFrames.map(([blockId, frame], index) => {
          const agent = agentById(frame.author)
          const isVisible = index < currentFrame
          return (
            <button
              key={blockId}
              type="button"
              className={`scrubber-frame ${isVisible ? 'scrubber-shown' : 'scrubber-hidden'} author-${frame.author}`}
              style={{ '--author-color': agent.color } as React.CSSProperties}
              onClick={() => onScrub(index + 1)}
              aria-label={`Scrub to ${blockId}`}
            >
              <span className="scrubber-tick">{index + 1}</span>
              <span className="scrubber-author">{agent.name}</span>
              <span className="scrubber-blockid">{blockId}</span>
            </button>
          )
        })}
      </div>
      <input
        className="scrubber-range"
        type="range"
        min={0}
        max={safeTotal}
        step={1}
        value={Math.min(Math.max(currentFrame, 0), safeTotal)}
        onChange={(event) => onScrub(Number(event.target.value))}
        aria-label="Scrub generation"
      />
      <p className="scrubber-status">
        Frame {Math.min(Math.max(currentFrame, 0), safeTotal)} of {safeTotal}
      </p>
    </section>
  )
}
