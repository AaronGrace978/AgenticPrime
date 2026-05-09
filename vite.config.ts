import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { buildOfflineDraft, buildParseFailureDraft } from './src/offlineDrafts'
import { findUseCase } from './src/useCases'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'agenticprime-provider-api',
      configureServer(server) {
        server.middlewares.use('/api/generate-ui', async (req, res) => {
          if (req.method !== 'POST') {
            writeJson(res, 405, { error: 'Method not allowed.' })
            return
          }

          try {
            const request = await readJson<GenerateUiRequest>(req)
            const draft = await generateUiDraft(request)
            writeJson(res, 200, { draft })
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown provider error.'
            writeJson(res, 500, { error: message })
          }
        })

        server.middlewares.use('/api/export-artifact', async (req, res) => {
          if (req.method !== 'POST') {
            writeJson(res, 405, { error: 'Method not allowed.' })
            return
          }

          try {
            const request = await readJson<ExportArtifactRequest>(req)
            const receipt = await createArtifactPacket(request, server.config.root)
            writeJson(res, 200, { receipt })
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown export error.'
            writeJson(res, 500, { error: message })
          }
        })

        server.middlewares.use('/api/web-resources', async (req, res) => {
          if (req.method !== 'POST') {
            writeJson(res, 405, { error: 'Method not allowed.' })
            return
          }

          try {
            const request = await readJson<WebResourceRequest>(req)
            const resources = await buildWebResources(request)
            writeJson(res, 200, { resources })
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown resource lookup error.'
            writeJson(res, 500, { error: message })
          }
        })

        server.middlewares.use('/api/mcp/apps', async (req, res) => {
          if (req.method !== 'GET') {
            writeJson(res, 405, { error: 'Method not allowed.' })
            return
          }
          writeJson(res, 200, buildMcpAppsCatalog())
        })

        server.middlewares.use('/api/a2ui/schema', async (req, res) => {
          if (req.method !== 'GET') {
            writeJson(res, 405, { error: 'Method not allowed.' })
            return
          }
          writeJson(res, 200, buildA2UiSchema())
        })

        server.middlewares.use('/api/ag-ui/run', async (req, res) => {
          if (req.method !== 'POST') {
            writeJson(res, 405, { error: 'Method not allowed.' })
            return
          }
          const input = await readJson<Record<string, unknown>>(req)
          writeJson(res, 200, buildAgUiEventStream(input))
        })
      },
    },
  ],
})

type ProviderId =
  | 'offline'
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'openrouter'
  | 'ollamaLocal'
  | 'ollamaCloud'
  | 'compatible'
  | 'agui'

type AgentVoice = 'sage' | 'forge' | 'lens' | 'echo' | 'wild'

type GenerateUiRequest = {
  provider: ProviderId
  apiKey?: string
  baseUrl?: string
  model?: string
  intent?: string
  inputs?: unknown
  capabilities?: unknown
  useCase?: { id?: string; title?: string; summary?: string }
}

type AgentDraftCapability = {
  id: string
  name: string
  kind:
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
  provider: string
  description: string
  permissions: string[]
  inputs: string[]
  confidence: number
  latency: string
}

type AgentDraft = {
  title?: string
  subtitle?: string
  heroTitle?: string
  heroBody?: string
  chips?: string[]
  metrics?: Array<{ label: string; value: string; detail: string; trend: 'up' | 'steady' | 'down' }>
  chart?: {
    title?: string
    description?: string
    data?: Array<{ label: string; value: number; color: string }>
  }
  executionSteps?: Array<{ title: string; detail: string; capabilityHint?: string }>
  approval?: {
    title?: string
    description?: string
    risk?: string
    actions?: string[]
  }
  checklist?: Array<{ label: string; detail: string; checked: boolean }>
  consoleLines?: string[]
  agentTurns?: Array<{ agent: AgentVoice; text: string; capability: string; outcome: string }>
  discoveredCapabilities?: AgentDraftCapability[]
}

type ExportArtifactRequest = {
  intent?: string
  inputs?: unknown
  manifest?: unknown
  model?: string
  providerLabel?: string
  steps?: Array<{ id: string; title: string; detail: string; status: string }>
  useCase?: { id?: string; title?: string; summary?: string }
}

type ArtifactReceipt = {
  id: string
  folder: string
  files: Array<{ label: string; path: string; purpose: string }>
  summary: string
}

type WebResourceRequest = {
  intent?: string
  inputs?: unknown
  useCase?: { id?: string; title?: string; summary?: string }
}

type WebResource = {
  id: string
  label: string
  url: string
  source: string
  detail: string
  urgency?: 'routine' | 'soon' | 'urgent'
  imageUrl?: string
}

const jsonHeaders = { 'Content-Type': 'application/json' }

async function generateUiDraft(request: GenerateUiRequest): Promise<AgentDraft> {
  if (request.provider === 'offline') {
    return buildOfflineDraft({
      useCase: findUseCase(request.useCase?.id ?? ''),
      inputs: asUseCaseInputs(request.inputs),
      intent: request.intent ?? '',
      chaos: 0,
    })
  }

  let parseFailure = ''

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const prompt = attempt === 0
      ? buildPrompt(request)
      : buildRepairPrompt(request, parseFailure, attempt)

    try {
      return await callProviderDraft(request, prompt)
    } catch (error) {
      if (!(error instanceof DraftParseError)) {
        throw error
      }
      parseFailure = error.message
    }
  }

  return buildParseFailureDraft(parseFailure || 'Provider did not return parseable JSON.')
}

async function callProviderDraft(request: GenerateUiRequest, prompt: string): Promise<AgentDraft> {
  switch (request.provider) {
    case 'offline':
      return buildOfflineDraft({
        useCase: findUseCase(request.useCase?.id ?? ''),
        inputs: asUseCaseInputs(request.inputs),
        intent: request.intent ?? '',
        chaos: 0,
      })
    case 'gemini':
      return callGemini(request, prompt)
    case 'openai':
      return callOpenAi(request, prompt, 'https://api.openai.com/v1/chat/completions')
    case 'openrouter':
      return callOpenAi(request, prompt, 'https://openrouter.ai/api/v1/chat/completions', {
        'HTTP-Referer': 'http://127.0.0.1:5173',
        'X-Title': 'AgenticPrime',
      })
    case 'anthropic':
      return callAnthropic(request, prompt)
    case 'ollamaLocal':
      return callOllama(request, prompt)
    case 'ollamaCloud':
      return callOllamaCloud(request, prompt)
    case 'compatible':
      return callOpenAi(request, prompt, joinUrl(requiredBaseUrl(request), '/chat/completions'))
    case 'agui':
      return callAgUi(request, prompt)
  }
}

async function callGemini(request: GenerateUiRequest, prompt: string): Promise<AgentDraft> {
  const apiKey = requiredApiKey(request)
  const model = request.model?.trim() || 'gemini-2.0-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`
  const json = await fetchJson(url, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    }),
  })
  const text = readPath(json, ['candidates', 0, 'content', 'parts', 0, 'text'])
  return parseDraft(typeof text === 'string' ? text : JSON.stringify(json))
}

async function callOpenAi(
  request: GenerateUiRequest,
  prompt: string,
  url: string,
  extraHeaders: Record<string, string> = {},
): Promise<AgentDraft> {
  const headers: Record<string, string> = { ...jsonHeaders, ...extraHeaders }
  if (request.apiKey?.trim()) {
    headers.Authorization = `Bearer ${request.apiKey.trim()}`
  }

  const json = await fetchJson(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: request.model?.trim() || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You generate JSON for runtime React UI. Return JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  })
  const text = readPath(json, ['choices', 0, 'message', 'content'])
  return parseDraft(typeof text === 'string' ? text : JSON.stringify(json))
}

async function callAnthropic(request: GenerateUiRequest, prompt: string): Promise<AgentDraft> {
  const json = await fetchJson('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      ...jsonHeaders,
      'anthropic-version': '2023-06-01',
      'x-api-key': requiredApiKey(request),
    },
    body: JSON.stringify({
      model: request.model?.trim() || 'claude-3-5-sonnet-latest',
      max_tokens: 2400,
      system: 'Return exactly one valid JSON object for the requested AgentDraft. No markdown. No commentary.',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  })
  const text = readPath(json, ['content', 0, 'text'])
  return parseDraft(typeof text === 'string' ? text : JSON.stringify(json))
}

