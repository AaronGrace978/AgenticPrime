import type { AgentDefinition, AgentVoice } from './types'

export const agentRoster: AgentDefinition[] = [
  {
    id: 'sage',
    name: 'Sage',
    role: 'Strategist',
    tagline: 'frames the problem, sequences the moves',
    color: '#a855f7',
    glow: '0 0 32px rgba(168, 85, 247, 0.6)',
    cadence: 'measured',
    archetype:
      'precise, structured, logical thinker. Breaks problems down, names the next move, refuses theater.',
  },
  {
    id: 'forge',
    name: 'Forge',
    role: 'Builder',
    tagline: 'forges controls, ships the surface',
    color: '#30d5c8',
    glow: '0 0 32px rgba(48, 213, 200, 0.6)',
    cadence: 'eager',
    archetype:
      'fast hands. Wires components in seconds, complains when the swarm stalls, bias toward shipping.',
  },
  {
    id: 'lens',
    name: 'Lens',
    role: 'Critic',
    tagline: 'pressure-tests, gates risk, demands consent',
    color: '#f7d154',
    glow: '0 0 32px rgba(247, 209, 84, 0.55)',
    cadence: 'skeptical',
    archetype:
      "rigorous devil's advocate. Finds blind spots and abuse paths. Will block until a human gate is in place.",
  },
  {
    id: 'echo',
    name: 'Echo',
    role: 'Synthesizer',
    tagline: 'reconciles the swarm into one coherent UI',
    color: '#e2e8f0',
    glow: '0 0 32px rgba(226, 232, 240, 0.4)',
    cadence: 'integrative',
    archetype:
      "master integrator. Takes the analyst's rigor, the wildcard's spark, and the critic's scrutiny and stitches them into one signal.",
  },
  {
    id: 'wild',
    name: 'Wild',
    role: 'Wildcard',
    tagline: 'proposes the move nobody asked for',
    color: '#f472b6',
    glow: '0 0 32px rgba(244, 114, 182, 0.55)',
    cadence: 'chaotic',
    archetype:
      'wildly creative lateral thinker. Sees connections others miss. Pushes the boundary so the result is remembered.',
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
