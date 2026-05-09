import {
  buildArgumentScript,
  closingLinesFor,
  reasoningFor,
  receiptTaglineFor,
} from './agentVoices'
import type {
  AgentDraft,
  AgentVoice,
  BlockMeta,
  Capability,
  ChartDatum,
  ControlField,
  ExecutionStep,
  Metric,
  UiBlock,
  UiManifest,
  UseCaseDefinition,
  WebResource,
} from './types'

export type ManifestArgs = {
  useCase: UseCaseDefinition
  inputs: Record<string, string | number>
  executionSteps: ExecutionStep[]
  agentDraft?: AgentDraft
  intent: string
  providerLabel: string
  webResources?: WebResource[]
}

function capabilityGridFromDraft(agentDraft: AgentDraft | undefined, useCase: UseCaseDefinition): Capability[] {
  const discovered = agentDraft?.discoveredCapabilities
  if (discovered && discovered.length >= 4) {
    return discovered.slice(0, 8)
  }
  return useCase.capabilities
}

export function buildManifest({
  useCase,
  inputs,
  executionSteps,
  agentDraft,
  intent,
  providerLabel,
  webResources = [],
}: ManifestArgs): UiManifest {
  if (agentDraft?.title === 'Unsupported request') {
    return buildUnsupportedIntentManifest({ useCase, intent, agentDraft, providerLabel })
  }

  if (useCase.id === 'security-deposit-dispute') {
    return buildDepositDisputeManifest({ useCase, inputs, executionSteps, agentDraft, intent, providerLabel })
  }

  const liveFields = useCase.inputs.map<ControlField>((field) => ({
    ...field,
    value: inputs[field.id] ?? field.value,
    helper: hydrateHelper(field, inputs),
  }))

  const metrics: Metric[] = agentDraft?.metrics?.length ? agentDraft.metrics : useCase.metrics
  const chart = {
    title: agentDraft?.chart?.title ?? useCase.chart.title,
    description: agentDraft?.chart?.description ?? useCase.chart.description,
    data: agentDraft?.chart?.data?.length ? (agentDraft.chart.data as ChartDatum[]) : useCase.chart.data,
  }

  const draftExecutionSteps = executionStepsFromDraft(agentDraft, useCase)
  const hasExecutionProgress = executionSteps.some((step) => step.status !== 'pending')
  const visibleExecutionSteps = !hasExecutionProgress && draftExecutionSteps.length > 0
    ? draftExecutionSteps
    : executionSteps
  const completedSteps = visibleExecutionSteps.filter((step) => step.status === 'done').length
  const isComplete = visibleExecutionSteps.length > 0 && completedSteps === visibleExecutionSteps.length
  const runningStep = visibleExecutionSteps.find((step) => step.status === 'running')
  const capabilityGrid = capabilityGridFromDraft(agentDraft, useCase)

  const consoleLines = buildConsoleLines({
    useCase,
    capabilities: capabilityGrid,
    steps: visibleExecutionSteps,
    extraLines: agentDraft?.consoleLines,
    providerLabel,
  })

  const blocks: UiBlock[] = [
    {
      id: 'hero',
      kind: 'hero',
      eyebrow: useCase.hero.eyebrow,
      title: agentDraft?.heroTitle ?? useCase.hero.title,
      body: agentDraft?.heroBody ?? useCase.hero.body,
      chips: agentDraft?.chips?.length ? agentDraft.chips : useCase.hero.chips,
    },
    {
      id: 'capabilities',
      kind: 'capabilityGrid',
      title: 'Discovered capability stack',
      capabilities: capabilityGrid,
    },
    {
      id: 'resources',
      kind: 'resourceLauncher',
      title: resourceTitleFor(intent),
      description: resourceDescriptionFor(intent),
      resources: webResources.length ? webResources : defaultResourcesFor(useCase, intent),
    },
    {
      id: 'images',
      kind: 'imageIntake',
      title: 'Image and screenshot intake',
      description: imageIntakeDescriptionFor(intent),
      accepted: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      caution: 'Images are previewed in-browser. AgenticPrime does not diagnose medical images, verify identity documents, or make legal findings from images.',
    },
    {
      id: 'controls',
      kind: 'form',
      title: 'Live controls',
      description: 'Tweak the knobs and the swarm rewrites everything downstream.',
      fields: liveFields,
    },
    {
      id: 'metrics',
      kind: 'metricStrip',
      metrics,
    },
    {
      id: 'chart',
      kind: 'barChart',
      title: chart.title,
      description: chart.description,
      data: chart.data,
    },
    {
      id: 'timeline',
      kind: 'timeline',
      title: runningStep
        ? `Simulating: ${runningStep.title}`
        : isComplete
          ? 'Simulated execution receipt'
          : 'Proposed simulated plan',
      steps: visibleExecutionSteps,
    },
    {
      id: 'approval',
      kind: 'approvalCard',
      title: isComplete ? 'Simulation complete' : (agentDraft?.approval?.title ?? useCase.approval.title),
      description: isComplete
        ? 'Simulated receipts staged. The user stayed in control; no real external action was taken.'
        : (agentDraft?.approval?.description ?? useCase.approval.description),
      risk: agentDraft?.approval?.risk ?? useCase.approval.risk,
      actions: agentDraft?.approval?.actions?.length
        ? agentDraft.approval.actions
        : useCase.approval.actions,
    },
    {
      id: 'console',
      kind: 'toolConsole',
      title: 'Tool receipts',
      lines: consoleLines,
    },
    {
      id: 'checklist',
      kind: 'checklist',
      title: useCase.closingTitle,
      items: agentDraft?.checklist?.length ? agentDraft.checklist : useCase.checklist,
    },
  ]

  const authors: Record<string, AgentVoice> = {
    hero: 'sage',
    capabilities: 'forge',
    resources: 'sage',
    images: 'forge',
    controls: 'forge',
    metrics: 'echo',
    chart: 'echo',
    timeline: 'sage',
    approval: 'lens',
    console: 'wild',
    checklist: 'wild',
  }

  const meta: Record<string, BlockMeta> = {}
  blocks.forEach((block, index) => {
    const author = authors[block.id] ?? 'echo'
    meta[block.id] = {
      author,
      reasoning: reasoningFor(author, block, useCase),
      proposedAt: index,
    }
  })

  const disputeBlockId = 'approval'
  const generatedArgumentScript = buildArgumentScript({
    useCase,
    blocks,
    authorByBlockId: authors,
    disputeBlockId,
  })
  const argumentLines = argumentLinesFromDraft(agentDraft, blocks) ?? generatedArgumentScript.lines

  return {
    id: useCase.id,
    title: agentDraft?.title ?? useCase.title,
    subtitle:
      agentDraft?.subtitle ??
      `${providerLabel} swarmed ${useCase.title}. Five agents, one surface, no dashboard.`,
    generatedFor: intent,
    blocks,
    meta,
    argument: argumentLines,
    disputeAtProposedAt: generatedArgumentScript.disputeAtProposedAt,
    disputeBlockId,
    closingLines: closingLinesFor(useCase),
    receiptTagline: receiptTaglineFor(useCase),
  }
}

