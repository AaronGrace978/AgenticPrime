import {
  CUSTOM_MODEL_VALUE,
  groupModels,
  providerOptions,
  type ProviderId,
  type ProviderOption,
} from '../providers'

type ProviderPanelProps = {
  apiKey: string
  baseUrl: string
  generationError: string
  isCustomModel: boolean
  isProviderReady: boolean
  isGenerating: boolean
  generationElapsedSeconds: number
  model: string
  onApiKey: (value: string) => void
  onBaseUrl: (value: string) => void
  onCancelGeneration: () => void
  onCustomModelToggle: (next: boolean) => void
  onOfflineFallback: () => void
  onModel: (value: string) => void
  onProvider: (id: ProviderId) => void
  provider: ProviderId
  providerStatus: string
  selectedProvider: ProviderOption
}

export function ProviderPanel({
  apiKey,
  baseUrl,
  generationError,
  isCustomModel,
  isProviderReady,
  isGenerating,
  generationElapsedSeconds,
  model,
  onApiKey,
  onBaseUrl,
  onCancelGeneration,
  onCustomModelToggle,
  onOfflineFallback,
  onModel,
  onProvider,
  provider,
  providerStatus,
  selectedProvider,
}: ProviderPanelProps) {
  const groupedModels = groupModels(selectedProvider.models)

  return (
    <div className="provider-panel">
      <div className="provider-heading">
        <div>
          <span>Model provider</span>
          <strong>
            {isProviderReady
              ? 'Ready'
              : selectedProvider.requiresBaseUrl
                ? 'Needs endpoint'
                : 'Needs key'}
          </strong>
        </div>
        <small>{selectedProvider.helper}</small>
      </div>
      <label htmlFor="provider">Generation backend</label>
      <select
        id="provider"
        value={provider}
        onChange={(event) => onProvider(event.target.value as ProviderId)}
      >
        {providerOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {selectedProvider.id !== 'offline' ? (
        <label className="api-key-field" htmlFor="model">
          <span>Model</span>
          {isCustomModel || selectedProvider.models.length === 0 ? (
            <div className="model-custom-row">
              <input
                id="model"
                placeholder="Custom model name"
                type="text"
                value={model}
                onChange={(event) => onModel(event.target.value)}
              />
              {selectedProvider.models.length > 0 ? (
                <button
                  className="model-toggle"
                  type="button"
                  onClick={() => onCustomModelToggle(false)}
                >
                  Choose from list
                </button>
              ) : null}
            </div>
          ) : (
            <select
              id="model"
              value={model}
              onChange={(event) => {
                if (event.target.value === CUSTOM_MODEL_VALUE) {
                  onCustomModelToggle(true)
                  return
                }
                onModel(event.target.value)
              }}
            >
              {groupedModels.ungrouped.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              {groupedModels.grouped.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value={CUSTOM_MODEL_VALUE}>Custom…</option>
            </select>
          )}
        </label>
      ) : null}
      {selectedProvider.supportsBaseUrl ? (
        <label className="api-key-field" htmlFor="base-url">
          <span>Endpoint</span>
          <input
            id="base-url"
            placeholder="https://your-provider.example.com"
            type="url"
            value={baseUrl}
            onChange={(event) => onBaseUrl(event.target.value)}
          />
        </label>
      ) : null}
      {selectedProvider.acceptsKey ? (
        <label className="api-key-field" htmlFor="api-key">
          <span>{selectedProvider.requiresKey ? 'API key, session only' : 'API key, optional'}</span>
          <input
            autoComplete="off"
            id="api-key"
            placeholder="Paste key for live agent mode"
            type="password"
            value={apiKey}
            onChange={(event) => onApiKey(event.target.value)}
          />
        </label>
      ) : null}
      {provider === 'ollamaLocal' && model.includes('cloud') ? (
        <div className="provider-warning" role="alert">
          <strong>Local cloud model:</strong> run <code>ollama signin</code>, then
          <code> ollama pull {model}</code>. Keep this endpoint on localhost; the local daemon handles auth.
        </div>
      ) : null}
      {provider === 'ollamaCloud' ? (
        <div className="provider-warning provider-info" role="note">
          <strong>Direct Ollama Cloud API:</strong> pick from the cloud catalog below and use an API key from
          ollama.com/settings/keys. Local <code>-cloud</code> / <code>:cloud</code> tags belong in Ollama local daemon.
        </div>
      ) : null}
      <p className="provider-note">
        {provider === 'offline'
          ? 'Offline swarm. Stage-safe. The agents are deterministic personas.'
          : 'Generate calls the selected provider through the local Vite API route. Keys are not stored.'}
      </p>
      {providerStatus ? (
        <div className="provider-status" role="status">
          <span className="provider-status-dot" />
          <div>
            <strong>{providerStatus}</strong>
            {isGenerating ? <small>{generationElapsedSeconds}s elapsed. Waiting for one JSON draft before the blocks animate.</small> : null}
          </div>
        </div>
      ) : null}
      {isGenerating && provider !== 'offline' ? (
        <div className="generation-controls">
          <button className="secondary-action" type="button" onClick={onCancelGeneration}>
            Cancel live call
          </button>
          <button className="primary-action" type="button" onClick={onOfflineFallback}>
            Use offline fallback now
          </button>
        </div>
      ) : null}
      {generationError ? <p className="provider-error">{generationError}</p> : null}
    </div>
  )
}
