import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { agentRoster } from './agents'
import { AgentRoster } from './components/AgentRoster'
import { ProviderPanel } from './components/ProviderPanel'
import { ReceiptDissolve } from './components/ReceiptDissolve'
import { RuntimeRenderer } from './components/RuntimeRenderer'
import { TimeScrubber } from './components/TimeScrubber'
import { UseCasePicker } from './components/UseCasePicker'
import {
  buildManifest,
  defaultInputsFor,
  emptyExecutionSteps,
} from './manifestBuilder'
import { findProvider, providerOptions, providerTip, type ProviderId } from './providers'
import { findUseCase, useCases } from './useCases'
import type { AgentDraft, AgentVoice, ArtifactReceipt, ExecutionStep } from './types'

type Stage = 'idle' | 'generating' | 'ready' | 'executing' | 'done' | 'dissolved'

const STREAM_INTERVAL_MS = 320
const LIVE_PROVIDER_TIMEOUT_MS = 120_000

function App() {
  const [useCaseId, setUseCaseId] = useState<string>(useCases[0].id)
  const useCase = useMemo(() => findUseCase(useCaseId), [useCaseId])

  const [inputs, setInputs] = useState<Record<string, string | number>>(() => defaultInputsFor(useCase))
  const [intent, setIntent] = useState<string>(useCase.intent)
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>(emptyExecutionSteps(useCase))
  const [agentDraft, setAgentDraft] = useState<AgentDraft | undefined>()
  const [stage, setStage] = useState<Stage>('idle')
  const [visibleBlocks, setVisibleBlocks] = useState(0)
  const [activeAuthor, setActiveAuthor] = useState<AgentVoice | undefined>()
  const [generationError, setGenerationError] = useState('')
  const [artifactReceipt, setArtifactReceipt] = useState<ArtifactReceipt | undefined>()

  const [provider, setProvider] = useState<ProviderId>('offline')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(providerOptions[0].defaultModel)
  const [baseUrl, setBaseUrl] = useState(providerOptions[0].defaultBaseUrl)
  const [isCustomModel, setIsCustomModel] = useState(false)
  const [providerStatus, setProviderStatus] = useState('')
  const [generationElapsedSeconds, setGenerationElapsedSeconds] = useState(0)
  const [showGuide, setShowGuide] = useState(
    () => window.sessionStorage.getItem('agenticprime-guide-seen') !== '1',
  )

  const streamTimerRef = useRef<number | undefined>(undefined)
  const generationControllerRef = useRef<AbortController | undefined>(undefined)
  const generationRequestRef = useRef(0)

  const selectedProvider = findProvider(provider)
  const hasProviderCredential = !selectedProvider.requiresKey || apiKey.trim().length > 0
  const hasProviderEndpoint = !selectedProvider.requiresBaseUrl || baseUrl.trim().length > 0
  const isProviderReady = hasProviderCredential && hasProviderEndpoint

  const manifest = useMemo(
    () =>
      buildManifest({
        useCase,
        inputs,
        executionSteps,
        agentDraft,
        intent,
        providerLabel: selectedProvider.label,
      }),
    [useCase, inputs, executionSteps, agentDraft, intent, selectedProvider.label],
  )
  const totalBlocks = manifest.blocks.length

  useEffect(
    () => () => {
      if (streamTimerRef.current !== undefined) {
        window.clearInterval(streamTimerRef.current)
      }
      generationControllerRef.current?.abort()
    },
    [],
  )

  useEffect(() => {
    if (stage !== 'generating' || provider === 'offline') {
      return
    }

    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      setGenerationElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [provider, stage])

  function startStreaming(targetCount: number) {
    if (streamTimerRef.current !== undefined) {
      window.clearInterval(streamTimerRef.current)
    }

    setVisibleBlocks(0)
    streamTimerRef.current = window.setInterval(() => {
      setVisibleBlocks((current) => {
        if (current >= targetCount) {
          if (streamTimerRef.current !== undefined) {
            window.clearInterval(streamTimerRef.current)
            streamTimerRef.current = undefined
          }
          setActiveAuthor(undefined)
          setStage('ready')
          return current
        }

        const nextCount = current + 1
        const nextMeta = manifest.meta[manifest.blocks[nextCount - 1]?.id]
        if (nextMeta) {
          setActiveAuthor(nextMeta.author)
        }
        return nextCount
      })
    }, STREAM_INTERVAL_MS)
  }

  async function generateSurface() {
    if (!isProviderReady || stage === 'generating') {
      return
    }

    const unsupportedReason = unsupportedReasonFor(useCase.id, intent)
    if (unsupportedReason) {
      setStage('generating')
      setGenerationError(unsupportedReason)
      setProviderStatus('')
      setExecutionSteps(emptyExecutionSteps(useCase))
      setVisibleBlocks(0)
      setArtifactReceipt(undefined)
      setAgentDraft({
        title: 'Unsupported request',
        subtitle: unsupportedReason,
        consoleLines: [
          `> unsupported intent :: ${intent}`,
          '> no Outlook / browser automation tool is wired',
          '> generated routing guard instead of pretending',
        ],
      })
      window.setTimeout(() => startStreaming(totalBlocks), 120)
      return
    }

    setStage('generating')
    setGenerationError('')
    setProviderStatus('')
    setExecutionSteps(emptyExecutionSteps(useCase))
    setVisibleBlocks(0)
    setGenerationElapsedSeconds(0)
    setArtifactReceipt(undefined)

    if (provider === 'offline') {
      setAgentDraft(undefined)
      window.setTimeout(() => startStreaming(totalBlocks), 220)
      return
    }

    const requestId = generationRequestRef.current + 1
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), LIVE_PROVIDER_TIMEOUT_MS)
    generationRequestRef.current = requestId
    generationControllerRef.current = controller

    setProviderStatus(`Calling ${selectedProvider.label} (${model || 'default model'}).`)

    try {
      const response = await fetch('/api/generate-ui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          apiKey,
          baseUrl,
          capabilities: useCase.capabilities,
          inputs,
          intent,
          model,
          provider,
          useCase: { id: useCase.id, title: useCase.title, summary: useCase.summary },
        }),
      })
      const payload = (await response.json()) as { draft?: AgentDraft; error?: string }

      if (generationRequestRef.current !== requestId) {
        return
      }

      if (!response.ok || !payload.draft) {
        throw new Error(payload.error ?? 'Provider did not return a UI draft.')
      }

      setProviderStatus('')
      setAgentDraft(payload.draft)
      startStreaming(totalBlocks)
    } catch (error) {
      if (generationRequestRef.current !== requestId) {
        return
      }
      const message = error instanceof Error ? error.message : 'Unknown provider error.'
      if (controller.signal.aborted) {
        setGenerationError('Live provider call was cancelled or timed out. Offline demo is still ready.')
        setProviderStatus('')
        setStage('idle')
        return
      }
      const tip = providerTip(provider, message)
      const display = tip ? `${message}\n\nTip: ${tip}` : message
      setGenerationError(display)
      setProviderStatus('')
      setAgentDraft({
        subtitle: `Live provider failed, so AgenticPrime kept the offline swarm ready. ${message}`,
        consoleLines: [
          `> live provider failed: ${message}`,
          ...(tip ? [`> hint: ${tip}`] : []),
          '> offline swarm fallback engaged',
        ],
      })
      startStreaming(totalBlocks)
    } finally {
      window.clearTimeout(timeoutId)
      if (generationRequestRef.current === requestId) {
        generationControllerRef.current = undefined
      }
    }
  }

  function activateOfflineFallback(reason = 'Live provider is still waiting, so the stage-safe offline swarm took over.') {
    generationRequestRef.current += 1
    generationControllerRef.current?.abort()
    generationControllerRef.current = undefined
    setProviderStatus('')
    setGenerationError(reason)
    setArtifactReceipt(undefined)
    setAgentDraft({
      subtitle: reason,
      consoleLines: [
        '> live provider bypassed by user',
        '> offline swarm fallback engaged',
        '> deterministic manifest ready for demo',
      ],
    })
    setStage('generating')
    startStreaming(totalBlocks)
  }

  function cancelLiveGeneration() {
    generationRequestRef.current += 1
    generationControllerRef.current?.abort()
    generationControllerRef.current = undefined
    setProviderStatus('')
    setGenerationError('Live provider call cancelled. Edit the setup or use Offline demo.')
    setArtifactReceipt(undefined)
    setStage('idle')
  }

  function closeGuide() {
    window.sessionStorage.setItem('agenticprime-guide-seen', '1')
    setShowGuide(false)
  }

  function updateInput(fieldId: string, value: string | number) {
    setInputs((current) => ({
      ...current,
      [fieldId]: value,
    }))
  }

  async function exportApprovedPacket(completedSteps: ExecutionStep[]) {
    try {
      const response = await fetch('/api/export-artifact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs,
          intent,
          manifest,
          model: provider === 'offline' ? undefined : model,
          providerLabel: selectedProvider.label,
          steps: completedSteps,
          useCase: { id: useCase.id, title: useCase.title, summary: useCase.summary },
        }),
      })
      const payload = (await response.json()) as { receipt?: ArtifactReceipt; error?: string }

      if (!response.ok || !payload.receipt) {
        throw new Error(payload.error ?? 'Export did not return a receipt.')
      }

      setArtifactReceipt(payload.receipt)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown export error.'
      setArtifactReceipt({
        id: 'export-failed',
        folder: 'outputs',
        files: [],
        summary: `Export failed: ${message}`,
      })
    }
  }

  function executePlan() {
    if (stage === 'executing') {
      return
    }

    const planSteps = emptyExecutionSteps(useCase)
    const completedSteps = planSteps.map<ExecutionStep>((step) => ({ ...step, status: 'done' }))

    setArtifactReceipt(undefined)
    setStage('executing')
    setExecutionSteps(planSteps)

    planSteps.forEach((step, index) => {
      window.setTimeout(() => {
        setExecutionSteps((current) =>
          current.map((currentStep) =>
            currentStep.id === step.id ? { ...currentStep, status: 'running' } : currentStep,
          ),
        )
      }, index * 720)

      window.setTimeout(
        () => {
          setExecutionSteps((current) =>
            current.map((currentStep) =>
              currentStep.id === step.id ? { ...currentStep, status: 'done' } : currentStep,
            ),
          )

          if (index === planSteps.length - 1) {
            setStage('done')
            void exportApprovedPacket(completedSteps).finally(() => {
              window.setTimeout(() => setStage('dissolved'), 900)
            })
          }
        },
        index * 720 + 520,
      )
    })
  }

  function replayGeneration() {
    if (stage === 'generating') {
      return
    }
    setStage('generating')
    startStreaming(totalBlocks)
  }

  function scrubTo(frame: number) {
    const clamped = Math.max(0, Math.min(totalBlocks, frame))
    setVisibleBlocks(clamped)
    if (streamTimerRef.current !== undefined) {
      window.clearInterval(streamTimerRef.current)
      streamTimerRef.current = undefined
    }
    if (clamped < totalBlocks) {
      setStage('generating')
    } else {
      setStage('ready')
    }
  }

  function pickUseCase(nextId: string) {
    if (nextId === useCaseId) {
      return
    }

    if (streamTimerRef.current !== undefined) {
      window.clearInterval(streamTimerRef.current)
      streamTimerRef.current = undefined
    }

    const nextUseCase = findUseCase(nextId)
    setUseCaseId(nextId)
    setInputs(defaultInputsFor(nextUseCase))
    setIntent(nextUseCase.intent)
    setExecutionSteps(emptyExecutionSteps(nextUseCase))
    setAgentDraft(undefined)
    setArtifactReceipt(undefined)
    setVisibleBlocks(0)
    setStage('idle')
    setActiveAuthor(undefined)
    setGenerationError('')
    setProviderStatus('')
  }

  function reforge() {
    setStage('idle')
    setExecutionSteps(emptyExecutionSteps(useCase))
    setVisibleBlocks(0)
    setActiveAuthor(undefined)
    setArtifactReceipt(undefined)
  }

  return (
    <main className="app-shell">
      <section className="intro-panel">
        <div className="brand-row">
          <span className="orb" />
          <strong>AgenticPrime</strong>
          <span>Intent-to-interface runtime</span>
          <button className="guide-link" type="button" onClick={() => setShowGuide(true)}>
            How this works
          </button>
        </div>

        <div className="hero-copy">
          <p className="eyebrow">Local generative UI runtime</p>
          <h1>A task surface assembles around your intent.</h1>
          <p>
            Describe the situation. AgenticPrime composes a temporary interface: controls, checks, a plan, and a
            human approval gate. Use offline mode for a deterministic run, or bring your own model provider.
          </p>
        </div>

        <div className="intent-card">
          <label htmlFor="intent">The intent the swarm is shaping</label>
          <textarea
            id="intent"
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            rows={3}
          />
          <PromptAssist useCaseTitle={useCase.title} onPick={setIntent} />
          <div className="intent-actions">
            <button
              className="secondary-action"
              type="button"
              onClick={() => setIntent(useCase.intent)}
            >
              Restore use-case intent
            </button>
            <button
              className="primary-action"
              disabled={!isProviderReady || stage === 'generating'}
              type="button"
              onClick={generateSurface}
            >
              {stage === 'generating' ? 'Generating surface…' : 'Generate surface'}
            </button>
          </div>

          <ProviderPanel
            apiKey={apiKey}
            baseUrl={baseUrl}
            generationError={generationError}
            isCustomModel={isCustomModel}
            isProviderReady={isProviderReady}
            isGenerating={stage === 'generating'}
            generationElapsedSeconds={generationElapsedSeconds}
            model={model}
            onApiKey={setApiKey}
            onBaseUrl={setBaseUrl}
            onCancelGeneration={cancelLiveGeneration}
            onCustomModelToggle={(next) => {
              setIsCustomModel(next)
              if (!next) {
                setModel(selectedProvider.defaultModel)
              } else {
                setModel('')
              }
            }}
            onOfflineFallback={() => activateOfflineFallback()}
            onModel={setModel}
            onProvider={(nextId) => {
              const next = findProvider(nextId)
              setProvider(next.id)
              setApiKey('')
              setBaseUrl(next.defaultBaseUrl)
              setModel(next.defaultModel)
              setIsCustomModel(false)
              setProviderStatus('')
              setGenerationError('')
            }}
            provider={provider}
            providerStatus={providerStatus}
            selectedProvider={selectedProvider}
          />
        </div>

        <div className="principle-row" aria-label="Product principles">
          <span>Temporary UI</span>
          <span>Visible reasoning</span>
          <span>Human approval</span>
          <span>Offline fallback</span>
          <span>Provider: {selectedProvider.label}</span>
          {provider !== 'offline' ? <span>Model: {model}</span> : null}
        </div>
      </section>

      <UseCasePicker useCases={useCases} selectedId={useCaseId} onSelect={pickUseCase} />

      <div className="swarm-grid">
        <AgentRoster
          activeAuthor={activeAuthor}
          meta={manifest.meta}
          visibleBlockCount={visibleBlocks}
        />
        <div className="swarm-main">
          {stage === 'dissolved' ? (
            <ReceiptDissolve artifactReceipt={artifactReceipt} useCase={useCase} onDismiss={reforge} />
          ) : (
            <RuntimeRenderer
              canExecute={stage === 'ready' || stage === 'idle'}
              manifest={manifest}
              onApprove={executePlan}
              onFieldChange={updateInput}
              visibleBlockCount={visibleBlocks}
            />
          )}
        </div>
      </div>

      <TimeScrubber
        currentFrame={visibleBlocks}
        meta={manifest.meta}
        onReplay={replayGeneration}
        onScrub={scrubTo}
        totalFrames={totalBlocks}
      />

      <div className="legend-row" aria-label="Author legend">
        {agentRoster.map((agent) => (
          <span
            key={agent.id}
            className={`legend-chip author-${agent.id}`}
            style={{ '--author-color': agent.color } as React.CSSProperties}
          >
            <span className="author-dot" /> {agent.name} — {agent.role}
          </span>
        ))}
      </div>
      {showGuide ? <ProductGuide onClose={closeGuide} /> : null}
    </main>
  )
}

