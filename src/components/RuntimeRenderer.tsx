import { useState, type ChangeEvent } from 'react'
import { agentById } from '../agents'
import type {
  Capability,
  ControlField,
  ExecutionStatus,
  UiBlock,
  UiManifest,
  WebResource,
} from '../types'

type RuntimeRendererProps = {
  manifest: UiManifest
  visibleBlockCount: number
  canExecute: boolean
  onFieldChange: (fieldId: string, value: string | number) => void
  onApprove: () => void
  disputedBlockId?: string
}

const blockSpan: Record<UiBlock['kind'], string> = {
  hero: 'wide',
  capabilityGrid: 'wide',
  resourceLauncher: 'wide',
  imageIntake: 'half',
  form: 'half',
  metricStrip: 'half',
  barChart: 'third',
  timeline: 'third',
  approvalCard: 'third',
  toolConsole: 'half',
  checklist: 'half',
  protocolPanel: 'wide',
  jurisdictionCard: 'third',
  evidenceMatrix: 'half',
  demandLetter: 'wide',
  unsupportedIntent: 'wide',
}

export function RuntimeRenderer({
  manifest,
  visibleBlockCount,
  canExecute,
  onFieldChange,
  onApprove,
  disputedBlockId,
}: RuntimeRendererProps) {
  const visibleBlocks = manifest.blocks.slice(0, Math.max(0, visibleBlockCount))

  return (
    <section className="runtime-shell" aria-label="Generated agent interface">
      <div className="manifest-header">
        <div>
          <p className="eyebrow">Generated manifest</p>
          <h2>{manifest.title}</h2>
          <p>{manifest.subtitle}</p>
        </div>
        <div className="manifest-token">
          <span>for</span>
          <strong>{manifest.generatedFor}</strong>
        </div>
      </div>

      <div className="manifest-grid">
        {visibleBlocks.map((block, index) => {
          const meta = manifest.meta[block.id]
          const author = meta?.author ?? 'echo'
          const agent = agentById(author)
          const isDisputed = disputedBlockId === block.id
          return (
            <article
              key={block.id}
              className={`block block-${blockSpan[block.kind]} block-${block.kind} author-${author} ${isDisputed ? 'block-disputed' : ''}`}
              style={
                {
                  '--author-color': agent.color,
                  '--author-glow': agent.glow,
                  animationDelay: `${index * 90}ms`,
                } as React.CSSProperties
              }
              data-author={author}
            >
              <div className="block-attribution">
                <span className="author-dot" />
                <span className="author-name">{agent.name}</span>
                <span className="author-role">{agent.role}</span>
              </div>
              <ManifestBlock block={block} canExecute={canExecute} onApprove={onApprove} onFieldChange={onFieldChange} />
              {meta?.reasoning ? <p className="block-reasoning">{meta.reasoning}</p> : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}

type ManifestBlockProps = Pick<RuntimeRendererProps, 'canExecute' | 'onApprove' | 'onFieldChange'> & {
  block: UiBlock
}

function ManifestBlock({ block, canExecute, onApprove, onFieldChange }: ManifestBlockProps) {
  switch (block.kind) {
    case 'hero':
      return (
        <div className="hero-content">
          <p className="eyebrow">{block.eyebrow}</p>
          <h3>{block.title}</h3>
          <p>{block.body}</p>
          <div className="chip-row">
            {block.chips.map((chip) => (
              <span className="chip" key={chip}>
                {chip}
              </span>
            ))}
          </div>
        </div>
      )
    case 'capabilityGrid':
      return (
        <div>
          <div className="block-heading">
            <h3>{block.title}</h3>
            <span>{block.capabilities.length} tools composed</span>
          </div>
          <div className="capability-grid">
            {block.capabilities.map((capability) => (
              <CapabilityCard capability={capability} key={capability.id} />
            ))}
          </div>
        </div>
      )
    case 'resourceLauncher':
      return (
        <div>
          <div className="block-heading">
            <div>
              <p className="eyebrow">Real web resources</p>
              <h3>{block.title}</h3>
              <p>{block.description}</p>
            </div>
            <span>{block.resources.length} links</span>
          </div>
          <div className="resource-grid">
            {block.resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
          <p className="resource-tab-hint">
            Nothing embeds inside this app: click a card and your browser opens the site in a new tab.
          </p>
        </div>
      )
    case 'imageIntake':
      return (
        <ImageIntake
          accepted={block.accepted}
          caution={block.caution}
          description={block.description}
          title={block.title}
        />
      )
    case 'form':
      return (
        <div>
          <div className="block-heading">
            <div>
              <h3>{block.title}</h3>
              <p>{block.description}</p>
            </div>
          </div>
          <div className="generated-form">
            {block.fields.map((field) => (
              <GeneratedField field={field} key={field.id} onFieldChange={onFieldChange} />
            ))}
          </div>
        </div>
      )
    case 'metricStrip':
      return (
        <div className="metric-strip">
          {block.metrics.map((metric) => (
            <div className="metric-card" key={metric.label}>
              <span className={`trend trend-${metric.trend}`}>{metric.trend}</span>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
              <p>{metric.detail}</p>
            </div>
          ))}
        </div>
      )
    case 'barChart':
      return (
        <div>
          <div className="block-heading">
            <div>
              <h3>{block.title}</h3>
              <p>{block.description}</p>
            </div>
          </div>
          <div className="bar-chart">
            {block.data.map((datum) => (
              <div className="bar-row" key={datum.label}>
                <span>{datum.label}</span>
                <div className="bar-track">
                  <div
                    className={`bar-fill bar-${datum.color}`}
                    style={{ width: `${Math.max(8, datum.value)}%` }}
                  />
                </div>
                <strong>{datum.value}%</strong>
              </div>
            ))}
          </div>
        </div>
      )
    case 'timeline':
      return (
        <div>
          <h3>{block.title}</h3>
          <div className="timeline">
            {block.steps.map((step) => (
              <div className={`timeline-step step-${step.status}`} key={step.id}>
                <span className="status-dot" aria-label={statusLabel(step.status)} />
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    case 'approvalCard':
      return (
        <div className="approval-content">
          <p className="eyebrow">Human-in-the-loop gate</p>
          <h3>{block.title}</h3>
          <p>{block.description}</p>
          <div className="risk-pill">{block.risk}</div>
          <ul className="action-list">
            {block.actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
          <button className="primary-action" disabled={!canExecute} type="button" onClick={onApprove}>
            {canExecute ? 'Approve and export packet' : 'Packet staged'}
          </button>
        </div>
      )
    case 'toolConsole':
      return (
        <div>
          <h3>{block.title}</h3>
          <div className="console-lines">
            {block.lines.map((line, index) => (
              <code key={`${line}-${index}`}>{line}</code>
            ))}
          </div>
        </div>
      )
    case 'checklist':
      return (
        <div>
          <h3>{block.title}</h3>
          {block.items.map((item) => (
            <div className="check-item" key={item.label}>
              <span aria-hidden="true">{item.checked ? 'OK' : '--'}</span>
              <div>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )
    case 'protocolPanel':
      return (
        <div>
          <div className="block-heading">
            <h3>{block.title}</h3>
            <span>CopilotKit / MCP / AG-UI / A2UI</span>
          </div>
          <div className="protocol-grid">
            {block.protocols.map((protocol) => (
              <div className="protocol-card" key={protocol.name}>
                <strong>{protocol.name}</strong>
                <span>{protocol.status}</span>
                <p>{protocol.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )
    case 'jurisdictionCard':
      return (
        <div className="jurisdiction-card">
          <p className="eyebrow">Jurisdiction logic</p>
          <h3>{block.title}</h3>
          <div className="legal-facts">
            <span>State</span>
            <strong>{block.state}</strong>
            <span>Deadline</span>
            <strong>{block.deadline}</strong>
          </div>
          <p>{block.rule}</p>
          <div className="risk-pill">{block.risk}</div>
        </div>
      )
    case 'evidenceMatrix':
      return (
        <div>
          <h3>{block.title}</h3>
          <div className="evidence-grid">
            {block.items.map((item) => (
              <div className={`evidence-item evidence-${item.status}`} key={item.label}>
                <span>{item.status}</span>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )
    case 'demandLetter':
      return (
        <div className="letter-preview">
          <div className="block-heading">
            <div>
              <p className="eyebrow">Generated artifact preview</p>
              <h3>{block.title}</h3>
            </div>
            <span>{block.amount}</span>
          </div>
          <p><strong>To:</strong> {block.recipient}</p>
          <pre>{block.body}</pre>
        </div>
      )
    case 'unsupportedIntent':
      return (
        <div className="unsupported-intent">
          <p className="eyebrow">Routing guard</p>
          <h3>{block.title}</h3>
          <div className="intent-quote">{block.intent}</div>
          <p>{block.reason}</p>
          <ul className="action-list">
            {block.suggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )
  }
}

function ResourceCard({ resource }: { resource: WebResource }) {
  return (
    <a
      className={`resource-card resource-${resource.urgency ?? 'routine'}`}
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {resource.imageUrl ? <img alt="" src={resource.imageUrl} /> : <span className="resource-image-placeholder">WEB</span>}
      <div>
        <span>{resource.source}</span>
        <strong>{resource.label}</strong>
        <p>{resource.detail}</p>
      </div>
    </a>
  )
}

function ImageIntake({
  accepted,
  caution,
  description,
  title,
}: {
  accepted: string[]
  caution: string
  description: string
  title: string
}) {
  const [imageUrl, setImageUrl] = useState('')
  const [previews, setPreviews] = useState<string[]>([])

  function addUrlPreview() {
    const next = imageUrl.trim()
    if (!next) return
    setPreviews((current) => [next, ...current.filter((item) => item !== next)].slice(0, 6))
    setImageUrl('')
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith('image/'))
    for (const file of files.slice(0, 4)) {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (typeof result === 'string') {
          setPreviews((current) => [result, ...current].slice(0, 6))
        }
      }
      reader.readAsDataURL(file)
    }
    event.target.value = ''
  }

  return (
    <div className="image-intake">
      <div className="block-heading">
        <div>
          <p className="eyebrow">Image intake</p>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="image-intake-controls">
        <label className="field-shell">
          <span>Paste image URL</span>
          <input
            placeholder="https://example.com/image.jpg"
            type="url"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
          />
        </label>
        <button className="secondary-action" type="button" onClick={addUrlPreview}>
          Preview URL
        </button>
        <label className="field-shell">
          <span>Upload local image</span>
          <input accept={accepted.join(',')} type="file" multiple onChange={handleFiles} />
        </label>
      </div>
      <p className="image-caution">{caution}</p>
      {previews.length > 0 ? (
        <div className="image-preview-grid">
          {previews.map((preview, index) => (
            <a href={preview} key={`${preview}-${index}`} target="_blank" rel="noreferrer">
              <img alt={`Preview ${index + 1}`} src={preview} />
            </a>
          ))}
        </div>
      ) : (
        <div className="image-empty">Paste a URL or upload screenshots/photos to preview them here. No diagnosis is performed.</div>
      )}
    </div>
  )
}

function CapabilityCard({ capability }: { capability: Capability }) {
  return (
    <div className={`capability-card capability-${capability.kind}`}>
      <div className="capability-topline">
        <span>{capability.provider}</span>
        <strong>{capability.confidence}%</strong>
      </div>
      <h4>{capability.name}</h4>
      <p>{capability.description}</p>
      <div className="permission-row">
        {capability.permissions.map((permission) => (
          <span key={permission}>{permission}</span>
        ))}
      </div>
      <small>{capability.latency} expected</small>
    </div>
  )
}

function GeneratedField({
  field,
  onFieldChange,
}: {
  field: ControlField
  onFieldChange: (fieldId: string, value: string | number) => void
}) {
  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const nextValue = field.type === 'range' ? Number(event.target.value) : event.target.value
    onFieldChange(field.id, nextValue)
  }

  return (
    <label className="field-shell">
      <span>{field.label}</span>
      {field.type === 'select' ? (
        <select value={String(field.value)} onChange={handleChange}>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea value={String(field.value)} onChange={handleChange} rows={3} />
      ) : (
        <input
          max={field.max}
          min={field.min}
          step={field.step}
          type={field.type}
          value={field.value}
          onChange={handleChange}
        />
      )}
      {field.helper ? <small>{field.helper}</small> : null}
    </label>
  )
}

function statusLabel(status: ExecutionStatus) {
  if (status === 'done') {
    return 'Done'
  }

  if (status === 'running') {
    return 'Running'
  }

  return 'Pending'
}