async function callOllama(request: GenerateUiRequest, prompt: string): Promise<AgentDraft> {
  const baseUrl = request.baseUrl?.trim() || 'http://localhost:11434'

  const json = await fetchJson(joinUrl(baseUrl, '/api/chat'), {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      model: request.model?.trim() || 'kimi-k2.6:cloud',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      format: 'json',
      options: { temperature: 0.7 },
    }),
  })
  const text = readPath(json, ['message', 'content'])
  return parseDraft(typeof text === 'string' ? text : JSON.stringify(json))
}

async function callOllamaCloud(request: GenerateUiRequest, prompt: string): Promise<AgentDraft> {
  // Direct Ollama Cloud API should never trust a client-provided endpoint.
  // The UI hides baseUrl for this provider, but stale client state can still
  // be posted from earlier provider selections.
  const baseUrl = 'https://ollama.com'
  const json = await fetchJson(joinUrl(baseUrl, '/api/chat'), {
    method: 'POST',
    headers: {
      ...jsonHeaders,
      Authorization: `Bearer ${requiredApiKey(request)}`,
    },
    body: JSON.stringify({
      model: request.model?.trim() || 'kimi-k2.6',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      format: 'json',
      options: { temperature: 0.7 },
    }),
  })
  const text = readPath(json, ['message', 'content'])
  return parseDraft(typeof text === 'string' ? text : JSON.stringify(json))
}

async function callAgUi(request: GenerateUiRequest, prompt: string): Promise<AgentDraft> {
  const headers: Record<string, string> = { ...jsonHeaders }
  if (request.apiKey?.trim()) {
    headers.Authorization = `Bearer ${request.apiKey.trim()}`
  }

  const json = await fetchJson(requiredBaseUrl(request), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      capabilities: request.capabilities,
      inputs: request.inputs,
      intent: request.intent,
      model: request.model,
      prompt,
      responseFormat: 'agenticprime.agentDraft.v1',
    }),
  })
  const draft = readPath(json, ['draft'])
  const content = readPath(json, ['content'])

  if (isRecord(draft)) {
    return normalizeDraft(draft)
  }

  return parseDraft(typeof content === 'string' ? content : JSON.stringify(json))
}

function buildPrompt(request: GenerateUiRequest): string {
  return `You are the Genesis Engine, a swarm of five named agents that collaborate to assemble a single UI manifest.

The five agents:
- Sage (strategist) - frames the problem, sequences the moves
- Forge (builder) - constructs the controls and visible surfaces
- Lens (critic) - pressure-tests, gates risk, demands approval
- Echo (synthesizer) - reconciles the swarm into one coherent UI
- Wild (wildcard) - proposes the unexpected angle

## PRIMARY JOB (never skip)
PRIMARY SUBJECT: the user's intent below decides the domain for every narrative field (title, subtitle, hero, metrics, chart, executionSteps, checklist, approval, agentTurns, consoleLines).

The preset "use case" JSON is only scaffolding: control field ids exist for sliders and demos. Names and labels of those controls MUST NOT lure you into a different topic. If user intent mentions adoption resources, bureaucracy, passports, journaling, hackathons—then ALL copy and tools MUST match that topic. Never echo salary negotiation (base pay, comps, counter-offers) unless the user intent is actually about negotiating compensation.

REFERENCE CAPABILITIES (interaction pattern hints only—they are NOT marching orders—rewrite them in the user's topic or replace entirely inside discoveredCapabilities):
${JSON.stringify(request.capabilities ?? [], null, 2)}

Preset use case scaffolding (titles may suggest another domain—infer from USER INTENT instead):
${JSON.stringify(request.useCase ?? {}, null, 2)}

USER INTENT — this is what the interface is for — keep rereading while you generate JSON:
"""${request.intent ?? ''}"""

Current control values (bind metrics/steps loosely to these when plausible):
${JSON.stringify(request.inputs ?? {}, null, 2)}

Return ONLY valid JSON. No markdown. No commentary. Match this shape:
{
  "title": string,
  "subtitle": string,
  "heroTitle": string,
  "heroBody": string,
  "chips": string[],
  "metrics": [{"label": string, "value": string, "detail": string, "trend": "up" | "steady" | "down"}],
  "chart": {"title": string, "description": string, "data": [{"label": string, "value": number, "color": "cyan" | "violet" | "amber"}]},
  "executionSteps": [{"title": string, "detail": string, "capabilityHint": string}],
  "approval": {"title": string, "description": string, "risk": string, "actions": string[]},
  "checklist": [{"label": string, "detail": string, "checked": boolean}],
  "consoleLines": string[],
  "agentTurns": [{"agent": "sage" | "forge" | "lens" | "echo" | "wild", "text": string, "capability": string, "outcome": string}],
  "discoveredCapabilities": [
    {"id": string, "name": string, "kind": "crm" | "research" | "messaging" | "calendar" | "finance" | "ops" | "browser" | "sensor" | "memory" | "creative" | "safety" | "commerce" | "social" | "health", "provider": string, "description": string, "permissions": string[], "inputs": string[], "confidence": number, "latency": string}
  ]
}

Rules:
- discoveredCapabilities MUST have exactly five tools whose names/descriptions plainly fit USER INTENT—do not recycle unrelated demo tools left over from negotiating/sales patterns.
- Generate a specific interface for THIS exact intent, not a generic dashboard.
- Each section should feel like one of the five agents authored it (Sage frames, Forge builds, Lens critiques, Echo synthesizes, Wild surprises).
- Make controls and actions feel executable; this is the surface a human will press to ship work.
- Keep strings short enough to fit in cards. Avoid filler.
- Use 3 metrics, 3-4 chart bars, 4 execution steps, 4 approval actions, 3 checklist items.
- agentTurns must be 5-6 real turns in order: Sage -> Forge -> Lens -> Echo -> Wild -> Sage review. Each turn names a capability-like operation and an outcome tied to USER INTENT.
- Do not claim actions already happened; this is the pre-approval state.
- consoleLines should be 3-5 short receipt-style lines starting with "> " referencing USER INTENT snippets when natural.
`
}

function buildRepairPrompt(request: GenerateUiRequest, parseFailure: string, attempt: number): string {
  return `${buildPrompt(request)}

The previous response failed JSON parsing on repair attempt ${attempt}.
Failure: ${parseFailure}

Repair instruction:
- Return one minimal valid JSON object only.
- Do not wrap it in markdown.
- Use double-quoted JSON keys and string values.
- Include title, subtitle, heroTitle, heroBody, chips, metrics, chart, executionSteps, approval, checklist, consoleLines, and discoveredCapabilities (5 items tuned to USER INTENT).
- If uncertain, use short safe placeholder strings rather than prose outside JSON.
`
}

class DraftParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DraftParseError'
  }
}

function parseDraft(text: string): AgentDraft {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    throw new DraftParseError('Provider returned text, but no JSON object was found.')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text.slice(start, end + 1)) as unknown
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown JSON.parse error.'
    throw new DraftParseError(`Provider returned malformed JSON. ${message}`)
  }

  if (!isRecord(parsed)) {
    throw new DraftParseError('Provider returned JSON, but it was not an object.')
  }

  return normalizeDraft(parsed)
}

