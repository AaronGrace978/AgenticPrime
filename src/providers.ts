export type ProviderId =
  | 'offline'
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'openrouter'
  | 'ollamaLocal'
  | 'ollamaCloud'
  | 'compatible'
  | 'agui'

export type ModelOption = {
  value: string
  label: string
  group?: string
}

export type ProviderOption = {
  id: ProviderId
  label: string
  helper: string
  requiresKey: boolean
  acceptsKey: boolean
  supportsBaseUrl: boolean
  requiresBaseUrl?: boolean
  defaultBaseUrl: string
  defaultModel: string
  models: ModelOption[]
}

export const CUSTOM_MODEL_VALUE = '__custom__'

type OllamaCloudCatalogModel = {
  directValue: string
  localValue: string
  label: string
  group: string
}

const ollamaCloudCatalog: OllamaCloudCatalogModel[] = [
  {
    directValue: 'kimi-k2.6',
    localValue: 'kimi-k2.6:cloud',
    label: 'Kimi K2.6 (native multimodal agentic)',
    group: 'Agentic / tool models',
  },
  {
    directValue: 'deepseek-v4-pro',
    localValue: 'deepseek-v4-pro:cloud',
    label: 'DeepSeek V4 Pro (1M context, reasoning modes)',
    group: 'Reasoning / long context',
  },
  {
    directValue: 'deepseek-v4-flash',
    localValue: 'deepseek-v4-flash:cloud',
    label: 'DeepSeek V4 Flash (fast MoE reasoning)',
    group: 'Reasoning / long context',
  },
  {
    directValue: 'deepseek-v3.2',
    localValue: 'deepseek-v3.2:cloud',
    label: 'DeepSeek V3.2 (efficient reasoning)',
    group: 'Reasoning / long context',
  },
  {
    directValue: 'gemma4',
    localValue: 'gemma4:cloud',
    label: 'Gemma 4 (reasoning, coding, multimodal)',
    group: 'Multimodal / general',
  },
  {
    directValue: 'qwen3.5',
    localValue: 'qwen3.5:cloud',
    label: 'Qwen 3.5 (multimodal, utility)',
    group: 'Multimodal / general',
  },
  {
    directValue: 'glm-5.1',
    localValue: 'glm-5.1:cloud',
    label: 'GLM 5.1 (agentic engineering)',
    group: 'Agentic / tool models',
  },
  {
    directValue: 'qwen3-coder-next',
    localValue: 'qwen3-coder-next:cloud',
    label: 'Qwen3 Coder Next (agentic coding)',
    group: 'Coding / software agents',
  },
  {
    directValue: 'devstral-small-2:24b',
    localValue: 'devstral-small-2:24b-cloud',
    label: 'Devstral Small 2 24B (codebase agent)',
    group: 'Coding / software agents',
  },
  {
    directValue: 'minimax-m2.7',
    localValue: 'minimax-m2.7:cloud',
    label: 'MiniMax M2.7 (coding, agentic workflows)',
    group: 'Agentic / tool models',
  },
  {
    directValue: 'minimax-m2.5',
    localValue: 'minimax-m2.5:cloud',
    label: 'MiniMax M2.5 (productivity, coding)',
    group: 'Agentic / tool models',
  },
  {
    directValue: 'minimax-m2.1',
    localValue: 'minimax-m2.1:cloud',
    label: 'MiniMax M2.1 (multilingual engineering)',
    group: 'Agentic / tool models',
  },
  {
    directValue: 'nemotron-3-super:120b',
    localValue: 'nemotron-3-super:120b-cloud',
    label: 'Nemotron 3 Super 120B (multi-agent efficiency)',
    group: 'Agentic / tool models',
  },
  {
    directValue: 'nemotron-3-nano',
    localValue: 'nemotron-3-nano:cloud',
    label: 'Nemotron 3 Nano (efficient agentic model)',
    group: 'Efficient / smaller',
  },
  {
    directValue: 'glm-5',
    localValue: 'glm-5:cloud',
    label: 'GLM 5 (complex systems engineering)',
    group: 'Reasoning / long context',
  },
  {
    directValue: 'glm-4.7',
    localValue: 'glm-4.7:cloud',
    label: 'GLM 4.7 (advanced coding)',
    group: 'Coding / software agents',
  },
  {
    directValue: 'qwen3-next:80b',
    localValue: 'qwen3-next:80b-cloud',
    label: 'Qwen3 Next 80B (parameter-efficient)',
    group: 'Efficient / smaller',
  },
  {
    directValue: 'gemini-3-flash-preview',
    localValue: 'gemini-3-flash-preview:cloud',
    label: 'Gemini 3 Flash Preview (frontier speed)',
    group: 'Fast / demo friendly',
  },
  {
    directValue: 'ministral-3',
    localValue: 'ministral-3:cloud',
    label: 'Ministral 3 (edge-friendly)',
    group: 'Efficient / smaller',
  },
  {
    directValue: 'rnj-1:8b',
    localValue: 'rnj-1:8b-cloud',
    label: 'RNJ-1 8B (code and STEM)',
    group: 'Efficient / smaller',
  },
  {
    directValue: 'kimi-k2.5',
    localValue: 'kimi-k2.5:cloud',
    label: 'Kimi K2.5 (multimodal agentic)',
    group: 'Agentic / tool models',
  },
  {
    directValue: 'gpt-oss:120b',
    localValue: 'gpt-oss:120b-cloud',
    label: 'GPT OSS 120B (docs example, large)',
    group: 'Docs examples',
  },
  {
    directValue: 'gpt-oss:20b',
    localValue: 'gpt-oss:20b-cloud',
    label: 'GPT OSS 20B (docs example, smaller)',
    group: 'Docs examples',
  },
]