function buildUnsupportedIntentManifest({
  useCase,
  intent,
  agentDraft,
  providerLabel,
}: Pick<ManifestArgs, 'useCase' | 'intent' | 'agentDraft' | 'providerLabel'>): UiManifest {
  const blocks: UiBlock[] = [
    {
      id: 'unsupported',
      kind: 'unsupportedIntent',
      title: 'This request needs a different operator',
      intent,
      reason:
        agentDraft?.subtitle ??
        'The selected operator cannot safely or honestly complete this request with the tools currently wired.',
      suggestions: [
        'Restore the selected use-case intent and run the dispute workflow.',
        'Create an Email Operator with Outlook/Graph or browser automation tools.',
        'Do not click real emails until a permissioned mail tool and approval gate are wired.',
      ],
    },
    {
      id: 'protocols',
      kind: 'protocolPanel',
      title: 'What would be needed',
      protocols: [
        { name: 'MCP App', status: 'Missing', detail: 'A mail or browser MCP app that can read Outlook inbox state.' },
        { name: 'AG-UI', status: 'Required', detail: 'An event loop that shows the candidate email before any click/open action.' },
        { name: 'Human approval', status: 'Required', detail: 'Explicit consent before opening messages or acting on private data.' },
      ],
    },
    {
      id: 'console',
      kind: 'toolConsole',
      title: 'Routing guard',
      lines: [
        `> selected operator :: ${useCase.title}`,
        `> provider :: ${providerLabel}`,
        `> rejected intent :: ${intent}`,
        '> reason :: operator/tool mismatch',
        ...(agentDraft?.consoleLines ?? []),
      ],
    },
  ]

  return {
    id: `${useCase.id}-unsupported`,
    title: 'Operator mismatch',
    subtitle: 'AgenticPrime refused to fake a tool call it cannot perform.',
    generatedFor: intent,
    blocks,
    meta: metaFor(blocks),
    argument: [
      { id: 'u-0', agent: 'lens', text: 'No. We do not fake a tool we cannot run.', proposedAt: 0, beat: 'open' },
      { id: 'u-1', agent: 'sage', text: 'Route to a real operator. Be honest about it.', proposedAt: 0, beat: 'counter', delayMs: 320 },
      { id: 'u-2', agent: 'wild', text: 'Refusing is the move. Say it loud.', proposedAt: 0, beat: 'settle', delayMs: 640 },
    ],
    disputeAtProposedAt: undefined,
    disputeBlockId: undefined,
    closingLines: [
      { agent: 'lens', text: 'Refused. No fake tool calls today.' },
      { agent: 'sage', text: 'Routed to a real operator instead.' },
    ],
    receiptTagline: 'Five agents agreed: do not pretend.',
  }
}