function normalizeDraft(value: Record<string, unknown>): AgentDraft {
  const draft: AgentDraft = {
    title: asString(value.title),
    subtitle: asString(value.subtitle),
    heroTitle: asString(value.heroTitle),
    heroBody: asString(value.heroBody),
    chips: asStringArray(value.chips).slice(0, 6),
    consoleLines: asStringArray(value.consoleLines).slice(0, 10),
  }

  if (Array.isArray(value.metrics)) {
    draft.metrics = value.metrics
      .filter(isRecord)
      .slice(0, 3)
      .map((metric) => ({
        label: asString(metric.label) || 'Metric',
        value: asString(metric.value) || '0',
        detail: asString(metric.detail) || 'Generated by model',
        trend: toTrend(metric.trend),
      }))
  }

  if (isRecord(value.chart)) {
    draft.chart = {
      title: asString(value.chart.title),
      description: asString(value.chart.description),
      data: Array.isArray(value.chart.data)
        ? value.chart.data
            .filter(isRecord)
            .slice(0, 4)
            .map((datum) => ({
              label: asString(datum.label) || 'Option',
              value: asNumber(datum.value),
              color: toColor(datum.color),
            }))
        : undefined,
    }
  }

  if (Array.isArray(value.executionSteps)) {
    draft.executionSteps = value.executionSteps
      .filter(isRecord)
      .slice(0, 6)
      .map((step) => ({
        title: asString(step.title) || 'Generated step',
        detail: asString(step.detail) || 'Run the generated action.',
        capabilityHint: asString(step.capabilityHint),
      }))
  }

  if (isRecord(value.approval)) {
    draft.approval = {
      title: asString(value.approval.title),
      description: asString(value.approval.description),
      risk: asString(value.approval.risk),
      actions: asStringArray(value.approval.actions).slice(0, 6),
    }
  }

  if (Array.isArray(value.checklist)) {
    draft.checklist = value.checklist
      .filter(isRecord)
      .slice(0, 5)
      .map((item) => ({
        label: asString(item.label) || 'Generated UI',
        detail: asString(item.detail) || 'The model adapted this surface.',
        checked: typeof item.checked === 'boolean' ? item.checked : true,
      }))
  }

  if (Array.isArray(value.agentTurns)) {
    draft.agentTurns = value.agentTurns
      .filter(isRecord)
      .slice(0, 8)
      .map((turn) => ({
        agent: toAgentVoice(turn.agent),
        text: asString(turn.text) || 'Agent reviewed the current surface.',
        capability: asString(turn.capability) || 'agent.review',
        outcome: asString(turn.outcome) || 'Turn recorded in the swarm history.',
      }))
  }

  if (Array.isArray(value.discoveredCapabilities)) {
    const parsed = value.discoveredCapabilities
      .filter(isRecord)
      .slice(0, 8)
      .map((raw, index) => normalizeDraftCapability(raw, index))
      .filter((capability): capability is AgentDraftCapability => Boolean(capability))
    if (parsed.length >= 4) {
      draft.discoveredCapabilities = parsed
    }
  }

  return draft
}

function normalizeDraftCapability(record: Record<string, unknown>, index: number): AgentDraftCapability | undefined {
  const name = asString(record.name)
  if (!name) {
    return undefined
  }
  const id = asString(record.id)?.replace(/\s+/g, '-') || slugify(name) || `discovered-${index + 1}`
  const kind = toCapabilityKind(record.kind)

  return {
    id: id.slice(0, 56),
    name: name.slice(0, 80),
    kind,
    provider: (asString(record.provider) ?? 'Frontend tool').slice(0, 64),
    description: (asString(record.description) ?? 'Simulated tool surface wired to the swarm.').slice(0, 220),
    permissions: asStringArray(record.permissions).slice(0, 6).length
      ? asStringArray(record.permissions).slice(0, 6)
      : defaultCapabilityPermissions(kind),
    inputs: asStringArray(record.inputs).slice(0, 6),
    confidence: asNumber(record.confidence),
    latency: (asString(record.latency) ?? '1.0s').slice(0, 24),
  }
}

function toCapabilityKind(value: unknown): AgentDraftCapability['kind'] {
  const raw = asString(value)?.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-') ?? ''
  switch (raw) {
    case 'crm':
    case 'research':
    case 'messaging':
    case 'calendar':
    case 'finance':
    case 'ops':
    case 'browser':
    case 'sensor':
    case 'memory':
    case 'creative':
    case 'safety':
    case 'commerce':
    case 'social':
    case 'health':
      return raw
    default:
      return 'research'
  }
}

function defaultCapabilityPermissions(kind: unknown): string[] {
  const k = toCapabilityKind(kind)
  switch (k) {
    case 'messaging':
      return ['Compose drafts']
    case 'calendar':
      return ['Plan milestones']
    case 'browser':
      return ['Open citations']
    case 'creative':
      return ['Draft summaries']
    case 'finance':
      return ['Read estimates']
    case 'crm':
      return ['Reference contacts']
    case 'social':
      return ['Search services']
    case 'commerce':
      return ['Compare listings']
    case 'sensor':
      return ['Preview inputs']
    case 'memory':
      return ['Recall notes']
    case 'ops':
      return ['Prepare packets']
    case 'health':
      return ['Educational resources only']
    case 'safety':
      return ['Flag escalations']
    default:
      return ['Read curated sources']
  }
}

async function createArtifactPacket(request: ExportArtifactRequest, root: string): Promise<ArtifactReceipt> {
  const useCaseTitle = request.useCase?.title?.trim() || 'Generated Surface'
  const slug = slugify(useCaseTitle)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const id = `${slug}-${stamp}`
  const outputDir = path.join(root, 'outputs', id)

  await fs.mkdir(outputDir, { recursive: true })

  const manifest = isRecord(request.manifest) ? request.manifest : {}
  const steps = Array.isArray(request.steps) ? request.steps : []
  const files = request.useCase?.id === 'security-deposit-dispute'
    ? buildDepositDisputeFiles(request, manifest, steps)
    : [
    {
      name: 'manifest.json',
      label: 'Runtime manifest',
      purpose: 'The exact generated UI manifest rendered in the app.',
      content: `${JSON.stringify(manifest, null, 2)}\n`,
    },
    {
      name: 'action-packet.md',
      label: 'Action packet',
      purpose: 'Human-readable plan, risks, controls, and approved next steps.',
      content: renderActionPacket(request, steps, manifest),
    },
    {
      name: 'submission.md',
      label: 'Hackathon submission draft',
      purpose: 'Copy-ready project name, pitch, description, and protocol notes.',
      content: renderSubmissionDraft(request, manifest),
    },
    {
      name: 'tasks.json',
      label: 'Task list',
      purpose: 'Machine-readable task list for another agent or project tool.',
      content: `${JSON.stringify(
        steps.map((step, index) => ({
          id: step.id || `task-${index + 1}`,
          title: step.title,
          detail: step.detail,
          status: step.status || 'approved',
        })),
        null,
        2,
      )}\n`,
    },
    {
      name: 'argument-transcript.md',
      label: 'Argument transcript',
      purpose: 'The five-agent debate that produced the approved surface, plus closing fingerprint.',
      content: renderArgumentTranscript(request, manifest),
    },
    {
      name: 'surface.html',
      label: 'Standalone generated surface',
      purpose: 'Portable HTML summary of the generated task surface.',
      content: renderStandaloneSurface(request, manifest, steps),
    },
  ]

  for (const file of files) {
    await fs.writeFile(path.join(outputDir, file.name), file.content, 'utf8')
  }

  return {
    id,
    folder: path.relative(root, outputDir).replaceAll('\\', '/'),
    files: files.map((file) => ({
      label: file.label,
      path: path.relative(root, path.join(outputDir, file.name)).replaceAll('\\', '/'),
      purpose: file.purpose,
    })),
    summary: `Created ${files.length} local artifacts for ${useCaseTitle}.`,
  }
}

function renderActionPacket(
  request: ExportArtifactRequest,
  steps: ExportArtifactRequest['steps'] = [],
  manifest: Record<string, unknown> = {},
): string {
  const title = request.useCase?.title || 'Generated Surface'
  const closing = readClosingLines(manifest)
  const tagline = readReceiptTagline(manifest)
  const lines = readArgumentLines(manifest)
  const lensCount = lines.filter((line) => line.agent === 'lens').length
  const lastSpeaker = lines[lines.length - 1]?.agent

  const closingBlock = closing.length > 0
    ? closing.map((line) => `- **${agentDisplayName(line.agent)}:** ${line.text ?? ''}`).join('\n')
    : '_No closing lines recorded._'

  return `# ${title} Action Packet

## Intent
${request.intent || 'No intent provided.'}

## Provider
- Provider: ${request.providerLabel || 'Offline / unknown'}
- Model: ${request.model || 'n/a'}

## Approved Steps
${steps.map((step, index) => `${index + 1}. **${step.title}** - ${step.detail}`).join('\n') || '- No steps exported.'}

## Controls
\`\`\`json
${JSON.stringify(request.inputs ?? {}, null, 2)}
\`\`\`

## Five voices, one surface
${closingBlock}

> ${tagline || 'Five agents, one surface, no dashboard.'}

**Argument fingerprint:** ${lines.length} lines exchanged · Lens objected ${lensCount} time(s) · Last word: ${agentDisplayName(lastSpeaker ?? 'wild')}.
See \`argument-transcript.md\` for the full debate.

## What This File Is
This is the concrete artifact AgenticPrime created after approval. It is safe to edit, submit, hand to another agent, or use as the source of truth for the next build step.
`
}

