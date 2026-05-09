import { agentRoster } from '../agents'
import type { AgentVoice, BlockMeta } from '../types'

type AgentRosterProps = {
  meta: Record<string, BlockMeta>
  visibleBlockCount: number
  activeAuthor?: AgentVoice
}

export function AgentRoster({ meta, visibleBlockCount, activeAuthor }: AgentRosterProps) {
  const visibleEntries = Object.entries(meta).filter(([, m]) => m.proposedAt < visibleBlockCount)
  const counts = agentRoster.reduce<Record<AgentVoice, number>>(
    (accumulator, agent) => {
      accumulator[agent.id] = visibleEntries.filter(([, m]) => m.author === agent.id).length
      return accumulator
    },
    { sage: 0, forge: 0, lens: 0, echo: 0, wild: 0 },
  )

  return (
    <aside className="agent-roster" aria-label="Agent swarm">
      <p className="roster-eyebrow">The swarm</p>
      <div className="roster-list">
        {agentRoster.map((agent) => {
          const isActive = activeAuthor === agent.id
          const contribution = counts[agent.id]
          return (
            <div
              key={agent.id}
              className={`roster-card author-${agent.id} ${isActive ? 'roster-active' : ''}`}
              style={{ '--author-color': agent.color, '--author-glow': agent.glow } as React.CSSProperties}
            >
              <div className="roster-topline">
                <span className="author-dot" />
                <strong>{agent.name}</strong>
                <span className="roster-count">{contribution}</span>
              </div>
              <p className="roster-role">{agent.role}</p>
              <p className="roster-tagline">{agent.tagline}</p>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