function isDepositOrTenantIntent(intent: string): boolean {
  const lower = intent.toLowerCase()
  return /deposit|security deposit|landlord|tenant|lease|rent|eviction|property manager|move-?out|withhold|itemized|damage claim/.test(
    lower,
  )
}

function defaultResourcesFor(useCase: UseCaseDefinition, intent: string): WebResource[] {
  const lower = `${useCase.title} ${useCase.summary} ${intent}`.toLowerCase()

  if (isHealthIntent(lower)) {
    return [
      {
        id: 'hiv-gov-care',
        label: 'Find HIV care and services',
        url: 'https://locator.hiv.gov/',
        source: 'HIV.gov',
        detail: 'US locator for testing, prevention, treatment, and support services.',
        urgency: 'soon',
      },
      {
        id: 'cdc-hiv-treatment',
        label: 'HIV treatment basics',
        url: 'https://www.cdc.gov/hiv/treatment/index.html',
        source: 'CDC',
        detail: 'Plain-language overview of treatment and why care should start quickly.',
        urgency: 'soon',
      },
      {
        id: 'hivinfo-medicines',
        label: 'HIV medicines overview',
        url: 'https://hivinfo.nih.gov/understanding-hiv/fact-sheets/hiv-medicines-and-side-effects',
        source: 'NIH HIVinfo',
        detail: 'Medication information from NIH. Use with a clinician or pharmacist.',
        urgency: 'routine',
      },
      {
        id: 'emergency-care',
        label: 'Emergency care',
        url: 'https://www.911.gov/',
        source: '911.gov',
        detail: 'If symptoms are severe or immediate danger is present, seek emergency help now.',
        urgency: 'urgent',
      },
    ]
  }

  if (useCase.id === 'security-deposit-dispute' && isDepositOrTenantIntent(intent)) {
    return [
      {
        id: 'consumerfinance-housing',
        label: 'Housing complaint resources',
        url: 'https://www.consumerfinance.gov/consumer-tools/renting/',
        source: 'CFPB',
        detail: 'Federal renter resources and complaint pathways.',
        urgency: 'routine',
      },
      {
        id: 'lawhelp',
        label: 'Find local legal help',
        url: 'https://www.lawhelp.org/',
        source: 'LawHelp',
        detail: 'Directory for legal aid and tenant resources by state.',
        urgency: 'soon',
      },
    ]
  }

  return [
    {
      id: 'duckduckgo-search',
      label: `Search the web for ${useCase.title}`,
      url: `https://duckduckgo.com/?q=${encodeURIComponent(intent || useCase.title)}`,
      source: 'DuckDuckGo',
      detail: 'Opens a real web search in a new tab. Review sources before acting.',
      urgency: 'routine',
    },
    {
      id: 'perplexity-search',
      label: 'Ask a web answer engine',
      url: `https://www.perplexity.ai/search?q=${encodeURIComponent(intent || useCase.title)}`,
      source: 'Perplexity',
      detail: 'Useful for quickly finding sources, links, and summaries.',
      urgency: 'routine',
    },
  ]
}