function renderSubmissionDraft(
  request: ExportArtifactRequest,
  manifest: Record<string, unknown> = {},
): string {
  const title = request.useCase?.title || 'AgenticPrime Surface'
  const lines = readArgumentLines(manifest)
  const closing = readClosingLines(manifest)
  const tagline = readReceiptTagline(manifest)
  const lensCount = lines.filter((line) => line.agent === 'lens').length
  const lastSpeaker = lines[lines.length - 1]?.agent

  const closingBlock = closing.length > 0
    ? closing.map((line) => `- **${agentDisplayName(line.agent)}:** ${line.text ?? ''}`).join('\n')
    : '_No closing lines recorded._'

  return `# ${title}

## One-sentence pitch
Five agents argue. The app appears. AgenticPrime turns one user intent into an interactive runtime UI with controls, reasoning, a visible debate, a human approval gate, and exportable artifacts.

## What we built
An agentic interface that asks a model for a structured UI manifest, renders that manifest as an interactive surface while five named agents debate it out loud, lets the user approve the plan, then dissolves the surface and writes a local submission packet with the manifest, action plan, tasks, debate transcript, and a standalone HTML surface.

## Why it is generative UI, not a chatbot
The model is not answering in a chat transcript. It is producing the shape of the interface itself: cards, metrics, controls, timeline, approval gate, console, and checklist. The five-agent argument is rendered as a live, color-coded stream so the reasoning is visible, not hidden.

## Why this is theater, not just a tool
Five named agents (Sage, Forge, Lens, Echo, Wild) argue the surface into existence in real time. When the approval block enters, Lens objects on risk, Wild rebuts, and the block visibly shakes until a human gate is added. After approval, the surface dissolves on purpose — leaving a receipt that knows when to disappear.

## Argument fingerprint for this run
- Lines exchanged: ${lines.length}
- Times Lens objected: ${lensCount}
- Last word: ${agentDisplayName(lastSpeaker ?? 'wild')}

## Closing lines (in order)
${closingBlock}

> ${tagline || 'Five agents, one surface, no dashboard.'}

## Protocols / patterns used
- Runtime-generated UI manifest with author metadata per block
- Visible multi-agent debate with a real disagreement gate
- Cinematic dissolve with a durable receipt
- Local provider bridge through Vite
- BYOK model provider selection
- Exportable action packet (manifest, action plan, tasks, transcript, surface)

## Current intent
${request.intent || 'No intent provided.'}
`
}

type ArgumentLineExport = {
  agent?: string
  text?: string
  beat?: string
  proposedAt?: number
}

type ClosingLineExport = {
  agent?: string
  text?: string
}

function readArgumentLines(manifest: Record<string, unknown>): ArgumentLineExport[] {
  const value = manifest.argument
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).map((entry) => ({
    agent: asString(entry.agent),
    text: asString(entry.text),
    beat: asString(entry.beat),
    proposedAt: typeof entry.proposedAt === 'number' ? entry.proposedAt : undefined,
  }))
}

function readClosingLines(manifest: Record<string, unknown>): ClosingLineExport[] {
  const value = manifest.closingLines
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).map((entry) => ({
    agent: asString(entry.agent),
    text: asString(entry.text),
  }))
}

function readReceiptTagline(manifest: Record<string, unknown>): string {
  return asString(manifest.receiptTagline) ?? ''
}

function agentDisplayName(id: string | undefined): string {
  switch (id) {
    case 'sage': return 'Sage'
    case 'forge': return 'Forge'
    case 'lens': return 'Lens'
    case 'echo': return 'Echo'
    case 'wild': return 'Wild'
    default: return id ?? 'Agent'
  }
}

function agentRoleName(id: string | undefined): string {
  switch (id) {
    case 'sage': return 'Strategist'
    case 'forge': return 'Builder'
    case 'lens': return 'Critic'
    case 'echo': return 'Synthesizer'
    case 'wild': return 'Wildcard'
    default: return ''
  }
}

function renderDebateSection(
  argumentLines: ArgumentLineExport[],
  closingLines: ClosingLineExport[],
  tagline: string,
  lensCount: number,
  lastSpeaker: string | undefined,
): string {
  if (argumentLines.length === 0 && closingLines.length === 0) {
    return ''
  }

  const lineMarkup = argumentLines
    .map((line) => {
      const beat = line.beat ?? 'open'
      const agent = line.agent ?? 'echo'
      const name = agentDisplayName(agent)
      const role = agentRoleName(agent)
      const text = line.text ?? ''
      return `<div class="debate-line agent-${escapeHtml(agent)} beat-${escapeHtml(beat)}"><div class="debate-meta"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(role)}</span><span style="margin-left:auto;text-transform:uppercase;letter-spacing:0.12em;">${escapeHtml(beat)}</span></div><p class="debate-text">${escapeHtml(text)}</p></div>`
    })
    .join('\n            ')

  const closingMarkup = closingLines
    .map((line) => {
      const agent = line.agent ?? 'echo'
      const name = agentDisplayName(agent)
      const text = line.text ?? ''
      return `<div class="closing-line agent-${escapeHtml(agent)}"><strong>${escapeHtml(name)}:</strong> <span>${escapeHtml(text)}</span></div>`
    })
    .join('\n            ')

  return `<section class="wide">
          <p class="eyebrow">Debate transcript</p>
          <p>The five-agent argument that produced this surface. Beat order: open, counter, settle, mic-drop.</p>
          <div class="debate">
            ${lineMarkup || '<p>No argument lines recorded.</p>'}
          </div>
          <div class="fingerprint">
            <div><span>Lines exchanged</span><strong>${argumentLines.length}</strong></div>
            <div><span>Times Lens objected</span><strong>${lensCount}</strong></div>
            <div><span>Last word</span><strong>${escapeHtml(agentDisplayName(lastSpeaker ?? 'wild'))}</strong></div>
          </div>
          <div class="closing">
            <p class="eyebrow" style="margin:0;">Closing fingerprint</p>
            ${closingMarkup || '<p>No closing lines recorded.</p>'}
          </div>
          <p class="tagline">&ldquo;${escapeHtml(tagline || 'Five agents, one surface, no dashboard.')}&rdquo;</p>
        </section>`
}

function renderArgumentTranscript(
  request: ExportArtifactRequest,
  manifest: Record<string, unknown>,
): string {
  const title = asString(manifest.title) ?? request.useCase?.title ?? 'Generated Surface'
  const lines = readArgumentLines(manifest)
  const closing = readClosingLines(manifest)
  const tagline = readReceiptTagline(manifest)
  const lensCount = lines.filter((line) => line.agent === 'lens').length
  const lastSpeaker = lines[lines.length - 1]?.agent

  const transcript = lines.length > 0
    ? lines
        .map((line, index) => {
          const name = agentDisplayName(line.agent)
          const role = agentRoleName(line.agent)
          const beat = line.beat ? ` _(${line.beat})_` : ''
          const text = line.text ?? ''
          return `${index + 1}. **${name}** (${role})${beat}: ${text}`
        })
        .join('\n')
    : '_No argument lines were recorded for this run._'

  const closingBlock = closing.length > 0
    ? closing
        .map((line) => `- **${agentDisplayName(line.agent)}:** ${line.text ?? ''}`)
        .join('\n')
    : '_No closing lines recorded._'

  return `# ${title} - Argument transcript

## What this is
The five-agent debate that produced the approved surface. AgenticPrime renders the swarm out loud during generation; this file is the durable record so the disagreement does not vanish with the dissolve.

## Tagline
> ${tagline || 'Five agents, one surface, no dashboard.'}

## Argument
${transcript}

## Argument fingerprint
- Lines exchanged: **${lines.length}**
- Times Lens objected: **${lensCount}**
- Last word: **${agentDisplayName(lastSpeaker ?? 'wild')}**

## Closing lines (in order)
${closingBlock}

## Generated by
Five arguing dinosaurs. Disagreement is the architecture.
`
}