function unsupportedReasonFor(useCaseId: string, intent: string): string | null {
  const lower = intent.toLowerCase()
  const asksForExternalApp =
    /\boutlook\b|\bemail\b|\bgmail\b|\binbox\b|\bbrowser\b|\bopen\b|\bclick\b|\bdownload\b/.test(lower)
  const isSecurityDepositIntent =
    /deposit|landlord|tenant|lease|rent|property manager|move-out|move out/.test(lower)

  if (useCaseId === 'security-deposit-dispute' && !isSecurityDepositIntent) {
    return asksForExternalApp
      ? 'This selected operator handles security-deposit disputes, not Outlook/browser automation. Pick or build an Email Operator with a real mail/browser tool before clicking emails.'
      : 'This intent does not match the selected Security Deposit Dispute operator. Pick a matching use case or restore the use-case intent.'
  }

  return null
}

function PromptAssist({
  useCaseTitle,
  onPick,
}: {
  useCaseTitle: string
  onPick: (intent: string) => void
}) {
  const examples = [
    `For ${useCaseTitle}, build me a practical surface with the next 3 actions, the main risk, and the one decision I need to approve.`,
    'I am a normal user. Explain the situation, show what matters first, and only simulate actions unless I approve.',
  ]

  return (
    <div className="prompt-assist" aria-label="Prompt examples">
      <span>Try a prompt:</span>
      {examples.map((example) => (
        <button className="prompt-chip" key={example} type="button" onClick={() => onPick(example)}>
          {example}
        </button>
      ))}
    </div>
  )
}