function resourceTitleFor(intent: string): string {
  return isHealthIntent(intent.toLowerCase()) ? 'Care and resource launcher' : 'Real web launcher'
}

function resourceDescriptionFor(intent: string): string {
  return isHealthIntent(intent.toLowerCase())
    ? 'Open trusted medical resources and care locators. This is not diagnosis or prescription guidance.'
    : 'Open real webpages in new tabs. The app launches sources; it does not claim external actions happened.'
}

function imageIntakeDescriptionFor(intent: string): string {
  return isHealthIntent(intent.toLowerCase())
    ? 'Preview screenshots, labels, forms, or medication photos for discussion with a qualified clinician or pharmacist.'
    : 'Preview screenshots, references, evidence, or source images without scraping hidden content.'
}

function isHealthIntent(lower: string): boolean {
  return /health|medicine|medication|doctor|clinic|symptom|aids|hiv|prescription|pharmacy|drug|illness|infection|pain|urgent care/.test(lower)
}

export function totalBlockCount(): number {
  return 11
}

function buildDepositDisputeManifest({
  useCase,
  inputs,
  executionSteps,
  agentDraft,
  intent,
  providerLabel,
  webResources = [],
}: ManifestArgs): UiManifest {
  const state = String(inputs.state ?? 'MA')
  const depositAmount = Number(inputs.deposit_amount ?? 1800)
  const daysWaited = Number(inputs.days_waited ?? 34)
  const landlord = String(inputs.landlord ?? 'Property Manager')
  const reason = String(inputs.reason ?? 'No itemized reason provided.')
  const evidence = String(inputs.evidence ?? '')
  const rule = depositRuleFor(state)
  const urgency = daysWaited >= rule.days ? 'Deadline likely passed' : `${rule.days - daysWaited} days before demand window tightens`
  const demandBody = buildDemandLetterBody({ state, depositAmount, daysWaited, landlord, reason, evidence, rule })
  const liveFields = useCase.inputs.map<ControlField>((field) => ({
    ...field,
    value: inputs[field.id] ?? field.value,
    helper: hydrateHelper(field, inputs),
  }))
  const completedSteps = executionSteps.filter((step) => step.status === 'done').length
  const isComplete = executionSteps.length > 0 && completedSteps === executionSteps.length
  const runningStep = executionSteps.find((step) => step.status === 'running')
  const tenantResourceMission = isDepositOrTenantIntent(intent)
  const capabilityGrid = capabilityGridFromDraft(agentDraft, useCase)
  const packetReadiness = Math.min(98, 42 + evidence.split(',').filter(Boolean).length * 9 + (daysWaited >= rule.days ? 18 : 8))
  const consoleLines = buildConsoleLines({
    useCase,
    capabilities: capabilityGrid,
    steps: executionSteps,
    extraLines: [
      `> AG-UI state :: ${state} / ${daysWaited} days / $${depositAmount}`,
      `> A2UI schema :: deposit-dispute-workspace.v1`,
      `> MCP Apps :: tenant-law, document-kit, packet-exporter`,
      ...(agentDraft?.consoleLines ?? []),
    ],
    providerLabel,
  })

  const blocks: UiBlock[] = [
    {
      id: 'hero',
      kind: 'hero',
      eyebrow: useCase.hero.eyebrow,
      title: agentDraft?.heroTitle ?? useCase.hero.title,
      body: agentDraft?.heroBody ?? useCase.hero.body,
      chips: agentDraft?.chips?.length ? agentDraft.chips : useCase.hero.chips,
    },
    {
      id: 'protocols',
      kind: 'protocolPanel',
      title: 'Agentic interface protocols in play',
      protocols: [
        { name: 'CopilotKit', status: 'Frontend tool rendering', detail: 'The app exposes tool-shaped UI blocks that render from agent state instead of a chat transcript.' },
        { name: 'MCP Apps', status: 'Tool UI resources', detail: 'Tenant law, evidence indexing, and packet export are represented as discoverable app tools.' },
        { name: 'AG-UI', status: 'State event loop', detail: 'Changing state, amount, or evidence recomputes the jurisdiction card, letter, and export packet.' },
        { name: 'A2UI', status: 'Declarative schema', detail: 'The dispute workspace is emitted as a typed UI manifest with domain-specific components.' },
      ],
    },
    {
      id: 'capabilities',
      kind: 'capabilityGrid',
      title: 'Discovered MCP app stack',
      capabilities: capabilityGrid,
    },
    {
      id: 'resources',
      kind: 'resourceLauncher',
      title: tenantResourceMission ? 'Tenant resource launcher' : resourceTitleFor(intent),
      description: tenantResourceMission
        ? 'Open real renter-rights and legal-aid resources in new tabs before acting.'
        : `${resourceDescriptionFor(intent)} Each card is a link that opens a normal browser tab.`,
      resources: webResources.length ? webResources : defaultResourcesFor(useCase, intent),
    },
    {
      id: 'controls',
      kind: 'form',
      title: 'Case facts',
      description: 'Edit these fields. The agent loop recomputes the law card, evidence status, letter, and exports.',
      fields: liveFields,
    },
    {
      id: 'jurisdiction',
      kind: 'jurisdictionCard',
      title: `${state} deposit rule`,
      state,
      deadline: urgency,
      rule: rule.copy,
      risk: daysWaited >= rule.days ? 'Escalate: deadline appears passed. Demand receipts and return now.' : 'Prepare demand packet before deadline pressure increases.',
    },
    {
      id: 'evidence',
      kind: 'evidenceMatrix',
      title: 'Evidence matrix',
      items: buildEvidenceItems(evidence),
    },
    {
      id: 'images',
      kind: 'imageIntake',
      title: 'Evidence photo intake',
      description: 'Preview move-in photos, move-out photos, receipts, or damage images before exporting the packet.',
      accepted: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      caution: 'Images are previewed locally for organization only. Verify evidence and local law before sending or filing.',
    },
    {
      id: 'letter',
      kind: 'demandLetter',
      title: 'Demand letter draft',
      recipient: landlord,
      amount: `$${depositAmount.toLocaleString()}`,
      body: demandBody,
    },
    {
      id: 'metrics',
      kind: 'metricStrip',
      metrics: [
        { label: 'Packet readiness', value: `${packetReadiness}%`, detail: 'Based on facts and evidence entered', trend: 'up' },
        { label: 'Deadline', value: daysWaited >= rule.days ? 'Passed?' : `${rule.days - daysWaited}d`, detail: rule.label, trend: daysWaited >= rule.days ? 'down' : 'steady' },
        { label: 'Export value', value: '4 files', detail: 'Letter, evidence, timeline, checklist', trend: 'up' },
      ],
    },
    {
      id: 'timeline',
      kind: 'timeline',
      title: runningStep
        ? `Tool running: ${runningStep.title}`
        : isComplete
          ? 'Packet export complete'
          : 'Agent tool plan',
      steps: executionSteps,
    },
    {
      id: 'approval',
      kind: 'approvalCard',
      title: isComplete ? 'Files written' : 'Approve real local export',
      description: isComplete
        ? 'AgenticPrime wrote a domain packet to outputs/.'
        : 'Write demand letter, evidence index, timeline, and filing checklist to disk.',
      risk: 'Not legal advice. Verify rules before sending or filing.',
      actions: useCase.approval.actions,
    },
    {
      id: 'console',
      kind: 'toolConsole',
      title: 'Agent event stream',
      lines: consoleLines,
    },
  ]

  const meta = metaFor(blocks)
  const authorByBlockId = Object.fromEntries(
    Object.entries(meta).map(([blockId, blockMeta]) => [blockId, blockMeta.author]),
  ) as Record<string, AgentVoice>
  const disputeBlockId = 'approval'
  const generatedArgumentScript = buildArgumentScript({
    useCase,
    blocks,
    authorByBlockId,
    disputeBlockId,
  })
  const argumentLines = argumentLinesFromDraft(agentDraft, blocks) ?? generatedArgumentScript.lines

  return {
    id: useCase.id,
    title: agentDraft?.title ?? useCase.title,
    subtitle: agentDraft?.subtitle ?? `${providerLabel} generated a domain-specific dispute workspace and export packet.`,
    generatedFor: intent,
    blocks,
    meta,
    argument: argumentLines,
    disputeAtProposedAt: generatedArgumentScript.disputeAtProposedAt,
    disputeBlockId,
    closingLines: closingLinesFor(useCase),
    receiptTagline: receiptTaglineFor(useCase),
  }
}