function renderStandaloneSurface(
  request: ExportArtifactRequest,
  manifest: Record<string, unknown>,
  steps: ExportArtifactRequest['steps'] = [],
): string {
  const title = asString(manifest.title) || request.useCase?.title || 'AgenticPrime Surface'
  const subtitle = asString(manifest.subtitle) || request.useCase?.summary || ''
  const blocks = Array.isArray(manifest.blocks) ? manifest.blocks.filter(isRecord) : []
  const argumentLines = readArgumentLines(manifest)
  const closingLines = readClosingLines(manifest)
  const tagline = readReceiptTagline(manifest)
  const lensCount = argumentLines.filter((line) => line.agent === 'lens').length
  const lastSpeaker = argumentLines[argumentLines.length - 1]?.agent
  const debateSection = renderDebateSection(argumentLines, closingLines, tagline, lensCount, lastSpeaker)
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root { --bg: #020617; --panel: rgba(15, 23, 42, 0.78); --line: rgba(148, 163, 184, 0.24); --text: #f8fafc; --muted: #94a3b8; --cyan: #30d5c8; --violet: #a855f7; --amber: #f7d154; --rose: #fca5a5; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; padding: 32px; background: radial-gradient(circle at 8% 0%, rgba(48, 213, 200, 0.22), transparent 30%), radial-gradient(circle at 85% 12%, rgba(168, 85, 247, 0.2), transparent 34%), linear-gradient(135deg, #020617, #0f172a 52%, #111827); color: var(--text); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.55; }
      main { width: min(1180px, 100%); margin: 0 auto; }
      .topbar { display: flex; justify-content: space-between; gap: 16px; align-items: center; margin-bottom: 22px; color: var(--muted); }
      .brand { display: inline-flex; gap: 10px; align-items: center; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
      .orb { width: 12px; height: 12px; border-radius: 999px; background: linear-gradient(135deg, var(--cyan), var(--violet)); box-shadow: 0 0 24px var(--cyan); }
      .hero { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 22px; padding: 28px; border: 1px solid var(--line); border-radius: 30px; background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(2, 6, 23, 0.68)); box-shadow: 0 28px 90px rgba(0,0,0,0.38); overflow: hidden; }
      .eyebrow { margin: 0 0 10px; color: var(--cyan); font-size: 0.74rem; font-weight: 900; letter-spacing: 0.18em; text-transform: uppercase; }
      h1 { max-width: 760px; margin: 0; font-size: clamp(2.5rem, 7vw, 5.8rem); line-height: 0.9; letter-spacing: -0.065em; }
      .subtitle { max-width: 760px; color: #cbd5e1; font-size: 1.05rem; }
      .hero-visual { position: relative; min-height: 280px; border: 1px solid rgba(48, 213, 200, 0.22); border-radius: 28px; background: radial-gradient(circle at 50% 45%, rgba(48, 213, 200, 0.3), transparent 26%), rgba(2, 6, 23, 0.8); display: grid; place-items: center; }
      .dial { width: 220px; height: 220px; border-radius: 50%; background: conic-gradient(var(--cyan) 0 72%, var(--amber) 72% 88%, rgba(148, 163, 184, 0.2) 88%); display: grid; place-items: center; box-shadow: 0 0 60px rgba(48, 213, 200, 0.22); }
      .dial-inner { width: 150px; height: 150px; border-radius: 50%; background: #020617; display: grid; place-items: center; text-align: center; padding: 18px; }
      .dial-inner strong { display: block; font-size: 2.4rem; line-height: 1; }
      .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
      .chip, .pill { padding: 8px 10px; border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 999px; color: #dbeafe; background: rgba(15, 23, 42, 0.72); font-size: 0.82rem; }
      .grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; margin-top: 18px; }
      section { grid-column: span 6; padding: 20px; border: 1px solid var(--line); border-radius: 24px; background: var(--panel); box-shadow: inset 0 1px 0 rgba(255,255,255,0.04); }
      section.wide { grid-column: span 12; }
      section.third { grid-column: span 4; }
      h2, h3 { margin: 0 0 12px; letter-spacing: -0.02em; }
      h2 { color: var(--text); font-size: 1.55rem; }
      h3 { color: var(--text); font-size: 1.1rem; }
      p, li { color: var(--muted); }
      code { color: #a7f3d0; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
      .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
      .card { padding: 14px; border: 1px solid rgba(148, 163, 184, 0.16); border-radius: 18px; background: rgba(2, 6, 23, 0.45); }
      .card strong { display: block; color: var(--text); margin-bottom: 6px; }
      .status-ready { border-color: rgba(48, 213, 200, 0.35); }
      .status-missing { border-color: rgba(252, 165, 165, 0.44); }
      .status-optional { border-color: rgba(247, 209, 84, 0.44); }
      .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
      .fact strong { display: block; color: var(--text); font-size: 1.45rem; }
      .letter { padding: 22px; border-radius: 18px; color: #172033; background: #f8fafc; box-shadow: 0 20px 60px rgba(0,0,0,0.25); }
      .letter pre { margin: 0; color: #172033; font: 0.95rem/1.65 Georgia, serif; white-space: pre-wrap; }
      .timeline { display: grid; gap: 10px; counter-reset: step; }
      .timeline-item { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: start; color: var(--muted); }
      .timeline-item:before { counter-increment: step; content: counter(step); width: 28px; height: 28px; display: grid; place-items: center; border-radius: 50%; color: #03111f; background: var(--cyan); font-weight: 900; }
      .console { max-height: 260px; overflow: auto; padding: 14px; border-radius: 16px; background: #020617; }
      .console code { display: block; margin-bottom: 6px; color: #a7f3d0; }
      .debate { display: grid; gap: 10px; }
      .debate-line { display: grid; gap: 4px; padding: 12px; border: 1px solid rgba(148, 163, 184, 0.16); border-left: 3px solid var(--author-color, var(--cyan)); border-radius: 14px; background: rgba(2, 6, 23, 0.6); color: var(--text); }
      .debate-line.beat-counter { background: linear-gradient(0deg, rgba(247, 209, 84, 0.06), rgba(247, 209, 84, 0.06)), rgba(2, 6, 23, 0.7); }
      .debate-line.beat-settle { background: linear-gradient(0deg, rgba(48, 213, 200, 0.06), rgba(48, 213, 200, 0.06)), rgba(2, 6, 23, 0.7); }
      .debate-line.beat-mic-drop { background: linear-gradient(0deg, rgba(244, 114, 182, 0.1), rgba(244, 114, 182, 0.1)), rgba(2, 6, 23, 0.78); }
      .debate-meta { display: flex; align-items: center; gap: 8px; font-size: 0.78rem; color: var(--muted); }
      .debate-meta strong { color: var(--author-color, var(--cyan)); font-weight: 900; letter-spacing: 0.04em; }
      .debate-text { margin: 0; color: var(--text); font-size: 0.94rem; }
      .agent-sage { --author-color: var(--violet); }
      .agent-forge { --author-color: var(--cyan); }
      .agent-lens { --author-color: var(--amber); }
      .agent-echo { --author-color: #e2e8f0; }
      .agent-wild { --author-color: #f472b6; }
      .fingerprint { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
      .fingerprint > div { padding: 10px 12px; border: 1px solid rgba(148, 163, 184, 0.16); border-radius: 14px; background: rgba(15, 23, 42, 0.6); }
      .fingerprint span { display: block; color: var(--muted); font-size: 0.7rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
      .fingerprint strong { color: var(--text); font-size: 1.08rem; }
      .closing { display: grid; gap: 6px; margin-top: 14px; padding: 14px; border: 1px solid rgba(148, 163, 184, 0.16); border-radius: 16px; background: rgba(2, 6, 23, 0.6); }
      .closing-line { display: flex; gap: 8px; padding: 4px 0; border-bottom: 1px dashed rgba(148, 163, 184, 0.12); }
      .closing-line:last-child { border-bottom: none; }
      .closing-line strong { color: var(--author-color, var(--cyan)); font-weight: 900; }
      .closing-line span { color: var(--muted); font-style: italic; }
      .tagline { margin: 14px 0 0; padding: 12px 14px; border-left: 3px solid #f472b6; border-radius: 0 14px 14px 0; background: rgba(244, 114, 182, 0.08); color: var(--text); font-style: italic; }
      .footer { margin: 22px 0 0; color: var(--muted); font-size: 0.9rem; }
      @media (max-width: 900px) { body { padding: 18px; } .hero { grid-template-columns: 1fr; } section, section.third { grid-column: span 12; } }
    </style>
  </head>
  <body>
    <main>
      <div class="topbar">
        <span class="brand"><span class="orb"></span> AgenticPrime</span>
        <code>Standalone generated surface</code>
      </div>
      <div class="hero">
        <div>
          <p class="eyebrow">Generated workspace</p>
          <h1>${escapeHtml(title)}</h1>
          <p class="subtitle">${escapeHtml(subtitle || request.intent || '')}</p>
          <div class="chips">${renderHeroChips(blocks)}</div>
        </div>
        <div class="hero-visual">
          <div class="dial"><div class="dial-inner"><span>Packet</span><strong>${surfaceReadiness(blocks)}</strong><span>ready</span></div></div>
        </div>
      </div>
      <div class="grid">
        ${blocks.map(renderSurfaceBlock).join('\n        ')}
        <section class="wide">
          <p class="eyebrow">Approved steps</p>
          <div class="timeline">
            ${steps.map((step) => `<div class="timeline-item"><div><strong>${escapeHtml(step.title)}</strong><p>${escapeHtml(step.detail)}</p></div></div>`).join('\n            ')}
          </div>
        </section>
        ${debateSection}
      </div>
      <p class="footer">Generated locally by AgenticPrime. Five agents argued. The app appeared. Then it dissolved on purpose.</p>
    </main>
  </body>
</html>
`
}

function renderHeroChips(blocks: Record<string, unknown>[]): string {
  const hero = blocks.find((block) => asString(block.kind) === 'hero')
  const chips = Array.isArray(hero?.chips) ? hero.chips.filter((chip): chip is string => typeof chip === 'string') : []
  return chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join('')
}

function surfaceReadiness(blocks: Record<string, unknown>[]): string {
  const metrics = blocks.find((block) => asString(block.kind) === 'metricStrip')
  const metricList = Array.isArray(metrics?.metrics) ? metrics.metrics.filter(isRecord) : []
  const readiness = metricList.find((metric) => asString(metric.label)?.toLowerCase().includes('readiness'))
  return asString(readiness?.value) || 'Live'
}

function renderSurfaceBlock(block: Record<string, unknown>): string {
  const kind = asString(block.kind)
  const title = asString(block.title) || kind || 'Generated block'

  if (kind === 'hero') {
    return ''
  }

  if (kind === 'protocolPanel') {
    const protocols = getRecordArray(block.protocols)
    return `<section class="wide">
          <p class="eyebrow">Protocol layer</p>
          <h2>${escapeHtml(title)}</h2>
          <div class="card-grid">
            ${protocols.map((protocol) => `<div class="card"><strong>${escapeHtml(asString(protocol.name) || '')}</strong><span class="pill">${escapeHtml(asString(protocol.status) || '')}</span><p>${escapeHtml(asString(protocol.detail) || '')}</p></div>`).join('\n            ')}
          </div>
        </section>`
  }

  if (kind === 'capabilityGrid') {
    const capabilities = getRecordArray(block.capabilities)
    return `<section class="wide">
          <p class="eyebrow">Tool stack</p>
          <h2>${escapeHtml(title)}</h2>
          <div class="card-grid">
            ${capabilities.map((capability) => `<div class="card"><strong>${escapeHtml(asString(capability.name) || '')}</strong><span class="pill">${escapeHtml(asString(capability.provider) || '')}</span><p>${escapeHtml(asString(capability.description) || '')}</p></div>`).join('\n            ')}
          </div>
        </section>`
  }

  if (kind === 'resourceLauncher') {
    const resources = getRecordArray(block.resources)
    return `<section class="wide">
          <p class="eyebrow">Real web resources</p>
          <h2>${escapeHtml(title)}</h2>
          <div class="card-grid">
            ${resources.map((resource) => `<a class="card" href="${escapeHtml(asString(resource.url) || '#')}" target="_blank" rel="noreferrer"><strong>${escapeHtml(asString(resource.label) || 'Resource')}</strong><span class="pill">${escapeHtml(asString(resource.source) || 'Web')}</span><p>${escapeHtml(asString(resource.detail) || '')}</p></a>`).join('\n            ')}
          </div>
        </section>`
  }

  if (kind === 'imageIntake') {
    return `<section>
          <p class="eyebrow">Image intake</p>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(asString(block.description) || '')}</p>
          <p class="pill">${escapeHtml(asString(block.caution) || 'Preview images in the live app.')}</p>
        </section>`
  }

  if (kind === 'form') {
    const fields = getRecordArray(block.fields)
    return `<section class="wide">
          <p class="eyebrow">Shared state</p>
          <h2>${escapeHtml(title)}</h2>
          <div class="facts">
            ${fields.map((field) => `<div class="card fact"><span>${escapeHtml(asString(field.label) || '')}</span><strong>${escapeHtml(String(field.value ?? ''))}</strong></div>`).join('\n            ')}
          </div>
        </section>`
  }

  if (kind === 'jurisdictionCard') {
    return `<section class="third">
          <p class="eyebrow">Jurisdiction</p>
          <h2>${escapeHtml(title)}</h2>
          <div class="card fact"><span>Deadline</span><strong>${escapeHtml(asString(block.deadline) || '')}</strong></div>
          <p>${escapeHtml(asString(block.rule) || '')}</p>
          <span class="pill">${escapeHtml(asString(block.risk) || '')}</span>
        </section>`
  }

  if (kind === 'evidenceMatrix') {
    const items = getRecordArray(block.items)
    return `<section>
          <p class="eyebrow">Evidence</p>
          <h2>${escapeHtml(title)}</h2>
          <div class="card-grid">
            ${items.map((item) => {
              const status = asString(item.status) || 'optional'
              return `<div class="card status-${escapeHtml(status)}"><strong>${escapeHtml(asString(item.label) || '')}</strong><span class="pill">${escapeHtml(status)}</span><p>${escapeHtml(asString(item.detail) || '')}</p></div>`
            }).join('\n            ')}
          </div>
        </section>`
  }

  if (kind === 'demandLetter') {
    return `<section class="wide">
          <p class="eyebrow">Artifact preview</p>
          <h2>${escapeHtml(title)} · ${escapeHtml(asString(block.amount) || '')}</h2>
          <div class="letter"><pre>${escapeHtml(asString(block.body) || '')}</pre></div>
        </section>`
  }

  if (kind === 'metricStrip') {
    const metrics = getRecordArray(block.metrics)
    return `<section>
          <p class="eyebrow">Live metrics</p>
          <h2>Case status</h2>
          <div class="facts">
            ${metrics.map((metric) => `<div class="card fact"><span>${escapeHtml(asString(metric.label) || '')}</span><strong>${escapeHtml(asString(metric.value) || '')}</strong><p>${escapeHtml(asString(metric.detail) || '')}</p></div>`).join('\n            ')}
          </div>
        </section>`
  }

  if (kind === 'timeline') {
    const steps = getRecordArray(block.steps)
    return `<section>
          <p class="eyebrow">Agent plan</p>
          <h2>${escapeHtml(title)}</h2>
          <div class="timeline">
            ${steps.map((step) => `<div class="timeline-item"><div><strong>${escapeHtml(asString(step.title) || '')}</strong><p>${escapeHtml(asString(step.detail) || '')}</p></div></div>`).join('\n            ')}
          </div>
        </section>`
  }

  if (kind === 'approvalCard') {
    const actions = Array.isArray(block.actions) ? block.actions.filter((action): action is string => typeof action === 'string') : []
    return `<section class="third">
          <p class="eyebrow">Approval gate</p>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(asString(block.description) || '')}</p>
          <span class="pill">${escapeHtml(asString(block.risk) || '')}</span>
          <ul>${actions.map((action) => `<li>${escapeHtml(action)}</li>`).join('')}</ul>
        </section>`
  }

  if (kind === 'toolConsole') {
    const lines = Array.isArray(block.lines) ? block.lines.filter((line): line is string => typeof line === 'string') : []
    return `<section class="wide">
          <p class="eyebrow">Inspectable event stream</p>
          <h2>${escapeHtml(title)}</h2>
          <div class="console">${lines.map((line) => `<code>${escapeHtml(line)}</code>`).join('')}</div>
        </section>`
  }

  return ''
}

function getRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function buildDepositDisputeFiles(
  request: ExportArtifactRequest,
  manifest: Record<string, unknown>,
  steps: ExportArtifactRequest['steps'] = [],
) {
  const inputs = isRecord(request.inputs) ? request.inputs : {}
  const state = asString(inputs.state) || 'MA'
  const amount = asRawNumber(inputs.deposit_amount, 1800)
  const daysWaited = asNumber(inputs.days_waited)
  const landlord = asString(inputs.landlord) || 'Property Manager'
  const reason = asString(inputs.reason) || 'No itemized reason provided.'
  const evidence = asString(inputs.evidence) || 'Lease, deposit receipt, photos, messages.'
  const rule = exportDepositRuleFor(state)
  const letter = exportDemandLetter({ state, amount, daysWaited, landlord, reason, evidence, rule })
  const evidenceItems = exportEvidenceItems(evidence)

  return [
    {
      name: 'manifest.json',
      label: 'Runtime manifest',
      purpose: 'The exact domain-specific UI manifest rendered in the app.',
      content: `${JSON.stringify(manifest, null, 2)}\n`,
    },
    {
      name: 'demand-letter.html',
      label: 'Demand letter',
      purpose: 'Editable HTML demand letter generated from the current facts.',
      content: renderDemandLetterHtml(request, letter),
    },
    {
      name: 'evidence-index.json',
      label: 'Evidence index',
      purpose: 'Machine-readable evidence checklist with ready/missing status.',
      content: `${JSON.stringify(evidenceItems, null, 2)}\n`,
    },
    {
      name: 'case-timeline.md',
      label: 'Case timeline',
      purpose: 'Timeline and next-action sequence based on jurisdiction and move-out date.',
      content: `# Case Timeline

## Current State
- Jurisdiction: ${state}
- Deposit amount: $${amount.toLocaleString()}
- Days since move-out: ${daysWaited}
- Rule used: ${rule.copy}

## Agent Tool Steps
${steps.map((step, index) => `${index + 1}. **${step.title}** - ${step.detail}`).join('\n')}

## Recommended Next Moves
1. Attach evidence listed in \`evidence-index.json\`.
2. Review \`demand-letter.html\` for accuracy.
3. Send the letter only after verifying local rules.
4. If no response arrives within 7 days, use the filing checklist.
`,
    },
    {
      name: 'filing-checklist.md',
      label: 'Filing checklist',
      purpose: 'Escalation checklist if the landlord ignores the demand.',
      content: `# Filing Checklist

- [ ] Verify the exact ${state} deadline and penalty rule.
- [ ] Print or save lease agreement.
- [ ] Attach deposit payment proof.
- [ ] Attach move-in and move-out photos/videos.
- [ ] Attach message history with landlord.
- [ ] Save copy of sent demand letter.
- [ ] Calendar follow-up deadline 7 days after sending.
- [ ] Prepare small-claims filing or tenant advocacy intake if no response.
`,
    },
    {
      name: 'argument-transcript.md',
      label: 'Argument transcript',
      purpose: 'The five-agent debate that produced the dispute workspace, plus closing fingerprint.',
      content: renderArgumentTranscript(request, manifest),
    },
    {
      name: 'surface.html',
      label: 'Standalone generated surface',
      purpose: 'Portable HTML summary of the generated dispute workspace.',
      content: renderStandaloneSurface(request, manifest, steps),
    },
  ]
}

function buildMcpAppsCatalog() {
  return {
    serverId: 'agenticprime-bureaucracy-killer',
    name: 'AgenticPrime Bureaucracy Killer MCP Apps',
    transport: { type: 'http', url: '/api/mcp/apps' },
    tools: [
      {
        name: 'tenant_law_lookup',
        description: 'Resolve state-specific security deposit deadline and demand language.',
        uiResource: 'mcp-ui://tenant-law/jurisdiction-card',
        inputSchema: { state: 'string', daysWaited: 'number' },
      },
      {
        name: 'evidence_indexer',
        description: 'Render evidence status and missing document checklist.',
        uiResource: 'mcp-ui://document-kit/evidence-matrix',
        inputSchema: { evidenceText: 'string' },
      },
      {
        name: 'demand_letter_drafter',
        description: 'Render editable demand letter preview from case state.',
        uiResource: 'mcp-ui://letter-kit/demand-letter',
        inputSchema: { state: 'string', amount: 'number', landlord: 'string', reason: 'string' },
      },
      {
        name: 'packet_exporter',
        description: 'Write demand letter, evidence index, timeline, and filing checklist.',
        uiResource: 'mcp-ui://packet-kit/export-receipt',
        inputSchema: { manifest: 'object', approved: 'boolean' },
      },
    ],
  }
}

function buildA2UiSchema() {
  return {
    name: 'deposit-dispute-workspace.v1',
    description: 'Declarative schema for generated security-deposit dispute UI.',
    blocks: [
      { kind: 'jurisdictionCard', required: ['state', 'deadline', 'rule', 'risk'] },
      { kind: 'evidenceMatrix', required: ['items'] },
      { kind: 'demandLetter', required: ['recipient', 'amount', 'body'] },
      { kind: 'approvalCard', required: ['risk', 'actions'] },
      { kind: 'toolConsole', required: ['lines'] },
    ],
    stateBindings: ['state', 'deposit_amount', 'days_waited', 'landlord', 'reason', 'evidence'],
    outputArtifacts: ['demand-letter.html', 'evidence-index.json', 'case-timeline.md', 'filing-checklist.md'],
  }
}

function buildAgUiEventStream(input: Record<string, unknown>) {
  return {
    runId: `agui-${Date.now()}`,
    protocol: 'AG-UI-compatible-event-snapshot',
    events: [
      { type: 'RUN_STARTED', timestamp: new Date().toISOString(), input },
      { type: 'TOOL_CALL_STARTED', tool: 'tenant_law_lookup' },
      { type: 'STATE_DELTA', patch: { activeBlock: 'jurisdiction', source: 'tenant_law_lookup' } },
      { type: 'TOOL_CALL_STARTED', tool: 'evidence_indexer' },
      { type: 'STATE_DELTA', patch: { activeBlock: 'evidence', source: 'evidence_indexer' } },
      { type: 'TOOL_CALL_STARTED', tool: 'demand_letter_drafter' },
      { type: 'STATE_DELTA', patch: { activeBlock: 'letter', source: 'demand_letter_drafter' } },
      { type: 'RUN_FINISHED', artifacts: ['demand-letter.html', 'evidence-index.json', 'case-timeline.md'] },
    ],
  }
}

async function buildWebResources(request: WebResourceRequest): Promise<WebResource[]> {
  const useCase = findUseCase(request.useCase?.id ?? '')
  const intent = request.intent?.trim() || useCase.intent
  const lower = `${useCase.title} ${useCase.summary} ${intent}`.toLowerCase()
  const curated = curatedResourcesFor(lower, intent)
  const searchResources = await searchDuckDuckGo(intent || useCase.title).catch(() => [])
  const merged = dedupeResources([...curated, ...searchResources]).slice(0, 8)
  const previewed = await Promise.all(
    merged.map(async (resource) => {
      const preview = await scrapePagePreview(resource.url).catch(() => undefined)
      return {
        ...resource,
        label: preview?.title || resource.label,
        detail: preview?.description || resource.detail,
        imageUrl: preview?.imageUrl || resource.imageUrl,
      }
    }),
  )

  return previewed
}

function curatedResourcesFor(lower: string, intent: string): WebResource[] {
  if (isHealthResourceIntent(lower)) {
    return [
      {
        id: 'hiv-gov-locator',
        label: 'Find HIV care, testing, and services',
        url: 'https://locator.hiv.gov/',
        source: 'HIV.gov',
        detail: 'Official US locator for testing, prevention, care, and support services.',
        urgency: 'soon',
      },
      {
        id: 'cdc-hiv-treatment',
        label: 'HIV treatment basics',
        url: 'https://www.cdc.gov/hiv/treatment/index.html',
        source: 'CDC',
        detail: 'CDC overview of treatment. This is educational, not a prescription.',
        urgency: 'soon',
      },
      {
        id: 'nih-hiv-medicines',
        label: 'HIV medicines and side effects',
        url: 'https://hivinfo.nih.gov/understanding-hiv/fact-sheets/hiv-medicines-and-side-effects',
        source: 'NIH HIVinfo',
        detail: 'NIH medicine overview to discuss with a clinician or pharmacist.',
        urgency: 'routine',
      },
      {
        id: 'medlineplus',
        label: 'MedlinePlus health topics',
        url: `https://medlineplus.gov/search/?query=${encodeURIComponent(intent)}`,
        source: 'MedlinePlus',
        detail: 'NIH consumer health information and topic search.',
        urgency: 'routine',
      },
      {
        id: 'emergency-911',
        label: 'Emergency help',
        url: 'https://www.911.gov/',
        source: '911.gov',
        detail: 'If symptoms are severe, immediate, or life-threatening, seek emergency care now.',
        urgency: 'urgent',
      },
    ]
  }

  return [
    {
      id: 'duckduckgo-direct',
      label: 'Open web search',
      url: `https://duckduckgo.com/?q=${encodeURIComponent(intent)}`,
      source: 'DuckDuckGo',
      detail: 'A real search page for source discovery. Verify before acting.',
      urgency: 'routine',
    },
    {
      id: 'perplexity-direct',
      label: 'Open source-backed answer search',
      url: `https://www.perplexity.ai/search?q=${encodeURIComponent(intent)}`,
      source: 'Perplexity',
      detail: 'Useful for finding citations and summaries in a browser tab.',
      urgency: 'routine',
    },
  ]
}

async function searchDuckDuckGo(query: string): Promise<WebResource[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`
  const json = await fetchJson(url, { method: 'GET', headers: { Accept: 'application/json' } })
  if (!isRecord(json)) {
    return []
  }

  const resources: WebResource[] = []
  const abstractUrl = asString(json.AbstractURL)
  if (abstractUrl) {
    resources.push({
      id: `ddg-${slugify(abstractUrl)}`,
      label: asString(json.Heading) || 'DuckDuckGo result',
      url: abstractUrl,
      source: asString(json.AbstractSource) || 'DuckDuckGo',
      detail: asString(json.AbstractText) || 'Search result returned by DuckDuckGo.',
      urgency: 'routine',
      imageUrl: toAbsoluteImageUrl(asString(json.Image), abstractUrl),
    })
  }

  const related = Array.isArray(json.RelatedTopics) ? json.RelatedTopics : []
  for (const topic of related) {
    const records = isRecord(topic) && Array.isArray(topic.Topics) ? topic.Topics : [topic]
    for (const record of records) {
      if (!isRecord(record)) continue
      const firstUrl = asString(record.FirstURL)
      if (!firstUrl) continue
      resources.push({
        id: `ddg-${slugify(firstUrl)}`,
        label: asString(record.Text)?.split(' - ')[0] || 'Related web resource',
        url: firstUrl,
        source: 'DuckDuckGo',
        detail: asString(record.Text) || 'Related topic returned by DuckDuckGo.',
        urgency: 'routine',
        imageUrl: toAbsoluteImageUrl(asString(readPath(record, ['Icon', 'URL'])), firstUrl),
      })
      if (resources.length >= 4) return resources
    }
  }

  return resources
}

async function scrapePagePreview(url: string): Promise<{ title?: string; description?: string; imageUrl?: string }> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'AgenticPrimeResourcePreview/1.0',
    },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) {
    throw new Error(`Preview failed: ${response.status}`)
  }
  const html = (await response.text()).slice(0, 250_000)
  const title = readMeta(html, 'og:title') || readTitle(html)
  const description = readMeta(html, 'og:description') || readMeta(html, 'description')
  const imageUrl = toAbsoluteImageUrl(readMeta(html, 'og:image') || readMeta(html, 'twitter:image'), url)
  return { title, description, imageUrl }
}

function dedupeResources(resources: WebResource[]): WebResource[] {
  const seen = new Set<string>()
  return resources.filter((resource) => {
    const key = resource.url.replace(/\/+$/, '')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function readMeta(html: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const propertyPattern = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i')
  const contentFirstPattern = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, 'i')
  return decodeHtml(propertyPattern.exec(html)?.[1] || contentFirstPattern.exec(html)?.[1] || '')
}

function readTitle(html: string): string | undefined {
  return decodeHtml(/<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1] || '')
}

function decodeHtml(value: string): string | undefined {
  const decoded = value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .trim()
  return decoded || undefined
}

function toAbsoluteImageUrl(value: string | undefined, pageUrl: string): string | undefined {
  if (!value) return undefined
  try {
    return new URL(value, pageUrl).toString()
  } catch {
    return undefined
  }
}

function isHealthResourceIntent(lower: string): boolean {
  return /health|medicine|medication|doctor|clinic|symptom|aids|hiv|prescription|pharmacy|drug|illness|infection|pain|urgent care/.test(lower)
}

function exportDepositRuleFor(state: string): { days: number; copy: string } {
  if (state === 'NY') {
    return { days: 14, copy: 'New York generally requires return or itemization within 14 days.' }
  }
  if (state === 'CA') {
    return { days: 21, copy: 'California generally requires return or itemization within 21 days.' }
  }
  if (state === 'MA') {
    return { days: 30, copy: 'Massachusetts generally requires return or itemization within 30 days.' }
  }
  return { days: 30, copy: 'Verify the exact state and local deadline before filing.' }
}

function exportDemandLetter({
  state,
  amount,
  daysWaited,
  landlord,
  reason,
  evidence,
  rule,
}: {
  state: string
  amount: number
  daysWaited: number
  landlord: string
  reason: string
  evidence: string
  rule: { copy: string }
}): string {
  return `Dear ${landlord},

I am requesting return of my $${amount.toLocaleString()} security deposit, or a complete itemized statement with supporting receipts.

It has been ${daysWaited} days since move-out. For ${state}, the rule I am relying on is: ${rule.copy}

Your stated reason was: ${reason}

My evidence packet includes: ${evidence}.

Please return the deposit or provide the required itemization within 7 days. If this is not resolved, I am prepared to use the attached evidence index and timeline for the next filing step.`
}

function renderDemandLetterHtml(request: ExportArtifactRequest, letter: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Security Deposit Demand Letter</title>
    <style>
      body { margin: 0; padding: 48px; background: #f8fafc; color: #0f172a; font-family: Georgia, serif; line-height: 1.65; }
      main { max-width: 760px; margin: 0 auto; background: white; padding: 48px; box-shadow: 0 20px 80px rgba(15, 23, 42, 0.14); }
      pre { white-space: pre-wrap; font: inherit; }
      .note { color: #64748b; font-family: Inter, system-ui, sans-serif; font-size: 0.9rem; }
    </style>
  </head>
  <body>
    <main>
      <p class="note">Generated by AgenticPrime. Not legal advice. Verify local law before sending.</p>
      <pre>${escapeHtml(letter)}</pre>
      <hr />
      <p class="note">Intent: ${escapeHtml(request.intent || '')}</p>
    </main>
  </body>
</html>
`
}

function exportEvidenceItems(evidence: string) {
  const lower = evidence.toLowerCase()
  return [
    { label: 'Lease agreement', status: lower.includes('lease') ? 'ready' : 'missing', detail: 'Proves lease terms and deposit amount.' },
    { label: 'Deposit payment proof', status: lower.includes('receipt') || lower.includes('payment') ? 'ready' : 'missing', detail: 'Shows amount paid and date.' },
    { label: 'Move-in/move-out photos or video', status: lower.includes('photo') || lower.includes('video') ? 'ready' : 'missing', detail: 'Counters damage claims.' },
    { label: 'Messages or emails', status: lower.includes('message') || lower.includes('text') || lower.includes('email') ? 'ready' : 'optional', detail: 'Shows requests and landlord response.' },
  ]
}

async function fetchJson(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(120_000),
  }).catch((error: unknown) => {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error(
        `Provider did not respond within 120s at ${url}. Reasoning models can be slow; try a faster model, or check that the endpoint is reachable.`,
      )
    }
    throw error
  })
  const text = await response.text()

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 500)}`)
  }

  return JSON.parse(text) as unknown
}

async function readJson<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = []

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T
}

function writeJson(res: ServerResponse, statusCode: number, body: unknown) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function requiredApiKey(request: GenerateUiRequest): string {
  const apiKey = request.apiKey?.trim()

  if (!apiKey) {
    throw new Error('API key is required for this provider.')
  }

  return apiKey
}

function requiredBaseUrl(request: GenerateUiRequest): string {
  const baseUrl = request.baseUrl?.trim()

  if (!baseUrl) {
    throw new Error('Endpoint URL is required for this provider.')
  }

  return baseUrl
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

function readPath(value: unknown, path: Array<string | number>): unknown {
  let current = value

  for (const part of path) {
    if (typeof part === 'number') {
      if (!Array.isArray(current)) {
        return undefined
      }
      current = current[part]
      continue
    }

    if (!isRecord(current)) {
      return undefined
    }

    current = current[part]
  }

  return current
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function asNumber(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : 10
}

function asRawNumber(value: unknown, fallback: number): number {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : fallback
}

function asUseCaseInputs(value: unknown): Record<string, string | number> {
  if (!isRecord(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string | number] => {
      const input = entry[1]
      return typeof input === 'string' || typeof input === 'number'
    }),
  )
}

function toTrend(value: unknown): 'up' | 'steady' | 'down' {
  return value === 'down' || value === 'steady' || value === 'up' ? value : 'steady'
}

function toColor(value: unknown): string {
  return value === 'violet' || value === 'amber' || value === 'cyan' ? value : 'cyan'
}

function toAgentVoice(value: unknown): AgentVoice {
  return value === 'sage' || value === 'forge' || value === 'lens' || value === 'echo' || value === 'wild'
    ? value
    : 'echo'
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48) || 'agenticprime-output'
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
