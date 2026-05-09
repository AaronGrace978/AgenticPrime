import type { AgentDefinition, AgentVoice } from './types'

export const agentRoster: AgentDefinition[] = [
  {
    id: 'sage',
    name: 'Sage',
    role: 'Strategist',
    tagline: 'frames the problem, plans the moves',
    color: '#a855f7',
    glow: '0 0 32px rgba(168, 85, 247, 0.6)',
  },
  {
    id: 'forge',
    name: 'Forge',
    role: 'Builder',
    tagline: 'forges the controls and surfaces',
    color: '#30d5c8',
    glow: '0 0 32px rgba(48, 213, 200, 0.6)',
  },
  {
    id: 'lens',
    name: 'Lens',
    role: 'Critic',
    tagline: 'pressure-tests, gates risk, asks for approval',
    color: '#f7d154',
    glow: '0 0 32px rgba(247, 209, 84, 0.55)',
  },
  {
    id: 'echo',
    name: 'Echo',
    role: 'Synthesizer',
    tagline: 'reconciles the swarm into one coherent UI',
    color: '#e2e8f0',
    glow: '0 0 32px rgba(226, 232, 240, 0.4)',
  },
  {
    id: 'wild',
    name: 'Wild',
    role: 'Wildcard',
    tagline: 'proposes the move nobody asked for',
    color: '#f472b6',
    glow: '0 0 32px rgba(244, 114, 182, 0.55)',
  },
]

const rosterById: Record<AgentVoice, AgentDefinition> = agentRoster.reduce(
  (accumulator, agent) => {
    accumulator[agent.id] = agent
    return accumulator
  },
  {} as Record<AgentVoice, AgentDefinition>,
)

export function agentById(id: AgentVoice): AgentDefinition {
  return rosterById[id]
}