export function emptyExecutionSteps(useCase: UseCaseDefinition): ExecutionStep[] {
  return useCase.steps.map((step, index) => ({
    id: `${useCase.id}-step-${index}`,
    title: step.title,
    detail: step.detail,
    capabilityId: step.capabilityId,
    status: 'pending',
  }))
}

function executionStepsFromDraft(agentDraft: AgentDraft | undefined, useCase: UseCaseDefinition): ExecutionStep[] {
  if (!agentDraft?.executionSteps?.length) {
    return []
  }

  return agentDraft.executionSteps.slice(0, 6).map((step, index) => {
    const hintedCapability = useCase.capabilities.find(
      (capability) => capability.id === step.capabilityHint || capability.name === step.capabilityHint,
    )
    const fallbackCapability = useCase.steps[index]?.capabilityId ?? useCase.capabilities[index % useCase.capabilities.length]?.id

    return {
      id: `${useCase.id}-draft-step-${index}`,
      title: step.title,
      detail: step.detail,
      capabilityId: hintedCapability?.id ?? fallbackCapability ?? 'offline-operation',
      status: 'pending',
    }
  })
}

function argumentLinesFromDraft(agentDraft: AgentDraft | undefined, blocks: UiBlock[]): UiManifest['argument'] | undefined {
  if (!agentDraft?.agentTurns?.length) {
    return undefined
  }

  const lastFrame = Math.max(0, blocks.length - 1)
  return agentDraft.agentTurns.slice(0, 8).map((turn, index) => ({
    id: `agent-turn-${index}-${turn.agent}`,
    agent: turn.agent,
    text: turn.text,
    proposedAt: Math.min(index, lastFrame),
    beat: index === agentDraft.agentTurns!.length - 1 ? 'mic-drop' : index === 2 ? 'counter' : 'open',
    delayMs: index * 160,
    operation: {
      capability: turn.capability,
      outcome: turn.outcome,
    },
  }))
}

