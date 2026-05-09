# AgenticPrime — Genesis Engine

AgenticPrime is the hackathon entry for the AI Tinkerers Boston Generative UI hackathon. It is not a "smarter dashboard." It is a runtime where five named agents argue, propose, and assemble a UI together — the user watches the surface get born from an intent.

**Tagline:** Five agents argue. The app appears.

## Run

Double-click `launch.bat` on Windows, or run:

```bash
npm install
npm run dev
```

The launcher installs dependencies if needed, starts Vite on the first free port from `5173-5180`, and opens the matching local URL.

For a single verification command, run:

```bash
npm run check
```

## User guide

Open `/user-guide.html` from the running app, or click **How this works** in the top bar. The guide explains what is real, what is simulated, what prompt to type, and how to configure Ollama without memorizing model IDs.

## What you see

1. A **use case shelf** of ten hand-tuned scenarios (Win This Room, 3 AM Crisis Operator, Negotiation Theater, Existential Decision Engine, AI Dungeon Master, Reality Compiler, Memory Lane, Surveillance State for Yourself, Speed-Date Memory Aid, Confessional). Pick one, the swarm builds the corresponding reality.
2. The **swarm** of five agents in the left rail:
   - **Sage** (Strategist, violet) frames the problem and sequences the moves
   - **Forge** (Builder, cyan) constructs the controls and capability stack
   - **Lens** (Critic, amber) gates risk and demands human approval
   - **Echo** (Synthesizer, white) reconciles metrics and comparisons
   - **Wild** (Wildcard, magenta) closes with the unexpected angle
3. A **streaming canvas** where each generated block animates in tinted by its author, with a one-line reasoning bubble explaining why that agent contributed it.
4. A **time scrubber** along the bottom showing every block as a frame in the order it was proposed. Drag to replay generation as a film, or click `Replay generation` to re-run.
5. A **simulated approval gate** that animates the execution timeline, then **dissolves the generated surface into a single receipt** — the surface knows when to disappear.

## Three-Minute Demo Script

1. **Open** to the hero. "Five agents argue. The app appears."
2. **Pick** `Win This Room` from the shelf. Note this app is built for the room you are standing in.
3. **Convene the swarm**. Watch the nine blocks stream in, color-tinted by their author, with reasoning bubbles narrating the swarm's logic.
4. **Switch use cases live** to `3 AM Crisis Operator`. Same swarm, completely different surface, calibrated for panic and a 12% battery.
5. **Drag the time scrubber** back to frame 3, then forward. The UI rewinds and replays.
6. **Approve simulated execution**. The execution timeline animates step-by-step.
7. **Watch the dissolve**. The app removes itself, leaving only the receipt. Close on the line: "This is what generative UI feels like when it knows when to end."

## Live Model Provider Selection

The provider picker supports:

- **Offline swarm** (deterministic, stage-safe, no network)
- Gemini / Google AI Studio
- OpenRouter
- OpenAI
- Anthropic
- Ollama local daemon
- Ollama Cloud API
- OpenAI-compatible endpoints (Groq, Together, LM Studio, vLLM, Fireworks, Perplexity)
- AG-UI / CopilotKit runtime endpoints that return an `AgentDraft` JSON payload

When you click `Convene the swarm` in a live provider mode, the browser posts your intent, provider, model, endpoint, API key, use-case context, and discovered capabilities to the local Vite route at `/api/generate-ui`. That route calls the selected provider with a swarm-aware prompt and normalizes the response into an `AgentDraft` that the renderer overlays onto the use case's bespoke baseline.

API keys are held only in React state and sent to the local dev server for the current request. Nothing is saved to disk. For a deployed version, move these calls behind a real backend secret manager.

### Ollama setup

AgenticPrime separates the two Ollama paths so the setup is explicit:

- **Ollama local daemon** uses `http://localhost:11434`. Install Ollama, run `ollama serve`, then `ollama pull <model>`. For cloud-backed local models, run `ollama signin`, then pick a `-cloud` / `:cloud` model from the dropdown such as `kimi-k2.6:cloud`, `deepseek-v4-pro:cloud`, or `gpt-oss:120b-cloud`. Leave the app's API key field blank in this mode.
- **Ollama Cloud API** calls `https://ollama.com/api/chat` through the local Vite route. Create an API key at `https://ollama.com/settings/keys`, paste it into the app for the current session, and pick from the dropdown catalog using direct model names such as `kimi-k2.6`, `deepseek-v4-pro`, or `gpt-oss:120b`.

Live provider calls show an elapsed timer and can be cancelled or replaced with the deterministic offline fallback at any time.

## Production boundaries

This app is production-hardened for a local demo: lint/build checks pass, provider errors fall back safely, and the UI labels simulated actions clearly. A public hosted version still needs a real backend secret boundary before accepting API keys from untrusted users.

## Architecture cheat sheet

- `src/agents.ts` — the five named agents and their colors
- `src/useCases.ts` — ten hand-tuned use-case definitions
- `src/manifestBuilder.ts` — turns a use case + inputs + agent draft into a UI manifest with author metadata
- `src/components/RuntimeRenderer.tsx` — author-tinted, staggered-entrance block renderer
- `src/components/AgentRoster.tsx` — the live swarm sidebar
- `src/components/UseCasePicker.tsx` — the case-picker shelf
- `src/components/TimeScrubber.tsx` — the bottom film strip and replay control
- `src/components/ReceiptDissolve.tsx` — the self-destruct ritual
- `vite.config.ts` — the `/api/generate-ui` proxy that calls real LLMs and normalizes drafts

## Why this wins the room

Every other team will show "an agent that does X." We show **agents arguing and a UI being born from the argument**, then dissolving when it ships. The surface is the demo, the multi-agent collaboration is visible, and ten use cases give breadth in 90 seconds.
