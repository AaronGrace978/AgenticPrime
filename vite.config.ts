import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'

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
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'openrouter'
  | 'ollamaLocal'
  | 'ollamaCloud'
  | 'compatible'
  | 'agui'

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

const jsonHeaders = { 'Content-Type': 'application/json' }

async function generateUiDraft(request: GenerateUiRequest): Promise<AgentDraft> {
  const prompt = buildPrompt(request)

  switch (request.provider) {
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

Use case context: ${JSON.stringify(request.useCase ?? {}, null, 2)}

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
  "consoleLines": string[]
}

Rules:
- Generate a specific interface for THIS exact intent, not a generic dashboard.
- Each section should feel like one of the five agents authored it (Sage frames, Forge builds, Lens critiques, Echo synthesizes, Wild surprises).
- Make controls and actions feel executable; this is the surface a human will press to ship work.
- Keep strings short enough to fit in cards. Avoid filler.
- Use 3 metrics, 3-4 chart bars, 4 execution steps, 4 approval actions, 3 checklist items.
- Do not claim actions already happened; this is the pre-approval state.
- consoleLines should be 3-5 short receipt-style lines starting with "> ".

User intent:
${request.intent ?? ''}

Current control values:
${JSON.stringify(request.inputs ?? {}, null, 2)}

Discovered MCP-style capabilities:
${JSON.stringify(request.capabilities ?? [], null, 2)}
`
}

function parseDraft(text: string): AgentDraft {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Provider returned text, but no JSON object was found.')
  }

  const parsed = JSON.parse(text.slice(start, end + 1)) as unknown

  if (!isRecord(parsed)) {
    throw new Error('Provider returned JSON, but it was not an object.')
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

  return draft
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
      content: renderActionPacket(request, steps),
    },
    {
      name: 'submission.md',
      label: 'Hackathon submission draft',
      purpose: 'Copy-ready project name, pitch, description, and protocol notes.',
      content: renderSubmissionDraft(request),
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

function renderActionPacket(request: ExportArtifactRequest, steps: ExportArtifactRequest['steps'] = []): string {
  const title = request.useCase?.title || 'Generated Surface'
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

## What This File Is
This is the concrete artifact AgenticPrime created after approval. It is safe to edit, submit, hand to another agent, or use as the source of truth for the next build step.
`
}

function renderSubmissionDraft(request: ExportArtifactRequest): string {
  const title = request.useCase?.title || 'AgenticPrime Surface'
  return `# ${title}

## One-sentence pitch
AgenticPrime turns one user intent into an interactive runtime UI with controls, reasoning, approval, and exportable artifacts.

## What we built
An agentic interface that asks a model for a structured UI manifest, renders that manifest as an interactive surface, lets the user approve the plan, then writes a local submission packet with the manifest, action plan, tasks, and standalone surface.

## Why it is generative UI, not a chatbot
The model is not answering in a chat transcript. It is producing the shape of the interface itself: cards, metrics, controls, timeline, approval gate, console, and checklist.

## Protocols / patterns used
- Runtime-generated UI manifest
- Local provider bridge through Vite
- BYOK model provider selection
- Exportable action packet for downstream agents

## Current intent
${request.intent || 'No intent provided.'}
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
      </div>
      <p class="footer">Generated locally by AgenticPrime. This packet is an organized draft, not legal advice.</p>
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

function toTrend(value: unknown): 'up' | 'steady' | 'down' {
  return value === 'down' || value === 'steady' || value === 'up' ? value : 'steady'
}

function toColor(value: unknown): string {
  return value === 'violet' || value === 'amber' || value === 'cyan' ? value : 'cyan'
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