export function defaultInputsFor(useCase: UseCaseDefinition): Record<string, string | number> {
  const map: Record<string, string | number> = {}
  for (const field of useCase.inputs) {
    map[field.id] = field.value
  }
  return map
}

type ConsoleArgs = {
  useCase: UseCaseDefinition
  capabilities: Capability[]
  steps: ExecutionStep[]
  extraLines: string[] | undefined
  providerLabel: string
}

function buildConsoleLines({ useCase, capabilities, steps, extraLines, providerLabel }: ConsoleArgs): string[] {
  const capabilityLines = capabilities
    .slice(0, 4)
    .map((capability) => `discovered ${capability.provider} :: ${capability.name}`)

  const stepLines = steps
    .filter((step) => step.status !== 'pending')
    .map((step) => `sim-${step.status.padEnd(7, ' ')} ${step.id} :: ${step.detail}`)

  return [
    `> use case :: ${useCase.title}`,
    `> provider :: ${providerLabel}`,
    '> simulated capability registry queried',
    ...capabilityLines,
    '> ui manifest synthesized by swarm',
    ...(extraLines ?? []),
    ...stepLines,
  ]
}

function metaFor(blocks: UiBlock[]): Record<string, BlockMeta> {
  const authors: AgentVoice[] = ['sage', 'forge', 'forge', 'sage', 'forge', 'forge', 'lens', 'echo', 'forge', 'wild', 'echo', 'sage', 'lens', 'wild']
  const reasons = [
    'Sage frames the real-world problem.',
    'Forge exposes the protocol layer instead of hiding it.',
    'Forge discovers the tool stack this workflow needs.',
    'Sage opens real resources instead of pretending all knowledge is local.',
    'Forge renders editable facts as shared state.',
    'Lens checks jurisdiction and risk.',
    'Echo turns messy evidence into a matrix.',
    'Forge previews evidence images before they become artifacts.',
    'Wild drafts the artifact users actually need.',
    'Echo computes live readiness from state.',
    'Sage sequences tool calls.',
    'Lens requires approval before files are written.',
    'Wild shows the event stream so the agent is inspectable.',
  ]

  return Object.fromEntries(
    blocks.map((block, index) => [
      block.id,
      {
        author: authors[index] ?? 'echo',
        reasoning: reasons[index] ?? 'The swarm added this block because the current state required it.',
        proposedAt: index,
      },
    ]),
  )
}

