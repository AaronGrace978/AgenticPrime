import type { AgentDraft, AgentVoice, Metric, UseCaseDefinition, UseCaseInputs } from './types'

type OfflineDraftArgs = {
  useCase: UseCaseDefinition
  inputs: UseCaseInputs
  intent: string
  chaos?: number
  reason?: string
}

const agentOrder: AgentVoice[] = ['sage', 'forge', 'lens', 'echo', 'wild']

const agentCapabilities: Record<AgentVoice, string> = {
  sage: 'plan.sequence',
  forge: 'surface.compose',
  lens: 'risk.gate',
  echo: 'signals.reconcile',
  wild: 'surprise.inject',
}

const chaosLabels = [
  'locked',
  'calibrated',
  'lively',
  'spiky',
  'volatile',
]

export function buildOfflineDraft({
  useCase,
  inputs,
  intent,
  chaos = 0,
  reason,
}: OfflineDraftArgs): AgentDraft {
  const safeChaos = clamp(chaos, 0, 100)
  const seed = hash(`${useCase.id}:${intent}:${JSON.stringify(inputs)}:${safeChaos}`)
  const chaosBand = Math.min(chaosLabels.length - 1, Math.floor(safeChaos / 25))
  const primaryCapability = useCase.capabilities[Math.abs(seed) % useCase.capabilities.length]
  const primaryInput = summarizeInputs(inputs)
  const modifier = safeChaos === 0
    ? 'exactly repeatable'
    : `${chaosLabels[chaosBand]} variation ${safeChaos}%`

  return {
    title: `${useCase.title} - Offline Swarm`,
    subtitle:
      reason ??
      `Deterministic offline run. No network, no provider keys, ${modifier}.`,
    heroTitle: pick(
      [
        useCase.hero.title,
        `${useCase.title} assembled locally.`,
        `A stage-safe surface for ${useCase.eyebrow.toLowerCase()}.`,
      ],
      seed,
    ),
    heroBody: `${useCase.hero.body} Offline agents operated on ${primaryInput} and staged every side-effect behind approval.`,
    chips: unique([
      ...useCase.hero.chips.slice(0, 4),
      'Offline',
      safeChaos > 0 ? `Chaos ${safeChaos}%` : 'Deterministic',
    ]),
    metrics: tuneMetrics(useCase.metrics, seed, safeChaos),
    chart: {
      title: useCase.chart.title,
      description: `${useCase.chart.description} Values are replayable from seed ${shortSeed(seed)}.`,
      data: useCase.chart.data.map((datum, index) => ({
        ...datum,
        value: clamp(datum.value + variance(seed, index, safeChaos), 8, 98),
      })),
    },
    executionSteps: useCase.steps.map((step, index) => {
      const agent = agentOrder[index % agentOrder.length]
      return {
        title: `${agentName(agent)} operates: ${step.title}`,
        detail: `${agentCapabilities[agent]} uses ${step.capabilityId} to ${step.detail}`,
        capabilityHint: step.capabilityId,
      }
    }),
    approval: {
      title: useCase.approval.title,
      description: `${useCase.approval.description} Offline mode simulates the operation locally and exports only after approval.`,
      risk: useCase.approval.risk,
      actions: useCase.approval.actions,
    },
    checklist: useCase.checklist.map((item, index) => ({
      ...item,
      checked: safeChaos < 70 ? item.checked : index !== useCase.checklist.length - 1,
    })),
    consoleLines: [
      `> offline seed :: ${shortSeed(seed)}`,
      `> deterministic chaos :: ${safeChaos}% (${chaosLabels[chaosBand]})`,
      `> Sage.${agentCapabilities.sage} :: framed ${useCase.title}`,
      `> Forge.${agentCapabilities.forge} :: composed ${primaryCapability.name}`,
      `> Lens.${agentCapabilities.lens} :: approval gate required`,
      `> Echo.${agentCapabilities.echo} :: metrics reconciled`,
      `> Wild.${agentCapabilities.wild} :: added memorable exit line`,
      ...(reason ? [`> fallback reason :: ${reason}`] : []),
    ],
    agentTurns: buildAgentTurns(useCase, primaryCapability.name, seed),
  }
}

