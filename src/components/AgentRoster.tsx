import { agentRoster } from '../agents'
import type { AgentVoice, ArgumentLine, BlockMeta } from '../types'

type AgentRosterProps = {
  meta: Record<string, BlockMeta>
  visibleBlockCount: number
  activeAuthor?: AgentVoice
  argumentLines: ArgumentLine[]
}

export function AgentRoster({ meta, visibleBlockCount, activeAuthor, argumentLines }: AgentRosterProps) {
  const visibleEntries = Object.entries(meta).filter(([, m]) => m.proposedAt < visibleBlockCount)
  const counts = agentRoster.reduce<Record<AgentVoice, number>>(
    (accumulator, agent) => {
      accumulator[agent.id] = visibleEntries.filter(([, m]) => m.author === agent.id).length
      return accumulator
    },
    { sage: 0, forge: 0, lens: 0, echo: 0, wild: 0 },
  )

  const lastLineByAgent = agentRoster.reduce<Record<AgentVoice, string | undefined>>(
    (accumulator, agent) => {
      const visible = argumentLines.filter(
        (line) => line.agent === agent.id && line.proposedAt < visibleBlockCount,
      )
      accumulator[agent.id] = visible[visible.length - 1]?.text
      return accumulator
    },
    { sage: undefined, forge: undefined, lens: undefined, echo: undefined, wild: undefined },
  )

  return (
    <aside className="agent-roster" aria-label="Agent swarm">
      <p className="roster-eyebrow">The swarm</p>
      <div className="roster-list">
        {agentRoster.map((agent) => {
          const isActive = activeAuthor === agent.id
          const contribution = counts[agent.id]
          const lastLine = lastLineByAgent[agent.id]
          return (
            <div
              key={agent.id}
              className={`roster-card author-${agent.id} ${isActive ? 'roster-active' : ''} ${lastLine ? 'roster-spoken' : ''}`}
              style={{ '--author-color': agent.color, '--author-glow': agent.glow } as React.CSSProperties}
            >
              <div className="roster-topline">
                <span className="author-dot" />
                <strong>{agent.name}</strong>
                <span className="roster-count">{contribution}</span>
              </div>
              <p className="roster-role">{agent.role}</p>
              <p className="roster-tagline">{agent.tagline}</p>
              {lastLine ? <p className="roster-quote">&ldquo;{lastLine}&rdquo;</p> : null}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
