import type { AgentVoice, ArgumentLine, UiBlock, UseCaseDefinition } from './types'

type VoiceProfile = {
  id: AgentVoice
  reasoningPrefix: string
  openByKind: Partial<Record<UiBlock['kind'], string[]>>
  openFallback: string[]
  disputeOpen: string[]
  disputeCounter: string[]
  settleLines: string[]
  closingLines: string[]
}

const voiceProfiles: Record<AgentVoice, VoiceProfile> = {
  sage: {
    id: 'sage',
    reasoningPrefix: 'Frame:',
    openByKind: {
      hero: [
        'Frame the room. The next move has to land first.',
        'Skip the pageantry. Tell them what to do.',
      ],
      timeline: [
        'Order: read the room, decide, move, verify.',
        'Anything outside this sequence is theater.',
      ],
      capabilityGrid: ['Only tools that earn their slot. Cut the rest.'],
      protocolPanel: ['Show the bones. Hide nothing.'],
    },
    openFallback: [
      'This is the cleanest path. Hold it.',
      'Sequence it. Then ship it.',
    ],
    disputeOpen: [
      'Hold on. That is not the next move.',
      'Wait. Sequence first, theatrics later.',
    ],
    disputeCounter: [
      'Lens is right. Ship the gate before the side-effect.',
      'I will not bless that without consent.',
    ],
    settleLines: [
      'Settled: gate, then act. Move it.',
      'Locked. Clean order.',
    ],
    closingLines: ['Plan executed in order. No drift.'],
  },
  forge: {
    id: 'forge',
    reasoningPrefix: 'Build:',
    openByKind: {
      capabilityGrid: ['Found the stack. Wired in five seconds.'],
      form: [
        'Knobs are live. Drag them and the surface rewrites.',
        'Controls are the cheap part. Watch them rewire everything.',
      ],
      toolConsole: ['Streaming receipts. Nothing happens off-screen.'],
      hero: ['Surface is hot. Ship it.'],
    },
    openFallback: [
      'It compiles. Ship it.',
      'Wired. Hot path is green.',
    ],
    disputeOpen: [
      'It works. Why are we stopping?',
      'I can patch the gate without losing the demo.',
    ],
    disputeCounter: [
      'Fine. Adding consent right now. Two seconds.',
      'Patched. Risk pill is wired. Keep moving.',
    ],
    settleLines: [
      'Built. Surface stays.',
      'Done. Receipts streaming.',
    ],
    closingLines: ['Surface compiled, signed, delivered.'],
  },
  lens: {
    id: 'lens',
    reasoningPrefix: 'Risk:',
    openByKind: {
      approvalCard: [
        'No side-effect leaves this room without a human tap.',
        'I want this gated. Out loud.',
      ],
      capabilityGrid: ['Permissions visible. No invisible reach.'],
      jurisdictionCard: ['Deadline first. Pretty later.'],
    },
    openFallback: [
      'Failure mode is what?',
      'What breaks if this fires unattended?',
    ],
    disputeOpen: [
      'No. Too risky as drafted.',
      'Wait. Where is the gate?',
      'This is a side-effect waiting to happen.',
    ],
    disputeCounter: [
      'One tap, gate visible. That is the floor.',
      'If consent is missing I will block it again.',
    ],
    settleLines: [
      'Gate is in. With consent, I approve.',
      'Tightened. Acceptable risk.',
    ],
    closingLines: ['Approved. Audit trail is clean.'],
  },
  echo: {
    id: 'echo',
    reasoningPrefix: 'Synth:',
    openByKind: {
      metricStrip: [
        'Three numbers. Nothing the human cannot act on.',
        'Reconciled the metrics. The chart now agrees.',
      ],
      barChart: ['Comparison up. Trade-offs visible at a glance.'],
      evidenceMatrix: ['Messy evidence is a matrix now.'],
    },
    openFallback: [
      'Reconciling the surface so it tells one story.',
      'Numbers agree. Surface is coherent.',
    ],
    disputeOpen: [
      'Both right. Let me reconcile.',
      'The numbers do not agree yet.',
    ],
    disputeCounter: [
      'Hold the chart until the metric strip lines up.',
      'I will rewrite the trend so it matches the receipt.',
    ],
    settleLines: [
      'Reconciled. Surfaces aligned.',
      'One coherent UI now.',
    ],
    closingLines: ['Synth complete. The story holds together.'],
  },
  wild: {
    id: 'wild',
    reasoningPrefix: 'Wild:',
    openByKind: {
      hero: [
        'Open weird. Make them lean in.',
        'This intro is too safe to be remembered.',
      ],
      checklist: ['Closing line: the test the demo has to pass.'],
      toolConsole: ['Stream the receipts. Loud and proud.'],
    },
    openFallback: [
      'Throw a curveball. They will remember it.',
      'Add the move nobody asked for.',
    ],
    disputeOpen: [
      'But that is the entire point.',
      'Boring. Make it dangerous.',
      'This is too safe to be remembered.',
    ],
    disputeCounter: [
      'Fine, gate it — but keep the curveball.',
      'Gate it AND keep the bite. Both.',
    ],
    settleLines: [
      'Mic drop. Save the receipt.',
      'Closed it weird. On purpose.',
    ],
    closingLines: ['Wild had the last word. As planned.'],
  },
}