const ollamaLocalCloudModels: ModelOption[] = ollamaCloudCatalog.map((model) => ({
  value: model.localValue,
  label: `${model.localValue} (${model.label})`,
  group: `Cloud via local Ollama - ${model.group}`,
}))

const ollamaLocalModels: ModelOption[] = [
  { value: 'llama3.3', label: 'llama3.3 (Meta, latest)', group: 'Local (must ollama pull first)' },
  { value: 'llama3.2', label: 'llama3.2', group: 'Local (must ollama pull first)' },
  { value: 'llama3.1', label: 'llama3.1', group: 'Local (must ollama pull first)' },
  { value: 'llama3.1:70b', label: 'llama3.1:70b', group: 'Local (must ollama pull first)' },
  { value: 'qwen2.5', label: 'qwen2.5', group: 'Local (must ollama pull first)' },
  { value: 'qwen2.5-coder', label: 'qwen2.5-coder', group: 'Local (must ollama pull first)' },
  { value: 'mistral', label: 'mistral', group: 'Local (must ollama pull first)' },
  { value: 'mistral-nemo', label: 'mistral-nemo', group: 'Local (must ollama pull first)' },
  { value: 'gemma2', label: 'gemma2', group: 'Local (must ollama pull first)' },
  { value: 'phi3', label: 'phi3', group: 'Local (must ollama pull first)' },
  { value: 'deepseek-r1', label: 'deepseek-r1 (reasoning)', group: 'Local (must ollama pull first)' },
  { value: 'deepseek-coder-v2', label: 'deepseek-coder-v2', group: 'Local (must ollama pull first)' },
  { value: 'codellama', label: 'codellama', group: 'Local (must ollama pull first)' },
]

const ollamaDirectCloudModels: ModelOption[] = ollamaCloudCatalog.map((model) => ({
  value: model.directValue,
  label: `${model.directValue} (${model.label})`,
  group: `Ollama Cloud API - ${model.group}`,
}))

