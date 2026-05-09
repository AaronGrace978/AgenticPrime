export type CapabilityKind =
  | 'crm'
  | 'research'
  | 'messaging'
  | 'calendar'
  | 'finance'
  | 'ops'
  | 'browser'
  | 'sensor'
  | 'memory'
  | 'creative'
  | 'safety'
  | 'commerce'
  | 'social'
  | 'health'

export type Capability = {
  id: string
  name: string
  kind: CapabilityKind
  provider: string
  description: string
  permissions: string[]
  inputs: string[]
  confidence: number
  latency: string
}

export type ExecutionStatus = 'pending' | 'running' | 'done'

export type ExecutionStep = {
  id: string
  title: string
  capabilityId: string
  detail: string
  status: ExecutionStatus
}

export type FieldOption = {
  label: string
  value: string
}

export type ControlField = {
  id: string
  label: string
  type: 'text' | 'select' | 'range' | 'textarea'
  value: string | number
  helper?: string
  min?: number
  max?: number
  step?: number
  options?: FieldOption[]
}

export type Metric = {
  label: string
  value: string
  detail: string
  trend: 'up' | 'steady' | 'down'
}

export type ChartDatum = {
  label: string
  value: number
  color: string
}

export type ChecklistItem = {
  label: string
  detail: string
  checked: boolean
}

export type AgentVoice = 'sage' | 'forge' | 'lens' | 'echo' | 'wild'

export type AgentDefinition = {
  id: AgentVoice
  name: string
  role: string
  tagline: string
  color: string
  glow: string
  cadence: string
  archetype: string
}

export type BlockMeta = {
  author: AgentVoice
  reasoning: string
  proposedAt: number
}

export type ArgumentBeat = 'open' | 'counter' | 'settle' | 'mic-drop'

export type ArgumentLine = {
  id: string
  agent: AgentVoice
  text: string
  proposedAt: number
  beat: ArgumentBeat
  delayMs?: number
  operation?: {
    capability: string
    outcome: string
  }
}

export type WebResource = {
  id: string
  label: string
  url: string
  source: string
  detail: string
  urgency?: 'routine' | 'soon' | 'urgent'
  imageUrl?: string
}

export type UiBlock =
  | {
      id: string
      kind: 'hero'
      eyebrow: string
      title: string
      body: string
      chips: string[]
    }
  | {
      id: string
      kind: 'capabilityGrid'
      title: string
      capabilities: Capability[]
    }
  | {
      id: string
      kind: 'resourceLauncher'
      title: string
      description: string
      resources: WebResource[]
    }
  | {
      id: string
      kind: 'imageIntake'
      title: string
      description: string
      accepted: string[]
      caution: string
    }
  | {
      id: string
      kind: 'form'
      title: string
      description: string
      fields: ControlField[]
    }
  | {
      id: string
      kind: 'metricStrip'
      metrics: Metric[]
    }
  | {
      id: string
      kind: 'barChart'
      title: string
      description: string
      data: ChartDatum[]
    }
  | {
      id: string
      kind: 'timeline'
      title: string
      steps: ExecutionStep[]
    }
  | {
      id: string
      kind: 'approvalCard'
      title: string
      description: string
      risk: string
      actions: string[]
    }
  | {
      id: string
      kind: 'toolConsole'
      title: string
      lines: string[]
    }
  | {
      id: string
      kind: 'checklist'
      title: string
      items: ChecklistItem[]
    }
  | {
      id: string
      kind: 'protocolPanel'
      title: string
      protocols: Array<{ name: string; status: string; detail: string }>
    }
  | {
      id: string
      kind: 'jurisdictionCard'
      title: string
      state: string
      deadline: string
      rule: string
      risk: string
    }
  | {
      id: string
      kind: 'evidenceMatrix'
      title: string
      items: Array<{ label: string; status: 'ready' | 'missing' | 'optional'; detail: string }>
    }
  | {
      id: string
      kind: 'demandLetter'
      title: string
      recipient: string
      amount: string
      body: string
    }
  | {
      id: string
      kind: 'unsupportedIntent'
      title: string
      intent: string
      reason: string
      suggestions: string[]
    }

export type UiManifest = {
  id: string
  title: string
  subtitle: string
  generatedFor: string
  blocks: UiBlock[]
  meta: Record<string, BlockMeta>
  argument: ArgumentLine[]
  disputeAtProposedAt?: number
  disputeBlockId?: string
  closingLines: { agent: AgentVoice; text: string }[]
  receiptTagline: string
}

export type ArtifactReceipt = {
  id: string
  folder: string
  files: Array<{
    label: string
    path: string
    purpose: string
  }>
  summary: string
}

export type AgentDraft = {
  title?: string
  subtitle?: string
  heroTitle?: string
  heroBody?: string
  chips?: string[]
  metrics?: Metric[]
  chart?: {
    title?: string
    description?: string
    data?: ChartDatum[]
  }
  executionSteps?: Array<{
    title: string
    detail: string
    capabilityHint?: string
  }>
  approval?: {
    title?: string
    description?: string
    risk?: string
    actions?: string[]
  }
  checklist?: ChecklistItem[]
  consoleLines?: string[]
  agentTurns?: Array<{
    agent: AgentVoice
    text: string
    capability: string
    outcome: string
  }>
  /** When the live model returns 4+ items, the runtime shows these instead of the preset use-case tool cards. */
  discoveredCapabilities?: Capability[]
}

export type UseCaseInputs = Record<string, string | number>

export type UseCaseDefinition = {
  id: string
  title: string
  eyebrow: string
  summary: string
  intent: string
  inputs: ControlField[]
  capabilities: Capability[]
  metrics: Metric[]
  chart: { title: string; description: string; data: ChartDatum[] }
  steps: Array<{ title: string; detail: string; capabilityId: string }>
  approval: { title: string; description: string; risk: string; actions: string[] }
  checklist: ChecklistItem[]
  hero: { eyebrow: string; title: string; body: string; chips: string[] }
  closingTitle: string
}