export function reasoningFor(
  agent: AgentVoice,
  block: UiBlock,
  useCase: UseCaseDefinition,
): string {
  const profile = voiceProfiles[agent]
  const byKind = profile.openByKind[block.kind]
  const pool = byKind && byKind.length > 0 ? byKind : profile.openFallback
  const pick = pool[Math.abs(hash(`${useCase.id}-${block.id}-${agent}`)) % pool.length]
  return `${profile.reasoningPrefix} ${pick}`
}

type ScriptArgs = {
  useCase: UseCaseDefinition
  blocks: UiBlock[]
  authorByBlockId: Record<string, AgentVoice>
  disputeBlockId?: string
}

export function buildArgumentScript({
  useCase,
  blocks,
  authorByBlockId,
  disputeBlockId,
}: ScriptArgs): { lines: ArgumentLine[]; disputeAtProposedAt?: number } {
  const heroOverride = heroScripts[useCase.id]
  if (heroOverride) {
    const disputeAt = disputeBlockId
      ? blocks.findIndex((block) => block.id === disputeBlockId)
      : undefined
    return {
      lines: heroOverride,
      disputeAtProposedAt: disputeAt !== undefined && disputeAt >= 0 ? disputeAt : undefined,
    }
  }

  const lines: ArgumentLine[] = []
  blocks.forEach((block, proposedAt) => {
    const author = authorByBlockId[block.id] ?? 'echo'
    const profile = voiceProfiles[author]
    const byKind = profile.openByKind[block.kind]
    const pool = byKind && byKind.length > 0 ? byKind : profile.openFallback
    const text = pool[Math.abs(hash(`${useCase.id}-${block.id}-open`)) % pool.length]
    lines.push({
      id: `${block.id}-open`,
      agent: author,
      text,
      proposedAt,
      beat: 'open',
      delayMs: 0,
    })

    if (block.id === disputeBlockId) {
      const disputerProfile = voiceProfiles.lens
      const lensLine = disputerProfile.disputeOpen[
        Math.abs(hash(`${useCase.id}-${block.id}-lens`)) % disputerProfile.disputeOpen.length
      ]
      lines.push({
        id: `${block.id}-lens`,
        agent: 'lens',
        text: lensLine,
        proposedAt,
        beat: 'counter',
        delayMs: 320,
      })

      const wildProfile = voiceProfiles.wild
      const wildLine = wildProfile.disputeOpen[
        Math.abs(hash(`${useCase.id}-${block.id}-wild`)) % wildProfile.disputeOpen.length
      ]
      lines.push({
        id: `${block.id}-wild`,
        agent: 'wild',
        text: wildLine,
        proposedAt,
        beat: 'counter',
        delayMs: 640,
      })

      const settle = voiceProfiles.sage.settleLines[
        Math.abs(hash(`${useCase.id}-${block.id}-sage-settle`)) % voiceProfiles.sage.settleLines.length
      ]
      lines.push({
        id: `${block.id}-settle`,
        agent: 'sage',
        text: settle,
        proposedAt,
        beat: 'settle',
        delayMs: 960,
      })
    }
  })

  if (lines.length > 0) {
    lines.push({
      id: 'mic-drop',
      agent: 'wild',
      text: voiceProfiles.wild.settleLines[0],
      proposedAt: blocks.length - 1,
      beat: 'mic-drop',
      delayMs: 200,
    })
  }

  return { lines, disputeAtProposedAt: disputeBlockId ? blocks.findIndex((b) => b.id === disputeBlockId) : undefined }
}

