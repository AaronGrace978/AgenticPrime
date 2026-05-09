import { agentById } from '../agents'
import type { ArgumentLine } from '../types'

type ArgumentStreamProps = {
  lines: ArgumentLine[]
  visibleProposedAt: number
  isDisputing: boolean
  disputeBlockId?: string
}

const VISIBLE_BUBBLE_LIMIT = 6

export function ArgumentStream({ lines, visibleProposedAt, isDisputing, disputeBlockId }: ArgumentStreamProps) {
  const visibleLines = lines
    .filter((line) => line.proposedAt < visibleProposedAt)
    .slice(-VISIBLE_BUBBLE_LIMIT)

  if (visibleLines.length === 0) {
    return (
      <div className="argument-stream argument-empty" aria-label="Live agent argument">
        <p className="eyebrow">Live argument</p>
        <p className="argument-placeholder">The five voices will appear here when generation begins.</p>
      </div>
    )
  }

  return (
    <div
      className={`argument-stream ${isDisputing ? 'argument-disputing' : ''}`}
      aria-label="Live agent argument"
      data-dispute-block={disputeBlockId ?? ''}
    >
      <div className="argument-heading">
        <p className="eyebrow">Live argument</p>
        {isDisputing ? <span className="argument-dispute-pill">Lens vs Wild</span> : null}
      </div>
      <ol className="argument-list">
        {visibleLines.map((line) => {
          const agent = agentById(line.agent)
          const animationDelayMs = line.delayMs ?? 0
          return (
            <li
              key={line.id}
              className={`argument-bubble argument-${line.beat} author-${line.agent}`}
              style={{
                '--author-color': agent.color,
                '--author-glow': agent.glow,
                animationDelay: `${animationDelayMs}ms`,
              } as React.CSSProperties}
            >
              <div className="argument-meta">
                <span className="author-dot" />
                <strong>{agent.name}</strong>
                <span className="argument-role">{agent.role}</span>
              </div>
              <p className="argument-text">{line.text}</p>
              {line.operation ? (
                <div className="argument-operation">
                  <code>{line.operation.capability}</code>
                  <span>{line.operation.outcome}</span>
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
