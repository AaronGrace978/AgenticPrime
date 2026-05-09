import { agentById } from '../agents'
import type { ArgumentLine } from '../types'

type SwarmHistoryProps = {
  lines: ArgumentLine[]
  visibleProposedAt: number
}

export function SwarmHistory({ lines, visibleProposedAt }: SwarmHistoryProps) {
  const visibleLines = lines.filter((line) => line.proposedAt < visibleProposedAt)
  const operations = visibleLines.filter((line) => line.operation)

  return (
    <section className="swarm-history" aria-label="Swarm operation history">
      <div className="history-heading">
        <div>
          <p className="eyebrow">Swarm history</p>
          <h3>{visibleLines.length} turns recorded</h3>
        </div>
        <span>{operations.length} ops</span>
      </div>
      {visibleLines.length === 0 ? (
        <p className="argument-placeholder">Agent turns will pin here as the surface assembles.</p>
      ) : (
        <ol className="history-list">
          {visibleLines.map((line) => {
            const agent = agentById(line.agent)
            return (
              <li
                className={`history-item author-${line.agent}`}
                key={line.id}
                style={{ '--author-color': agent.color } as React.CSSProperties}
              >
                <div className="history-topline">
                  <strong>{agent.name}</strong>
                  <span>{line.beat}</span>
                </div>
                <p>{line.text}</p>
                {line.operation ? (
                  <div className="history-operation">
                    <code>{line.operation.capability}</code>
                    <span>{line.operation.outcome}</span>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