export function closingLinesFor(useCase: UseCaseDefinition): { agent: AgentVoice; text: string }[] {
  const bespoke = closingScripts[useCase.id]
  if (bespoke) {
    return bespoke
  }
  return [
    { agent: 'lens', text: 'Approved. Audit trail is clean.' },
    { agent: 'echo', text: 'Synth complete. The story holds together.' },
    { agent: 'sage', text: 'Plan executed in order. No drift.' },
    { agent: 'forge', text: 'Surface compiled, signed, delivered.' },
    { agent: 'wild', text: 'Mic drop. Save the receipt.' },
  ]
}

const closingScripts: Record<string, { agent: AgentVoice; text: string }[]> = {
  'crisis-operator': [
    { agent: 'lens', text: 'Consent captured. The dial fired with her tap.' },
    { agent: 'echo', text: 'Two humans acknowledged within four minutes.' },
    { agent: 'sage', text: 'Out of the worst minute. Inside the lobby.' },
    { agent: 'forge', text: 'Low-battery mode held the runway.' },
    { agent: 'wild', text: "She's safe. Save the receipt and dissolve." },
  ],
}

const heroScripts: Record<string, ArgumentLine[]> = {
  'crisis-operator': [
    { id: 'h-0', agent: 'sage', text: '3 AM. Stolen passport. 12% battery. Frame: get her safe before pretty.', proposedAt: 0, beat: 'open' },
    { id: 'h-1a', agent: 'forge', text: 'Embassy locator and SMS — wired in nine seconds.', proposedAt: 1, beat: 'open' },
    { id: 'h-1b', agent: 'wild', text: 'Add a sixty-second box-breath. People panic before they dial.', proposedAt: 1, beat: 'counter', delayMs: 360 },
    { id: 'h-2a', agent: 'forge', text: 'Battery slider scales the entire UI. One tap targets only.', proposedAt: 2, beat: 'open' },
    { id: 'h-2b', agent: 'sage', text: 'Good. Density follows panic, not desktop.', proposedAt: 2, beat: 'settle', delayMs: 320 },
    { id: 'h-3', agent: 'echo', text: 'Thirty-eight seconds to first action. Battery runway twelve. Timer matters more than the map.', proposedAt: 3, beat: 'open' },
    { id: 'h-4', agent: 'echo', text: 'Risk drops seventy-eight percent inside a lobby. Show that, not GDP.', proposedAt: 4, beat: 'open' },
    { id: 'h-5a', agent: 'sage', text: 'Order: breathe, dial, walk, notify. Anything else is theater.', proposedAt: 5, beat: 'open' },
    { id: 'h-5b', agent: 'wild', text: 'Notify two humans, not one. People sleep through phones.', proposedAt: 5, beat: 'counter', delayMs: 360 },
    { id: 'h-6a', agent: 'lens', text: 'Wait. We do not auto-dial without an explicit tap.', proposedAt: 6, beat: 'open' },
    { id: 'h-6b', agent: 'wild', text: "But that's the entire point — one tap.", proposedAt: 6, beat: 'counter', delayMs: 380 },
    { id: 'h-6c', agent: 'lens', text: 'One tap is fine. Zero taps is not. Add the gate.', proposedAt: 6, beat: 'counter', delayMs: 760 },
    { id: 'h-6d', agent: 'sage', text: 'Settled: one tap, gate visible, low-battery mode armed.', proposedAt: 6, beat: 'settle', delayMs: 1140 },
    { id: 'h-7', agent: 'wild', text: 'Stream the receipts. Nothing happens off-screen.', proposedAt: 7, beat: 'open' },
    { id: 'h-8', agent: 'wild', text: 'And the closing line: she gets out of this minute, alive and sober.', proposedAt: 8, beat: 'mic-drop' },
  ],
}

const TAGLINE_POOL = [
  'Generated by five arguing dinosaurs.',
  'Five voices, one surface, no dashboard.',
  'Sage planned. Lens objected. Wild won. Echo synced. Forge shipped.',
  'Built by argument. Saved by consent.',
  'The swarm disagreed productively. Receipt attached.',
]

export function receiptTaglineFor(useCase: UseCaseDefinition): string {
  if (useCase.id === 'crisis-operator') {
    return 'Five agents argued about a 3 AM panic surface. The user is in a lobby now.'
  }
  return TAGLINE_POOL[Math.abs(hash(useCase.id)) % TAGLINE_POOL.length]
}

function hash(value: string): number {
  let h = 0
  for (let i = 0; i < value.length; i++) {
    h = (h << 5) - h + value.charCodeAt(i)
    h |= 0
  }
  return h
}
