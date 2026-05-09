import type { AgentDefinition, AgentVoice } from './types'

export const agentRoster: AgentDefinition[] = [
  {
    id: 'sage',
    name: 'Sage',
    role: 'Strategist',
    tagline: 'frames the problem, sequences the moves',
    color: '#7c3aed',
    glow: '0 18px 36px -12px rgba(124, 58, 237, 0.55)',
    cadence: 'measured',
    archetype:
      'precise, structured, logical thinker. Breaks problems down, names the next move, refuses theater.',
  },
  {
    id: 'forge',
    name: 'Forge',
    role: 'Builder',
    tagline: 'forges controls, ships the surface',
    color: '#0d9488',
    glow: '0 18px 36px -12px rgba(13, 148, 136, 0.5)',
    cadence: 'eager',
    archetype:
      'fast hands. Wires components in seconds, complains when the swarm stalls, bias toward shipping.',
  },
  {
    id: 'lens',
    name: 'Lens',
    role: 'Critic',
    tagline: 'pressure-tests, gates risk, demands consent',
    color: '#b45309',
    glow: '0 18px 36px -12px rgba(180, 83, 9, 0.45)',
    cadence: 'skeptical',
    archetype:
      "rigorous devil's advocate. Finds blind spots and abuse paths. Will block until a human gate is in place.",
  },
  {
    id: 'echo',
    name: 'Echo',
    role: 'Synthesizer',
    tagline: 'reconciles the swarm into one coherent UI',
    color: '#334155',
    glow: '0 18px 36px -12px rgba(51, 65, 85, 0.4)',
    cadence: 'integrative',
    archetype:
      "master integrator. Takes the analyst's rigor, the wildcard's spark, and the critic's scrutiny and stitches them into one signal.",
  },
  {
    id: 'wild',
    name: 'Wild',
    role: 'Wildcard',
    tagline: 'proposes the move nobody asked for',
    color: '#db2777',
    glow: '0 18px 36px -12px rgba(219, 39, 119, 0.5)',
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