export function buildParseFailureDraft(reason: string): AgentDraft {
  return {
    title: 'Partial generation - safe fallback',
    subtitle: 'The provider returned malformed JSON, so AgenticPrime rendered a valid fallback draft.',
    heroTitle: 'Partial generation. The swarm stayed upright.',
    heroBody:
      'The live model did not return clean JSON. Lens blocked the broken payload and Forge rendered a minimal safe surface instead.',
    chips: ['Partial generation', 'JSON guard', 'Safe fallback', 'Approval required'],
    metrics: [
      { label: 'JSON integrity', value: 'Failed', detail: 'Provider response could not be parsed', trend: 'down' },
      { label: 'Fallback status', value: 'Active', detail: 'Valid AgentDraft returned', trend: 'steady' },
      { label: 'Demo safety', value: 'Preserved', detail: 'No crash, no blank canvas', trend: 'up' },
    ],
    chart: {
      title: 'Recovery path',
      description: 'The app recovered with a typed fallback manifest.',
      data: [
        { label: 'Parse', value: 12, color: 'amber' },
        { label: 'Recover', value: 84, color: 'cyan' },
        { label: 'Render', value: 92, color: 'violet' },
      ],
    },
    executionSteps: [
      {
        title: 'Lens operates: block malformed payload',
        detail: 'risk.gate rejected untrusted text and requested a minimal draft.',
        capabilityHint: 'json-guard',
      },
      {
        title: 'Forge operates: render fallback surface',
        detail: 'surface.compose built valid cards from the fallback contract.',
        capabilityHint: 'fallback-renderer',
      },
      {
        title: 'Sage operates: preserve demo flow',
        detail: 'plan.sequence kept approval and export available.',
        capabilityHint: 'demo-recovery',
      },
    ],
    approval: {
      title: 'Approve fallback packet',
      description: 'The provider failed structured output. Export the fallback receipt or retry with a stricter model.',
      risk: `Partial generation - malformed JSON. ${reason}`,
      actions: ['Export fallback manifest', 'Keep provider error in transcript', 'Retry with stricter JSON mode'],
    },
    checklist: [
      { label: 'Crash avoided', detail: 'The renderer received valid typed data.', checked: true },
      { label: 'Provider issue visible', detail: 'The console includes the parse failure.', checked: true },
      { label: 'Human approval retained', detail: 'No side-effect runs automatically.', checked: true },
    ],
    consoleLines: [
      `> parse failure :: ${reason}`,
      '> Lens.risk.gate :: rejected malformed provider JSON',
      '> Forge.surface.compose :: fallback manifest rendered',
      '> Sage.plan.sequence :: retry or export fallback',
    ],
    agentTurns: [
      {
        agent: 'lens',
        capability: 'json.guard',
        outcome: 'Malformed provider payload blocked before render.',
        text: 'No broken JSON reaches the canvas. I am cutting this off here.',
      },
      {
        agent: 'forge',
        capability: 'surface.compose',
        outcome: 'Fallback manifest compiled from the local contract.',
        text: 'I can still render a valid surface. It will say exactly what failed.',
      },
      {
        agent: 'sage',
        capability: 'plan.sequence',
        outcome: 'Retry/export choices preserved behind human approval.',
        text: 'Keep the route clean: retry the provider or export the fallback receipt.',
      },
    ],
  }
}

function buildAgentTurns(useCase: UseCaseDefinition, primaryCapability: string, seed: number): AgentDraft['agentTurns'] {
  const memorableMove = pick(
    [
      'add the one line a judge will repeat',
      'turn the receipt into the closing beat',
      'make the approval gate feel like theater',
    ],
    seed + 19,
  )

  return [
    {
      agent: 'sage',
      capability: agentCapabilities.sage,
      outcome: `Sequenced ${useCase.steps.length} operations for ${useCase.title}.`,
      text: `I am framing this as ${useCase.eyebrow.toLowerCase()}: pick the next move, show the gate, then execute.`,
    },
    {
      agent: 'forge',
      capability: agentCapabilities.forge,
      outcome: `Composed controls around ${primaryCapability}.`,
      text: `I wired the surface around ${primaryCapability}; every knob should change something visible.`,
    },
    {
      agent: 'lens',
      capability: agentCapabilities.lens,
      outcome: 'Human approval remained mandatory before simulated side-effects.',
      text: 'Any action that leaves the canvas needs an explicit tap. The risk is visible.',
    },
    {
      agent: 'echo',
      capability: agentCapabilities.echo,
      outcome: 'Metrics, chart, and checklist were reconciled into one story.',
      text: 'The numbers now tell the same story as the plan. No orphan widgets.',
    },
    {
      agent: 'wild',
      capability: agentCapabilities.wild,
      outcome: memorableMove,
      text: `Fine, but make it memorable: ${memorableMove}.`,
    },
    {
      agent: 'sage',
      capability: 'review.finalize',
      outcome: 'Council review passed; surface is ready to replay or export.',
      text: 'Final review: the surface is useful, consent-gated, and demo-safe. Ship the run.',
    },
  ]
}

function tuneMetrics(metrics: Metric[], seed: number, chaos: number): Metric[] {
  return metrics.slice(0, 3).map((metric, index) => {
    const numeric = Number.parseInt(metric.value, 10)
    const hasPercent = metric.value.includes('%')

    if (Number.isFinite(numeric) && hasPercent) {
      const next = clamp(numeric + variance(seed, index + 7, chaos), 5, 98)
      return {
        ...metric,
        value: `${next}%`,
        detail: `${metric.detail} - offline agent scored`,
      }
    }

    return {
      ...metric,
      detail: `${metric.detail} - offline agent scored`,
    }
  })
}

function summarizeInputs(inputs: UseCaseInputs): string {
  const [firstKey, firstValue] = Object.entries(inputs)[0] ?? ['intent', 'current state']
  return `${firstKey}=${String(firstValue).slice(0, 42)}`
}

function pick(values: string[], seed: number): string {
  return values[Math.abs(seed) % values.length]
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values)).slice(0, 6)
}

function variance(seed: number, index: number, chaos: number): number {
  if (chaos === 0) {
    return 0
  }

  const spread = Math.ceil(chaos / 12)
  return (Math.abs(hash(`${seed}:${index}`)) % (spread * 2 + 1)) - spread
}

function shortSeed(seed: number): string {
  return Math.abs(seed).toString(36).slice(0, 6).padStart(6, '0')
}

function agentName(agent: AgentVoice): string {
  return agent.charAt(0).toUpperCase() + agent.slice(1)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function hash(value: string): number {
  let h = 0
  for (let i = 0; i < value.length; i += 1) {
    h = (h << 5) - h + value.charCodeAt(i)
    h |= 0
  }
  return h
}