function ProductGuide({ onClose }: { onClose: () => void }) {
  return (
    <section className="guide-overlay" role="dialog" aria-modal="true" aria-label="How AgenticPrime works">
      <div className="guide-card">
        <div className="guide-heading">
          <div>
          <p className="eyebrow">Start here</p>
          <h2>What AgenticPrime does</h2>
          </div>
          <button className="secondary-action" type="button" onClick={onClose}>
            Close guide
          </button>
        </div>
        <p>
          AgenticPrime is an intent-to-interface runtime. Pick a use case, write the mission in plain English, and the
          visible agents assemble a temporary task surface for that moment.
        </p>
        <div className="guide-grid">
          <div>
            <h3>How to use it</h3>
            <ol>
              <li>Pick a card from the use case shelf.</li>
              <li>Leave the intent alone or replace it with one clear mission.</li>
              <li>Use Offline mode for the reliable local path, or configure a live provider.</li>
              <li>Click Generate surface and watch the nine blocks stream in.</li>
              <li>Approve the simulated execution to see the receipt ending.</li>
            </ol>
          </div>
          <div>
            <h3>What is real</h3>
            <p>
              The UI, provider calls, model JSON normalization, animation, and local API route are real. The capability
              cards and execution receipts are simulated unless you connect real tools behind them.
            </p>
          </div>
          <div>
            <h3>Provider advice</h3>
            <p>
              For reliability, start with Offline mode. For Ollama, use the dropdown catalog: local daemon models use
              the <code>-cloud</code> / <code>:cloud</code> variants after <code>ollama signin</code>; direct Cloud API
              models use catalog names like <code>kimi-k2.6</code>.
            </p>
          </div>
        </div>
        <a className="guide-doc-link" href="/user-guide.html" target="_blank" rel="noreferrer">
          Open full user guide
        </a>
      </div>
    </section>
  )
}

export default App