function depositRuleFor(state: string): { days: number; label: string; copy: string } {
  if (state === 'MA') {
    return {
      days: 30,
      label: '30-day Massachusetts return window',
      copy: 'Massachusetts generally requires security deposit return or an itemized damage statement within 30 days after tenancy ends.',
    }
  }

  if (state === 'NY') {
    return {
      days: 14,
      label: '14-day New York itemization window',
      copy: 'New York generally requires return of the deposit or an itemized statement within 14 days after move-out.',
    }
  }

  if (state === 'CA') {
    return {
      days: 21,
      label: '21-day California itemization window',
      copy: 'California generally requires deposit return or an itemized statement within 21 days after move-out.',
    }
  }

  return {
    days: 30,
    label: 'State-specific deadline needs verification',
    copy: 'This state varies by lease and local law. Use this packet as an organized draft, then verify the exact rule.',
  }
}

function buildEvidenceItems(evidence: string): Array<{ label: string; status: 'ready' | 'missing' | 'optional'; detail: string }> {
  const lower = evidence.toLowerCase()
  return [
    {
      label: 'Lease agreement',
      status: lower.includes('lease') ? 'ready' : 'missing',
      detail: 'Needed to prove deposit amount, move-out terms, and notice rules.',
    },
    {
      label: 'Move-in / move-out photos',
      status: lower.includes('photo') || lower.includes('video') ? 'ready' : 'missing',
      detail: 'Best evidence against vague damage claims.',
    },
    {
      label: 'Deposit payment receipt',
      status: lower.includes('receipt') || lower.includes('payment') ? 'ready' : 'missing',
      detail: 'Shows how much money is being demanded.',
    },
    {
      label: 'Messages with landlord',
      status: lower.includes('message') || lower.includes('text') || lower.includes('email') ? 'ready' : 'optional',
      detail: 'Helps establish request history and refusal pattern.',
    },
  ]
}

function buildDemandLetterBody({
  state,
  depositAmount,
  daysWaited,
  landlord,
  reason,
  evidence,
  rule,
}: {
  state: string
  depositAmount: number
  daysWaited: number
  landlord: string
  reason: string
  evidence: string
  rule: { days: number; copy: string }
}): string {
  return `Dear ${landlord},

I am requesting the return of my $${depositAmount.toLocaleString()} security deposit, or a complete itemized statement with supporting receipts.

It has been ${daysWaited} days since move-out. For ${state}, the relevant rule I am relying on is: ${rule.copy}

Your stated reason was: ${reason}

My evidence packet currently includes: ${evidence || 'lease, payment proof, condition photos, and message history to be attached'}.

Please return the deposit or provide the required itemization within 7 days. If this is not resolved, I am prepared to use the attached evidence index and timeline for the next filing step.`
}

function hydrateHelper(
  field: import('./types').ControlField,
  inputs: Record<string, string | number>,
): string | undefined {
  if (!field.helper) {
    return field.helper
  }

  const value = inputs[field.id]

  if (typeof value !== 'number') {
    return field.helper
  }

  if (field.id === 'budget') {
    return `$${value.toLocaleString()} target`
  }

  if (field.id === 'hours_left') {
    return `${value} hours until 6 PM submission`
  }

  if (field.id === 'battery') {
    return `${value}% battery — UI density scaling`
  }

  return field.helper
}

export const blockOrder = [
  'hero',
  'capabilities',
  'controls',
  'metrics',
  'chart',
  'timeline',
  'approval',
  'console',
  'checklist',
] as const

export function authorOf(blockId: string, manifest: UiManifest): AgentVoice {
  return manifest.meta[blockId]?.author ?? 'echo'
}