const geminiModels: ModelOption[] = [
  { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro (best reasoning)' },
  { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash (fast, smart)' },
  { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
  { value: 'gemini-2.0-flash-lite', label: 'gemini-2.0-flash-lite' },
  { value: 'gemini-1.5-pro', label: 'gemini-1.5-pro' },
  { value: 'gemini-1.5-flash', label: 'gemini-1.5-flash' },
  { value: 'gemini-1.5-flash-8b', label: 'gemini-1.5-flash-8b' },
]

const openaiModels: ModelOption[] = [
  { value: 'gpt-4o', label: 'gpt-4o' },
  { value: 'gpt-4o-mini', label: 'gpt-4o-mini (cheap, fast)' },
  { value: 'gpt-4.1', label: 'gpt-4.1' },
  { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
  { value: 'gpt-4.1-nano', label: 'gpt-4.1-nano' },
  { value: 'o3', label: 'o3 (reasoning)' },
  { value: 'o3-mini', label: 'o3-mini' },
  { value: 'o4-mini', label: 'o4-mini' },
]

const anthropicModels: ModelOption[] = [
  { value: 'claude-opus-4-5', label: 'claude-opus-4-5' },
  { value: 'claude-sonnet-4-5', label: 'claude-sonnet-4-5' },
  { value: 'claude-3-7-sonnet-latest', label: 'claude-3-7-sonnet-latest' },
  { value: 'claude-3-5-sonnet-latest', label: 'claude-3-5-sonnet-latest' },
  { value: 'claude-3-5-haiku-latest', label: 'claude-3-5-haiku-latest' },
  { value: 'claude-3-opus-latest', label: 'claude-3-opus-latest' },
]

const openrouterModels: ModelOption[] = [
  { value: 'google/gemini-2.5-flash', label: 'google/gemini-2.5-flash' },
  { value: 'google/gemini-2.5-pro', label: 'google/gemini-2.5-pro' },
  { value: 'google/gemini-2.0-flash-001', label: 'google/gemini-2.0-flash-001' },
  { value: 'anthropic/claude-3.7-sonnet', label: 'anthropic/claude-3.7-sonnet' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'anthropic/claude-3.5-sonnet' },
  { value: 'openai/gpt-4o', label: 'openai/gpt-4o' },
  { value: 'openai/gpt-4o-mini', label: 'openai/gpt-4o-mini' },
  { value: 'openai/o3-mini', label: 'openai/o3-mini' },
  { value: 'meta-llama/llama-3.3-70b-instruct', label: 'meta-llama/llama-3.3-70b-instruct' },
  { value: 'mistralai/mixtral-8x22b-instruct', label: 'mistralai/mixtral-8x22b-instruct' },
  { value: 'deepseek/deepseek-chat', label: 'deepseek/deepseek-chat' },
  { value: 'qwen/qwen-2.5-72b-instruct', label: 'qwen/qwen-2.5-72b-instruct' },
  { value: 'nousresearch/hermes-3-llama-3.1-405b', label: 'nousresearch/hermes-3-llama-3.1-405b' },
]

const compatibleModels: ModelOption[] = [
  { value: 'local-model', label: 'local-model (LM Studio default)' },
  { value: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile (Groq)' },
  { value: 'qwen-2.5-coder-32b', label: 'qwen-2.5-coder-32b (Groq)' },
  { value: 'mixtral-8x7b-32768', label: 'mixtral-8x7b-32768 (Groq)' },
  { value: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', label: 'Llama-3.3-70B-Instruct-Turbo (Together)' },
  { value: 'accounts/fireworks/models/llama-v3p3-70b-instruct', label: 'llama-v3p3-70b-instruct (Fireworks)' },
]

const aguiModels: ModelOption[] = [
  { value: 'agent-runtime', label: 'agent-runtime' },
]

export const providerOptions: ProviderOption[] = [
  {
    id: 'offline',
    label: 'Offline swarm',
    helper: 'Five agents, deterministic, stage-safe, no network required.',
    requiresKey: false,
    acceptsKey: false,
    supportsBaseUrl: false,
    defaultBaseUrl: '',
    defaultModel: 'agenticprime-swarm',
    models: [],
  },
  {
    id: 'gemini',
    label: 'Gemini / Google AI Studio',
    helper: 'Best fit if hackathon credits arrive through Google DeepMind.',
    requiresKey: true,
    acceptsKey: true,
    supportsBaseUrl: false,
    defaultBaseUrl: '',
    defaultModel: 'gemini-2.5-flash',
    models: geminiModels,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    helper: 'Swap models quickly during the build.',
    requiresKey: true,
    acceptsKey: true,
    supportsBaseUrl: false,
    defaultBaseUrl: '',
    defaultModel: 'google/gemini-2.5-flash',
    models: openrouterModels,
  },
  {
    id: 'openai',
    label: 'OpenAI',
    helper: 'Standard chat completions API.',
    requiresKey: true,
    acceptsKey: true,
    supportsBaseUrl: false,
    defaultBaseUrl: '',
    defaultModel: 'gpt-4o-mini',
    models: openaiModels,
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    helper: 'Strong planner for swarm reasoning.',
    requiresKey: true,
    acceptsKey: true,
    supportsBaseUrl: false,
    defaultBaseUrl: '',
    defaultModel: 'claude-sonnet-4-5',
    models: anthropicModels,
  },
  {
    id: 'ollamaLocal',
    label: 'Ollama local daemon',
    helper:
      'Runs through your local Ollama app at http://localhost:11434. For cloud models, run `ollama signin` and pull a `-cloud` model first. Leave API key blank here.',
    requiresKey: false,
    acceptsKey: false,
    supportsBaseUrl: true,
    defaultBaseUrl: 'http://localhost:11434',
    defaultModel: 'kimi-k2.6:cloud',
    models: [...ollamaLocalCloudModels, ...ollamaLocalModels],
  },
  {
    id: 'ollamaCloud',
    label: 'Ollama Cloud API',
    helper:
      'Direct cloud access through https://ollama.com/api/chat. Requires an Ollama API key from ollama.com/settings/keys and uses non-`:cloud` model names.',
    requiresKey: true,
    acceptsKey: true,
    supportsBaseUrl: false,
    defaultBaseUrl: 'https://ollama.com',
    defaultModel: 'kimi-k2.6',
    models: ollamaDirectCloudModels,
  },
  {
    id: 'compatible',
    label: 'OpenAI-compatible endpoint',
    helper: 'Groq, Together, LM Studio, vLLM, Fireworks, Perplexity.',
    requiresKey: false,
    acceptsKey: true,
    supportsBaseUrl: true,
    requiresBaseUrl: true,
    defaultBaseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    models: compatibleModels,
  },
  {
    id: 'agui',
    label: 'AG-UI / CopilotKit endpoint',
    helper: 'Posts to your AG-UI runtime, expects an AgentDraft JSON response.',
    requiresKey: false,
    acceptsKey: true,
    supportsBaseUrl: true,
    requiresBaseUrl: true,
    defaultBaseUrl: '',
    defaultModel: 'agent-runtime',
    models: aguiModels,
  },
]

export function findProvider(id: ProviderId): ProviderOption {
  return providerOptions.find((option) => option.id === id) ?? providerOptions[0]
}

export type GroupedModels = {
  ungrouped: ModelOption[]
  grouped: { label: string; options: ModelOption[] }[]
}

export function groupModels(models: ModelOption[]): GroupedModels {
  const ungrouped: ModelOption[] = []
  const groupMap = new Map<string, ModelOption[]>()

  for (const option of models) {
    if (!option.group) {
      ungrouped.push(option)
      continue
    }

    const existing = groupMap.get(option.group)
    if (existing) {
      existing.push(option)
    } else {
      groupMap.set(option.group, [option])
    }
  }

  return {
    ungrouped,
    grouped: Array.from(groupMap.entries()).map(([label, options]) => ({ label, options })),
  }
}

export function providerTip(provider: ProviderId, message: string): string | null {
  const lower = message.toLowerCase()
  const isTimeout = lower.includes('timeout') || lower.includes('did not respond') || lower.includes('aborted')
  const is404 = lower.includes('404') || lower.includes('not found')
  const is401 = lower.includes('401') || lower.includes('403') || lower.includes('unauthorized') || lower.includes('forbidden')
  const isNetwork = lower.includes('failed to fetch') || lower.includes('econnrefused') || lower.includes('network')

  if (provider === 'ollamaLocal') {
    if (isNetwork) {
      return 'Ollama is not running. Start it with `ollama serve`. For cloud models, also run `ollama signin` and `ollama pull <model>` first.'
    }
    if (is404) {
      return 'Model not found. Run `ollama pull <model>` first. For cloud models use a `-cloud` model after `ollama signin`.'
    }
    if (isTimeout) {
      return 'First cloud-backed local call may cold-start. Try again, pick a smaller cloud model such as rnj-1:8b-cloud, or switch to Offline demo.'
    }
    if (is401) {
      return 'Local cloud access needs `ollama signin`; direct API keys belong in the Ollama Cloud API provider.'
    }
  }

  if (provider === 'ollamaCloud') {
    if (is401) {
      return 'Ollama Cloud API requires an API key from https://ollama.com/settings/keys.'
    }
    if (is404) {
      return 'Direct Ollama Cloud API uses catalog names without the local `-cloud` / `:cloud` suffix. Pick a model from the dropdown or use Custom for an exact tag.'
    }
    if (isTimeout) {
      return 'Ollama Cloud did not return in time. Try a smaller cloud model such as rnj-1:8b or use the Offline demo fallback.'
    }
  }

  if (provider === 'anthropic' || provider === 'openai' || provider === 'gemini' || provider === 'openrouter') {
    if (is401) {
      return 'API key looks rejected. Double-check it has chat-completions access and no leading whitespace.'
    }
    if (is404) {
      return 'Model name is unrecognized. Pick another from the dropdown or paste an exact identifier from the provider docs.'
    }
    if (isTimeout) {
      return 'Reasoning models (Opus, o3, deepseek-r1) can exceed 60s. Try a faster model like Sonnet, gpt-4o-mini, gemini-2.5-flash.'
    }
  }

  if (provider === 'compatible' || provider === 'agui') {
    if (isNetwork || is404) {
      return 'Endpoint unreachable. Verify the base URL is exactly the chat-completions root and the server is up.'
    }
    if (is401) {
      return 'Most OpenAI-compatible hosts (Groq, Together, Fireworks) need an API key, even though our UI marks it optional.'
    }
  }

  if (isTimeout) {
    return 'Provider exceeded 120s. Try a smaller model or a faster endpoint.'
  }

  return null
}
