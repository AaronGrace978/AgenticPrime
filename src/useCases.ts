import type { UseCaseDefinition } from './types'

export const useCases: UseCaseDefinition[] = [
  {
    id: 'security-deposit-dispute',
    title: 'Security Deposit Dispute',
    eyebrow: 'Bureaucracy killer',
    summary: 'Landlord kept your deposit. Build the evidence file, demand letter, and next-step plan.',
    intent:
      'My landlord kept my security deposit. Generate the exact interactive workspace I need to understand the deadline, organize evidence, draft a demand letter, and export a packet I can use.',
    inputs: [
      {
        id: 'state',
        label: 'State',
        type: 'select',
        value: 'MA',
        options: [
          { label: 'Massachusetts', value: 'MA' },
          { label: 'New York', value: 'NY' },
          { label: 'California', value: 'CA' },
          { label: 'Texas', value: 'TX' },
        ],
      },
      {
        id: 'deposit_amount',
        label: 'Deposit amount',
        type: 'range',
        value: 1800,
        min: 250,
        max: 6000,
        step: 50,
        helper: 'Amount landlord still has.',
      },
      {
        id: 'days_waited',
        label: 'Days since move-out',
        type: 'range',
        value: 34,
        min: 1,
        max: 90,
        step: 1,
        helper: 'Used to compute demand urgency.',
      },
      {
        id: 'landlord',
        label: 'Landlord / property manager',
        type: 'text',
        value: 'Property Manager',
      },
      {
        id: 'reason',
        label: 'Landlord reason',
        type: 'textarea',
        value: 'They claimed cleaning and vague damages but did not send receipts.',
      },
      {
        id: 'evidence',
        label: 'Evidence you have',
        type: 'textarea',
        value: 'Move-in photos, move-out video, lease, payment receipt, text messages.',
      },
    ],
    capabilities: [
      cap('jurisdiction-rules', 'Jurisdiction Rules', 'research', 'MCP App: Tenant Law', 'Looks up deposit deadline, demand requirements, and penalty risk.', 94, '800ms'),
      cap('evidence-indexer', 'Evidence Indexer', 'memory', 'MCP App: Document Kit', 'Turns photos, receipts, and messages into an evidence table.', 91, '1.2s'),
      cap('letter-drafter', 'Demand Letter Drafter', 'creative', 'Frontend Tool', 'Drafts a firm but editable demand letter from user state.', 93, '900ms'),
      cap('deadline-planner', 'Deadline Planner', 'calendar', 'AG-UI Tool', 'Computes next action dates and emits state updates to the interface.', 88, '700ms'),
      cap('packet-exporter', 'Packet Exporter', 'ops', 'A2UI Export', 'Writes demand letter, timeline, evidence index, and filing checklist.', 96, '500ms'),
    ],
    metrics: [
      { label: 'Packet readiness', value: '72%', detail: 'Evidence and letter drafted', trend: 'up' },
      { label: 'Deadline pressure', value: 'High', detail: 'Demand window likely active', trend: 'down' },
      { label: 'Chat replacement', value: 'Strong', detail: 'Needs forms, timeline, evidence, export', trend: 'up' },
    ],
    chart: {
      title: 'Case packet completeness',
      description: 'What the runtime has assembled from the current state.',
      data: [
        { label: 'Law', value: 82, color: 'cyan' },
        { label: 'Evidence', value: 68, color: 'amber' },
        { label: 'Letter', value: 86, color: 'violet' },
        { label: 'Next steps', value: 74, color: 'cyan' },
      ],
    },
    steps: [
      { title: 'Confirm jurisdiction', detail: 'Compute state-specific deadline, demand format, and penalty language.', capabilityId: 'jurisdiction-rules' },
      { title: 'Index evidence', detail: 'Turn lease, photos, receipts, and messages into a numbered evidence list.', capabilityId: 'evidence-indexer' },
      { title: 'Draft demand letter', detail: 'Generate a letter asking for return of deposit and receipts by a clear deadline.', capabilityId: 'letter-drafter' },
      { title: 'Plan escalation', detail: 'Create filing checklist and timeline if landlord ignores the demand.', capabilityId: 'deadline-planner' },
      { title: 'Export packet', detail: 'Write the demand letter, evidence index, case timeline, and filing checklist.', capabilityId: 'packet-exporter' },
    ],
    approval: {
      title: 'Approve packet export',
      description: 'Review the generated letter and evidence plan before writing local files.',
      risk: 'Not legal advice. Use as an organized draft, then verify local rules or consult a lawyer.',
      actions: [
        'Write demand-letter.html',
        'Write evidence-index.json',
        'Write case-timeline.md',
        'Write filing-checklist.md',
      ],
    },
    checklist: [
      { label: 'Deadline identified', detail: 'State and days-since-move-out drive the urgency card.', checked: true },
      { label: 'Evidence mapped', detail: 'Photos, receipts, lease, and messages become a numbered index.', checked: true },
      { label: 'Demand letter ready', detail: 'Letter updates as amount, reason, and evidence change.', checked: true },
    ],
    hero: {
      eyebrow: 'Runtime generated legal-admin UI',
      title: 'Turn a deposit fight into a usable case packet.',
      body: 'The agent renders the exact UI this dispute needs: jurisdiction logic, evidence matrix, demand letter preview, approval, and export.',
      chips: ['Tenant law MCP', 'Evidence matrix', 'Demand letter', 'AG-UI state', 'A2UI export'],
    },
    closingTitle: 'Packet ready to use',
  },
  {
    id: 'win-this-room',
    title: 'Win This Room',
    eyebrow: 'Hackathon co-pilot',
    summary: 'I am at AI Tinkerers Boston. Help me ship by 6 PM.',
    intent:
      'I am at the AI Tinkerers Boston Generative UI hackathon. Help me form a team, lock an idea, wire a model provider, build a working demo, and submit before 6 PM.',
    inputs: [
      {
        id: 'team_size',
        label: 'Team size',
        type: 'select',
        value: '3',
        options: [
          { label: 'Solo blitz', value: '1' },
          { label: 'Duo, fast', value: '2' },
          { label: 'Trio, balanced', value: '3' },
          { label: 'Quad, ambitious', value: '4' },
        ],
      },
      {
        id: 'risk',
        label: 'Risk appetite',
        type: 'select',
        value: 'swing',
        options: [
          { label: 'Safe completion', value: 'safe' },
          { label: 'Memorable swing', value: 'swing' },
          { label: 'Moonshot', value: 'moon' },
        ],
      },
      {
        id: 'hours_left',
        label: 'Hours left to ship',
        type: 'range',
        value: 5,
        min: 1,
        max: 6,
        step: 1,
        helper: 'Submissions close at 6 PM.',
      },
      {
        id: 'angle',
        label: 'Pitch angle',
        type: 'textarea',
        value: 'Generative UI swarm where agents debate and the user watches the app self-assemble.',
      },
    ],
    capabilities: [
      cap('attendee-graph', 'Attendee Graph', 'social', 'MCP: AI Tinkerers Roster', 'Ranks in-room attendees by skill match and current team status.', 96, '1.4s'),
      cap('idea-scorer', 'Idea Scorer', 'creative', 'MCP: Hack Memory', 'Scores ideas against judging rubric and prior winners.', 92, '900ms'),
      cap('stack-picker', 'Stack Picker', 'ops', 'MCP: Starter Kits', 'Picks stack with credits and starter templates available today.', 90, '1.1s'),
      cap('demo-coach', 'Demo Coach', 'creative', 'MCP: Pitch Studio', 'Drafts the 2-minute demo script and timer cue sheet.', 89, '2.0s'),
      cap('submit-gate', 'Submission Gate', 'safety', 'MCP: Devpost', 'Validates required fields before submission and pings teammates.', 87, '700ms'),
    ],
    metrics: [
      { label: 'Win probability', value: '64%', detail: 'Modeled vs. 47 prior tracks', trend: 'up' },
      { label: 'Idea novelty', value: 'High', detail: 'No competing swarm-UI submissions detected', trend: 'up' },
      { label: 'Submission risk', value: 'Low', detail: 'Auto-checklist and 5-minute buffer', trend: 'steady' },
    ],
    chart: {
      title: 'Hour-by-hour build budget',
      description: 'How the agent allocates remaining minutes across team formation, build, polish, and pitch.',
      data: [
        { label: 'Team', value: 12, color: 'cyan' },
        { label: 'Build', value: 58, color: 'violet' },
        { label: 'Polish', value: 18, color: 'amber' },
        { label: 'Pitch', value: 12, color: 'cyan' },
      ],
    },
    steps: [
      { title: 'Form team', detail: 'Match with 2 attendees by complementary skills and energy level.', capabilityId: 'attendee-graph' },
      { title: 'Lock idea', detail: 'Score top 3 ideas, pick one with highest novelty x doability.', capabilityId: 'idea-scorer' },
      { title: 'Wire stack', detail: 'Pick provider, paste keys, run scaffold. Credits applied.', capabilityId: 'stack-picker' },
      { title: 'Rehearse demo', detail: 'Generate teleprompter, time the run, surface gotchas.', capabilityId: 'demo-coach' },
      { title: 'Submit', detail: 'Validate Devpost, ping team, fire submission with 4 minutes to spare.', capabilityId: 'submit-gate' },
    ],
    approval: {
      title: 'Lock the plan and start the clock',
      description: 'Forming the team, claiming the idea, and starting the build clock are reversible until submission opens.',
      risk: 'Low: changes nothing outside this room until you press submit at 5:55 PM.',
      actions: [
        'Match teammates and start a Slack huddle',
        'Claim idea slot and starter kit',
        'Set 90-minute build sprints with auto check-ins',
        'Stage submission draft on Devpost',
      ],
    },
    checklist: [
      { label: 'Team chemistry test passed', detail: 'Three quick yes/no questions answered live.', checked: true },
      { label: 'Idea is forkable', detail: 'Has a 30-second hook and a working prototype path.', checked: true },
      { label: 'Submission draft staged', detail: 'Title, summary, video slot, and links pre-filled.', checked: false },
    ],
    hero: {
      eyebrow: 'Runtime generated UI',
      title: 'Built for this exact room, this exact six-hour window.',
      body: 'No dashboard. No template. The swarm just shaped the controls you need to win the AI Tinkerers Boston hackathon.',
      chips: ['Attendee match', 'Idea score', 'Stack credits', 'Demo timer', 'Devpost gate'],
    },
    closingTitle: 'Why this wins the room',
  },
  {
    id: 'crisis-operator',
    title: '3 AM Crisis Operator',
    eyebrow: 'Hero demo · panic-calibrated UI',
    summary: 'Stolen passport. Foreign city. 12% battery. The swarm builds the panel that gets you out of the worst minute.',
    intent:
      "It is 3 AM. I'm stuck in a foreign city. My passport was stolen and my phone is at 12%. Build me the exact panel I need right now — not a dashboard, not a map, the next four taps.",
    inputs: [
      {
        id: 'situation',
        label: 'Situation',
        type: 'select',
        value: 'passport',
        options: [
          { label: 'Stolen passport abroad', value: 'passport' },
          { label: 'Power outage at home', value: 'power' },
          { label: 'Pet ate something dangerous', value: 'pet' },
          { label: 'Locked out of car or home', value: 'locked_out' },
        ],
      },
      {
        id: 'urgency',
        label: 'Urgency',
        type: 'range',
        value: 8,
        min: 1,
        max: 10,
        step: 1,
        helper: '10 = act inside 5 minutes. UI density scales with this.',
      },
      {
        id: 'language',
        label: 'Local language',
        type: 'select',
        value: 'es',
        options: [
          { label: 'English', value: 'en' },
          { label: 'Spanish', value: 'es' },
          { label: 'French', value: 'fr' },
          { label: 'Japanese', value: 'ja' },
        ],
      },
      {
        id: 'battery',
        label: 'Phone battery (%)',
        type: 'range',
        value: 12,
        min: 1,
        max: 100,
        step: 1,
        helper: 'UI strips itself down as battery drops.',
      },
    ],
    capabilities: [
      cap('embassy-lookup', 'Embassy Locator', 'safety', 'MCP: State Dept', 'Finds nearest embassy with hours and emergency line.', 97, '900ms'),
      cap('safe-route', 'Safe Route', 'sensor', 'MCP: Maps', 'Routes to safe locations, avoiding dim or unlit streets.', 92, '1.2s'),
      cap('phrase-coach', 'Phrase Coach', 'creative', 'MCP: Translate', 'Generates 4 short phrases in the local language.', 95, '700ms'),
      cap('contact-fanout', 'Contact Fanout', 'messaging', 'MCP: SMS', 'Notifies emergency contacts with location and status.', 96, '1.0s'),
      cap('breathe-now', 'Breathe Now', 'health', 'MCP: Calm', 'Guides a 60-second box-breath while the plan loads.', 89, 'realtime'),
    ],
    metrics: [
      { label: 'Time to first action', value: '38s', detail: 'From open to embassy call', trend: 'up' },
      { label: 'Steps remaining', value: '5', detail: 'Until you are in a safe location', trend: 'steady' },
      { label: 'Battery runway', value: '12%', detail: 'Power-saving UI engaged', trend: 'down' },
    ],
    chart: {
      title: 'Risk by minute, next 30 minutes',
      description: 'Risk drops once the embassy is contacted and you are inside a safe venue.',
      data: [
        { label: 'Now', value: 92, color: 'amber' },
        { label: '+10m', value: 60, color: 'amber' },
        { label: '+20m', value: 32, color: 'cyan' },
        { label: '+30m', value: 14, color: 'cyan' },
      ],
    },
    steps: [
      { title: 'Breathe', detail: '60 seconds, box pattern, then act. The plan is already drafted.', capabilityId: 'breathe-now' },
      { title: 'Call embassy', detail: 'One-tap dial. Number cached locally in case signal drops.', capabilityId: 'embassy-lookup' },
      { title: 'Walk to safe spot', detail: 'Lit route, 7 minutes to the lobby of the listed hotel.', capabilityId: 'safe-route' },
      { title: 'Notify two people', detail: 'Pre-written SMS with live location and ETA.', capabilityId: 'contact-fanout' },
    ],
    approval: {
      title: 'Approve the next move',
      description: 'Tap once. The agent dials, drafts the messages, and starts the route.',
      risk: 'Low: this is reversible. Nothing is paid for, no embassy form is filed without you.',
      actions: [
        'Dial nearest embassy emergency line',
        'Send pre-written SMS to two contacts',
        'Start lit-street route to safe venue',
        'Switch to low-battery one-button mode',
      ],
    },
    checklist: [
      { label: 'Calm gate cleared', detail: 'Heart rate proxy from typing cadence is back to baseline.', checked: true },
      { label: 'Plan is offline-capable', detail: 'Cached so it works even if signal drops.', checked: true },
      { label: 'Two humans alerted', detail: 'Acknowledgment expected within 4 minutes.', checked: false },
    ],
    hero: {
      eyebrow: 'Panic-aware surface',
      title: 'A panel for the worst minute of the night, not for browsing.',
      body: 'Five agents argued the surface into a single column of one-tap moves. Density follows panic. The dial waits for your finger.',
      chips: ['One-tap actions', 'Offline cached', 'Local language', 'Battery-aware', 'Consent-gated dial'],
    },
    closingTitle: 'Why this is unlike any app',
  },
  {
    id: 'negotiation-theater',
    title: 'Negotiation Theater',
    eyebrow: 'Live deal coach',
    summary: 'Salary, lease, vendor contract. The UI rehearses you and scores the call.',
    intent:
      'I have a salary renegotiation in 2 hours. Help me find leverage, draft counter-offers, rehearse responses, and score the call as it happens.',
    inputs: [
      {
        id: 'target_increase',
        label: 'Target increase (%)',
        type: 'range',
        value: 22,
        min: 5,
        max: 50,
        step: 1,
      },
      {
        id: 'tone',
        label: 'Tone',
        type: 'select',
        value: 'collaborative',
        options: [
          { label: 'Collaborative', value: 'collaborative' },
          { label: 'Firm', value: 'firm' },
          { label: 'Direct', value: 'direct' },
        ],
      },
      {
        id: 'walk_away',
        label: 'Walk-away threshold',
        type: 'text',
        value: '$172,000 base',
      },
      {
        id: 'leverage',
        label: 'Leverage you bring',
        type: 'textarea',
        value: 'Two competing offers, owner of $4M revenue line, retention risk if I leave this quarter.',
      },
    ],
    capabilities: [
      cap('comp-data', 'Comp Map', 'finance', 'MCP: Levels', 'Pulls live comp ranges by role and city.', 95, '1.1s'),
      cap('counter-drafts', 'Counter Drafts', 'messaging', 'MCP: Writer', 'Drafts three counter-offer scripts at different temperatures.', 93, '1.6s'),
      cap('tone-meter', 'Tone Meter', 'sensor', 'MCP: Realtime Audio', 'Scores tone, pace, and filler words live during the call.', 88, 'realtime'),
      cap('walk-away-gauge', 'Walk-away Gauge', 'safety', 'MCP: Decision', 'Flags when you are below your floor.', 91, 'realtime'),
      cap('regret-min', 'Regret Minimizer', 'creative', 'MCP: Decision', 'Reframes options against 5-year regret.', 85, '1.2s'),
    ],
    metrics: [
      { label: 'Leverage score', value: '7.4 / 10', detail: 'Comp map + retention risk', trend: 'up' },
      { label: 'Counter range', value: '$162k - $184k', detail: 'Three drafted positions', trend: 'steady' },
      { label: 'Walk-away buffer', value: '+ $11k', detail: 'Distance above your floor', trend: 'up' },
    ],
    chart: {
      title: 'Three counter-offer ladders',
      description: 'Each bar is a position the agent rehearses with you. Pick the one you will lead with.',
      data: [
        { label: 'Soft', value: 22, color: 'cyan' },
        { label: 'Center', value: 38, color: 'violet' },
        { label: 'Hard', value: 52, color: 'amber' },
      ],
    },
    steps: [
      { title: 'Pull comp range', detail: 'Live comps for senior role, Boston, last 90 days.', capabilityId: 'comp-data' },
      { title: 'Draft three counters', detail: 'Soft, center, hard. Each with rehearsal lines.', capabilityId: 'counter-drafts' },
      { title: 'Rehearse 4 min', detail: 'Tone meter records and grades you live.', capabilityId: 'tone-meter' },
      { title: 'Walk-away ritual', detail: 'You commit to the floor in writing. UI locks it.', capabilityId: 'walk-away-gauge' },
    ],
    approval: {
      title: 'Approve rehearsal and live coaching',
      description: 'Press once to start the rehearsal session. The live tone coach activates only on the actual call when you flip a separate switch.',
      risk: 'Low: nothing is sent. The rehearsal is private and discarded after the call.',
      actions: [
        'Pull live comp range and retention signals',
        'Draft three counter-offer scripts',
        'Run a 4-minute rehearsal with tone scoring',
        'Lock walk-away threshold in writing',
      ],
    },
    checklist: [
      { label: 'Floor written down', detail: 'You signed your walk-away. UI will warn if you cross it.', checked: true },
      { label: 'Three positions ready', detail: 'Soft, center, hard. Memorize the center.', checked: true },
      { label: 'Live coach armed', detail: 'Will whisper one word if you drift below your floor.', checked: false },
    ],
    hero: {
      eyebrow: 'Deal room',
      title: 'A negotiation studio built for the next two hours.',
      body: 'No CRM. No pipeline. Just rehearsal, counters, and a floor you can feel.',
      chips: ['Live comps', 'Counter ladder', 'Tone meter', 'Walk-away gauge'],
    },
    closingTitle: 'Why this UI cannot exist as a page',
  },
  {
    id: 'existential-decision',
    title: 'Existential Decision Engine',
    eyebrow: 'Big-decision sandbox',
    summary: 'Quit the job? Move? Marry? Found the company? Make it visible.',
    intent:
      'I am thinking about leaving my job to start a company. Help me model this against five-year regret, runway, identity cost, and people I would affect.',
    inputs: [
      {
        id: 'decision',
        label: 'Decision',
        type: 'text',
        value: 'Leave senior IC role to co-found AI infra startup',
      },
      {
        id: 'horizon',
        label: 'Look-ahead horizon (years)',
        type: 'range',
        value: 5,
        min: 1,
        max: 15,
        step: 1,
      },
      {
        id: 'runway',
        label: 'Personal runway (months)',
        type: 'range',
        value: 14,
        min: 3,
        max: 36,
        step: 1,
      },
      {
        id: 'people',
        label: 'People affected',
        type: 'textarea',
        value: 'Spouse, two kids in school, two co-founders, current direct reports.',
      },
    ],
    capabilities: [
      cap('regret-sim', 'Regret Simulator', 'creative', 'MCP: Decision', 'Plays the path forward 5 years across three branches.', 94, '2.4s'),
      cap('runway-model', 'Runway Model', 'finance', 'MCP: Sheets', 'Models cash, mortgage, healthcare, school costs.', 96, '1.7s'),
      cap('identity-cost', 'Identity Cost', 'memory', 'MCP: Journal', 'Surfaces patterns from your last decade of journals.', 87, '3.1s'),
      cap('partner-talk', 'Partner Conversation', 'messaging', 'MCP: Drafts', 'Drafts the conversation script for spouse / co-founders.', 90, '1.4s'),
      cap('commit-ritual', 'Commit Ritual', 'safety', 'MCP: Self', 'Locks the decision with a witnessed signature.', 80, '600ms'),
    ],
    metrics: [
      { label: '5-year regret', value: 'Lower if you go', detail: 'Across 3 simulated branches', trend: 'up' },
      { label: 'Runway', value: '14 months', detail: 'After tax, with kids and mortgage', trend: 'steady' },
      { label: 'Identity stretch', value: 'High', detail: 'Founder identity at 12% of self-concept today', trend: 'up' },
    ],
    chart: {
      title: 'Three futures, weighted',
      description: 'Each bar is a simulated path. Higher means more aligned with stated values.',
      data: [
        { label: 'Stay', value: 32, color: 'cyan' },
        { label: 'Go now', value: 58, color: 'violet' },
        { label: 'Wait 6m', value: 44, color: 'amber' },
      ],
    },
    steps: [
      { title: 'Simulate paths', detail: 'Stay, go now, or wait six months. Side by side.', capabilityId: 'regret-sim' },
      { title: 'Model runway', detail: 'Cash, kids, mortgage, healthcare. Worst case shown.', capabilityId: 'runway-model' },
      { title: 'Surface patterns', detail: 'Past journals tell you which voice is fear and which is signal.', capabilityId: 'identity-cost' },
      { title: 'Draft the conversation', detail: 'Spouse first, then co-founders. Lines you can actually say.', capabilityId: 'partner-talk' },
    ],
    approval: {
      title: 'Approve the model run',
      description: 'Nothing is committed. The simulator runs, the conversations are drafted, you review.',
      risk: 'Low: this is private. Nothing leaves your machine until you press a separate Commit button.',
      actions: [
        'Simulate three futures, save the comparison',
        'Build the runway model with sensitivity sliders',
        'Draft conversations for spouse and co-founders',
        'Stage a witnessed commit ritual page',
      ],
    },
    checklist: [
      { label: 'Three futures visible', detail: 'Side by side. You can feel the weight.', checked: true },
      { label: 'Runway is honest', detail: 'Includes the unsexy line items.', checked: true },
      { label: 'Decision is reversible', detail: 'You can roll the commit page back at any time.', checked: false },
    ],
    hero: {
      eyebrow: 'Decision sandbox',
      title: 'A studio for the decision that defines the next decade.',
      body: 'Not a journal. Not a spreadsheet. A surface where the decision is allowed to be felt.',
      chips: ['Regret simulator', 'Runway model', 'Identity stretch', 'Conversation drafts'],
    },
    closingTitle: 'Why a chatbot cannot do this',
  },
  {
    id: 'dungeon-master',
    title: 'AI Dungeon Master',
    eyebrow: 'Agents as game engine',
    summary: 'A live tabletop session, generated. Sheets, dice, NPCs, encounters — never a chat box.',
    intent:
      'Run a one-shot tabletop RPG for 4 players, dark fantasy, two-hour session. Generate sheets, NPCs, dice, and encounter cards.',
    inputs: [
      {
        id: 'genre',
        label: 'Genre',
        type: 'select',
        value: 'dark_fantasy',
        options: [
          { label: 'Dark fantasy', value: 'dark_fantasy' },
          { label: 'Cyberpunk', value: 'cyberpunk' },
          { label: 'Heist comedy', value: 'heist' },
          { label: 'Cosmic horror', value: 'cosmic' },
        ],
      },
      {
        id: 'players',
        label: 'Player count',
        type: 'range',
        value: 4,
        min: 2,
        max: 6,
        step: 1,
      },
      {
        id: 'difficulty',
        label: 'Difficulty',
        type: 'select',
        value: 'tense',
        options: [
          { label: 'Cozy', value: 'cozy' },
          { label: 'Tense', value: 'tense' },
          { label: 'Brutal', value: 'brutal' },
        ],
      },
      {
        id: 'session_minutes',
        label: 'Session length (minutes)',
        type: 'range',
        value: 120,
        min: 30,
        max: 240,
        step: 15,
      },
    ],
    capabilities: [
      cap('sheet-forge', 'Character Sheets', 'creative', 'MCP: TTRPG', 'Generates four contrasting characters with hooks.', 96, '1.4s'),
      cap('encounter-gen', 'Encounter Cards', 'creative', 'MCP: TTRPG', 'Drafts three encounters scaled to player count.', 93, '2.1s'),
      cap('npc-cast', 'NPC Cast', 'creative', 'MCP: TTRPG', 'Generates 6 NPCs with voices and motives.', 91, '1.8s'),
      cap('dice-runner', 'Dice Runner', 'sensor', 'MCP: Random', 'Rolls dice with shared transcript.', 99, 'realtime'),
      cap('pacing-watch', 'Pacing Watcher', 'safety', 'MCP: Timer', 'Cuts scenes that overrun and warms up climax.', 84, 'realtime'),
    ],
    metrics: [
      { label: 'Players', value: '4', detail: 'All have hooks tied to the antagonist', trend: 'steady' },
      { label: 'Encounter mix', value: '3 cards', detail: 'Social, stealth, combat', trend: 'up' },
      { label: 'Run time', value: '120 min', detail: 'With one mid-session breath break', trend: 'steady' },
    ],
    chart: {
      title: 'Tension curve',
      description: 'How the session pacing rises through the three encounters.',
      data: [
        { label: 'Open', value: 18, color: 'cyan' },
        { label: 'Mid', value: 44, color: 'violet' },
        { label: 'Climax', value: 82, color: 'amber' },
        { label: 'Coda', value: 24, color: 'cyan' },
      ],
    },
    steps: [
      { title: 'Forge sheets', detail: 'Four characters, contrasting hooks, shared antagonist.', capabilityId: 'sheet-forge' },
      { title: 'Stage NPCs', detail: 'Six NPCs with motives and one secret each.', capabilityId: 'npc-cast' },
      { title: 'Lay encounters', detail: 'Three cards. Social, stealth, combat.', capabilityId: 'encounter-gen' },
      { title: 'Open the table', detail: 'Dice roller live. Pacing watcher armed.', capabilityId: 'dice-runner' },
    ],
    approval: {
      title: 'Approve the table to open',
      description: 'Pressing once spins the entire session up. You can pause any encounter; the agent will improvise.',
      risk: 'Low: it is a game. The agent will defer to the table on any dispute.',
      actions: [
        'Generate four character sheets with hooks',
        'Stage six NPCs with secrets',
        'Lay three encounters in a tension curve',
        'Open the live dice and pacing surface',
      ],
    },
    checklist: [
      { label: 'Every player has a hook', detail: 'Personal stake in the antagonist.', checked: true },
      { label: 'Pacing is honest', detail: 'Watcher will trim if a scene drags.', checked: true },
      { label: 'Improv-friendly', detail: 'NPCs have voices, agent can riff.', checked: true },
    ],
    hero: {
      eyebrow: 'Live game UI',
      title: 'A tabletop, generated. Not a chat box pretending.',
      body: 'Sheets. Dice. NPCs. Encounters. Pacing. Every surface a real, interactive object made for this session only.',
      chips: ['Character sheets', 'Live dice', 'Encounter cards', 'Pacing watch'],
    },
    closingTitle: 'Why agents are game engines',
  },
  {
    id: 'reality-compiler',
    title: 'Reality Compiler',
    eyebrow: 'Sentence in, prototype out',
    summary: 'Describe a system in one sentence. Watch the agents compile a working prototype.',
    intent:
      'Compile a marketplace where retired teachers tutor students remotely, with calendar booking, Stripe-style payouts, and a parental approval gate.',
    inputs: [
      {
        id: 'audience',
        label: 'Primary user',
        type: 'text',
        value: 'Parents of K-8 students',
      },
      {
        id: 'pricing',
        label: 'Pricing model',
        type: 'select',
        value: 'session',
        options: [
          { label: 'Per session', value: 'session' },
          { label: 'Subscription', value: 'sub' },
          { label: 'Bundles', value: 'bundle' },
        ],
      },
      {
        id: 'tone',
        label: 'Brand tone',
        type: 'select',
        value: 'warm',
        options: [
          { label: 'Warm and trustworthy', value: 'warm' },
          { label: 'Energetic and playful', value: 'play' },
          { label: 'Premium and minimal', value: 'premium' },
        ],
      },
      {
        id: 'guardrails',
        label: 'Guardrails',
        type: 'textarea',
        value: 'Background-checked tutors, recorded sessions, parental approval per booking.',
      },
    ],
    capabilities: [
      cap('schema-architect', 'Schema Architect', 'ops', 'MCP: Postgres', 'Drafts entity model and migrations.', 92, '1.4s'),
      cap('payments-wire', 'Payments Wire', 'commerce', 'MCP: Stripe-like', 'Plans split payouts, holds, and refunds.', 90, '1.6s'),
      cap('booking-engine', 'Booking Engine', 'calendar', 'MCP: Calendar', 'Wires availability, reschedules, no-shows.', 91, '1.3s'),
      cap('safety-gates', 'Safety Gates', 'safety', 'MCP: Trust', 'Background checks, recordings, parental approvals.', 95, '1.0s'),
      cap('preview-host', 'Preview Host', 'browser', 'MCP: Edge', 'Hosts the running prototype on a URL you can hand over.', 86, '2.4s'),
    ],
    metrics: [
      { label: 'Modules generated', value: '14', detail: 'Auth, schema, booking, payouts, parent gate', trend: 'up' },
      { label: 'First-run time', value: '< 60 s', detail: 'From sentence to clickable preview', trend: 'up' },
      { label: 'Guardrails active', value: '4', detail: 'Background, recording, approval, refund', trend: 'steady' },
    ],
    chart: {
      title: 'Module mix',
      description: 'How the prototype is composed under the hood.',
      data: [
        { label: 'Identity', value: 18, color: 'cyan' },
        { label: 'Booking', value: 32, color: 'violet' },
        { label: 'Payouts', value: 26, color: 'amber' },
        { label: 'Trust', value: 24, color: 'cyan' },
      ],
    },
    steps: [
      { title: 'Compile schema', detail: 'Entities, relationships, audit columns.', capabilityId: 'schema-architect' },
      { title: 'Wire booking', detail: 'Availability, reschedule, parental approval gate.', capabilityId: 'booking-engine' },
      { title: 'Plan payouts', detail: 'Holds, splits, refund window, dispute path.', capabilityId: 'payments-wire' },
      { title: 'Host preview', detail: 'Live URL. Pass it to the parent for a smell test.', capabilityId: 'preview-host' },
    ],
    approval: {
      title: 'Approve the compile',
      description: 'Nothing is deployed publicly. The preview is private until you flip a separate Publish toggle.',
      risk: 'Medium: this writes a real schema and a hosted preview. It does not take payments yet.',
      actions: [
        'Compile schema and run migrations in a sandbox',
        'Wire booking with parental approval gate',
        'Plan payouts and dispute path',
        'Host the prototype on a private URL',
      ],
    },
    checklist: [
      { label: 'Sentence is implementable', detail: 'No magical assumptions left unstated.', checked: true },
      { label: 'Guardrails are first-class', detail: 'Trust modules ship with v1, not later.', checked: true },
      { label: 'Preview is private', detail: 'Only the link holders can see it.', checked: true },
    ],
    hero: {
      eyebrow: 'Reality compiler',
      title: 'A working prototype, compiled from a sentence.',
      body: 'The swarm reads the spec, drafts the schema, and renders the controls a real user could click in under a minute.',
      chips: ['Schema', 'Booking', 'Payouts', 'Trust', 'Preview URL'],
    },
    closingTitle: 'Why this collapses the design-to-code distance',
  },
  {
    id: 'memory-lane',
    title: 'Memory Lane',
    eyebrow: 'Eulogy of the living',
    summary: 'Plan a milestone birthday like the people involved actually matter.',
    intent:
      'Plan my mom\'s 70th birthday. Three weeks out. I want surprise moments, real participation, and a memory book by the end of it.',
    inputs: [
      {
        id: 'guest_count',
        label: 'Guest count',
        type: 'range',
        value: 32,
        min: 6,
        max: 120,
        step: 1,
      },
      {
        id: 'budget',
        label: 'Budget',
        type: 'range',
        value: 4200,
        min: 500,
        max: 25000,
        step: 100,
      },
      {
        id: 'tone',
        label: 'Tone',
        type: 'select',
        value: 'tearful_joy',
        options: [
          { label: 'Quiet warmth', value: 'quiet' },
          { label: 'Tearful joy', value: 'tearful_joy' },
          { label: 'Loud celebration', value: 'loud' },
        ],
      },
      {
        id: 'venue',
        label: 'Venue type',
        type: 'select',
        value: 'home',
        options: [
          { label: 'Home', value: 'home' },
          { label: 'Restaurant private room', value: 'restaurant' },
          { label: 'Outdoor', value: 'outdoor' },
        ],
      },
    ],
    capabilities: [
      cap('memory-collect', 'Memory Collector', 'social', 'MCP: Forms', 'Collects audio, photo, and text memories from guests.', 94, '900ms'),
      cap('surprise-orchestrate', 'Surprise Orchestrator', 'calendar', 'MCP: Schedule', 'Times reveals so the moment lands.', 89, '1.2s'),
      cap('story-edit', 'Story Editor', 'creative', 'MCP: Editor', 'Stitches memories into a 7-minute story film.', 91, '2.6s'),
      cap('rsvp-track', 'RSVP Tracker', 'social', 'MCP: Mail', 'Sends invitations and tracks responses gently.', 92, '700ms'),
      cap('book-bind', 'Book Binder', 'commerce', 'MCP: Print', 'Prints a memory book and ships it on the day.', 87, '1.8s'),
    ],
    metrics: [
      { label: 'Memories collected', value: '47', detail: 'From 32 guests, with 11 audio clips', trend: 'up' },
      { label: 'Reveal moments', value: '3', detail: 'Doorway, toast, coda', trend: 'steady' },
      { label: 'Memory book', value: 'On track', detail: 'Ships morning of the event', trend: 'up' },
    ],
    chart: {
      title: 'Memory mix',
      description: 'What guests are sending in.',
      data: [
        { label: 'Stories', value: 42, color: 'violet' },
        { label: 'Photos', value: 36, color: 'cyan' },
        { label: 'Audio', value: 22, color: 'amber' },
      ],
    },
    steps: [
      { title: 'Send memory ask', detail: 'One link per guest. Audio, photo, or text.', capabilityId: 'memory-collect' },
      { title: 'Stage three reveals', detail: 'Doorway hug video, toast film, coda book.', capabilityId: 'surprise-orchestrate' },
      { title: 'Edit the story', detail: 'Seven minutes. Pacing matters.', capabilityId: 'story-edit' },
      { title: 'Print the book', detail: 'Hardcover, ships morning of the day.', capabilityId: 'book-bind' },
    ],
    approval: {
      title: 'Approve and start the asks',
      description: 'The agent sends warm, light invitations to guests and starts collecting memories.',
      risk: 'Low: nothing is paid for without your second click. Cancellable until the print queue cuts off.',
      actions: [
        'Send personalized memory invitations to 32 guests',
        'Stage doorway, toast, and coda reveals',
        'Begin film edit when 60% of memories are in',
        'Queue the printed memory book',
      ],
    },
    checklist: [
      { label: 'Guests feel asked, not summoned', detail: 'The note sounds like you, not like a form.', checked: true },
      { label: 'Reveals will land', detail: 'Three moments instead of one big one.', checked: true },
      { label: 'A keepsake remains', detail: 'The book outlives the night.', checked: true },
    ],
    hero: {
      eyebrow: 'Milestone studio',
      title: 'A milestone designed for the person, not the platform.',
      body: 'No registry app. No event template. The swarm built a surface that knows who this birthday is for.',
      chips: ['Memory ask', 'Surprise stage', 'Story film', 'Memory book'],
    },
    closingTitle: 'Why a template never could',
  },
  {
    id: 'self-surveillance',
    title: 'Surveillance State for Yourself',
    eyebrow: 'Personal panopticon',
    summary: 'A dashboard that watches you, on purpose. Habits, interventions, public stakes.',
    intent:
      'I want to break a pattern. Build me a panel that watches me, intervenes when I drift, and makes the consequences public to one person.',
    inputs: [
      {
        id: 'habit',
        label: 'Habit to change',
        type: 'text',
        value: 'Doomscrolling after 10 PM',
      },
      {
        id: 'intervention_aggression',
        label: 'Intervention aggression',
        type: 'range',
        value: 7,
        min: 1,
        max: 10,
        step: 1,
        helper: '10 = locks the device, calls a friend.',
      },
      {
        id: 'witness',
        label: 'Public witness',
        type: 'text',
        value: 'Sister, daily summary email at 8 AM',
      },
      {
        id: 'window',
        label: 'Window of effect',
        type: 'select',
        value: 'evening',
        options: [
          { label: 'Morning', value: 'morning' },
          { label: 'Evening', value: 'evening' },
          { label: 'All day', value: 'all_day' },
        ],
      },
    ],
    capabilities: [
      cap('habit-sense', 'Habit Sensor', 'sensor', 'MCP: Devices', 'Reads device usage and tags drift in real time.', 92, 'realtime'),
      cap('intervene', 'Intervener', 'safety', 'MCP: OS', 'Triggers escalating interventions if drift continues.', 88, 'realtime'),
      cap('witness-bot', 'Witness Bot', 'messaging', 'MCP: Mail', 'Sends honest daily summary to the chosen witness.', 95, '600ms'),
      cap('streak-bank', 'Streak Bank', 'memory', 'MCP: Self', 'Tracks streaks, slips, and the cost of slips.', 91, '500ms'),
      cap('reroute', 'Rerouter', 'creative', 'MCP: Self', 'Suggests a small alternative action, not a lecture.', 86, 'realtime'),
    ],
    metrics: [
      { label: 'Drift today', value: '14 min', detail: 'Down from 42 yesterday', trend: 'up' },
      { label: 'Streak', value: '3 days', detail: 'Best in 9 weeks', trend: 'up' },
      { label: 'Witness sees', value: 'Honest', detail: 'No spin in the daily mail', trend: 'steady' },
    ],
    chart: {
      title: 'Last 7 days, drift minutes',
      description: 'A line you cannot lie to. Lower is better.',
      data: [
        { label: 'Mon', value: 62, color: 'amber' },
        { label: 'Tue', value: 48, color: 'amber' },
        { label: 'Wed', value: 38, color: 'violet' },
        { label: 'Thu', value: 31, color: 'violet' },
        { label: 'Fri', value: 22, color: 'cyan' },
        { label: 'Sat', value: 19, color: 'cyan' },
        { label: 'Sun', value: 14, color: 'cyan' },
      ],
    },
    steps: [
      { title: 'Sense and tag', detail: 'Device usage labeled in real time.', capabilityId: 'habit-sense' },
      { title: 'Intervene gently', detail: 'Tier 1 nudge, then escalation if drift continues.', capabilityId: 'intervene' },
      { title: 'Reroute', detail: 'Offer a 90-second alternative action.', capabilityId: 'reroute' },
      { title: 'Daily honesty mail', detail: 'Witness sees real numbers at 8 AM.', capabilityId: 'witness-bot' },
    ],
    approval: {
      title: 'Approve the panopticon',
      description: 'You agree to be watched on purpose. You can pause for 1 hour, twice a day, no questions.',
      risk: 'Medium: real interventions, real public mail. You can disarm any time, but the witness sees the disarm.',
      actions: [
        'Begin habit sensing on this device',
        'Activate intervention ladder at level 7',
        'Wire the daily mail to the chosen witness',
        'Open the streak bank',
      ],
    },
    checklist: [
      { label: 'Honest with one person', detail: 'You picked the witness who actually loves you.', checked: true },
      { label: 'Reroute is not a lecture', detail: 'Tiny alternative action, not a guilt trip.', checked: true },
      { label: 'Pauses respected', detail: 'Two grace periods a day, no shame.', checked: true },
    ],
    hero: {
      eyebrow: 'Personal panopticon',
      title: 'A surface that watches you, because you asked it to.',
      body: 'No streak app. No habit gamification theater. Just measurement, intervention, and one honest witness.',
      chips: ['Sense', 'Intervene', 'Reroute', 'Witness'],
    },
    closingTitle: 'Why this is not Strava with a wig',
  },
  {
    id: 'speed-date-memory',
    title: 'Speed-Date Memory Aid',
    eyebrow: 'Mic-on networking',
    summary: 'Walk a hackathon, talk to humans, the UI remembers them for you.',
    intent:
      'I am at a 200-person AI event. Listen as I talk, build me a UI of who I have met, what they care about, and what I owe each one of them tomorrow.',
    inputs: [
      {
        id: 'event',
        label: 'Event',
        type: 'text',
        value: 'AI Tinkerers Boston, May 9',
      },
      {
        id: 'follow_up_speed',
        label: 'Follow-up window',
        type: 'select',
        value: '24h',
        options: [
          { label: 'Same evening', value: 'evening' },
          { label: 'Within 24 hours', value: '24h' },
          { label: 'Within a week', value: 'week' },
        ],
      },
      {
        id: 'prefs',
        label: 'What I am looking for',
        type: 'textarea',
        value: 'Generative UI co-builders, MCP enthusiasts, anyone shipping live agent UIs.',
      },
      {
        id: 'min_signal',
        label: 'Minimum signal to remember',
        type: 'range',
        value: 6,
        min: 1,
        max: 10,
        step: 1,
      },
    ],
    capabilities: [
      cap('mic-listen', 'Mic Listener', 'sensor', 'MCP: Audio', 'Transcribes conversations on the fly with consent.', 92, 'realtime'),
      cap('person-card', 'Person Card', 'memory', 'MCP: Cards', 'Generates a card per person with name, claim, hook.', 90, '900ms'),
      cap('owe-list', 'You-Owe Tracker', 'ops', 'MCP: Tasks', 'Tracks who you promised what.', 95, '500ms'),
      cap('proximity-ping', 'Proximity Ping', 'sensor', 'MCP: BLE', 'Warns when a met person walks back into the room.', 84, 'realtime'),
      cap('follow-up-draft', 'Follow-up Drafts', 'messaging', 'MCP: Mail', 'Drafts personalized notes ready for tomorrow.', 93, '1.1s'),
    ],
    metrics: [
      { label: 'People met', value: '14', detail: 'High-signal: 6, medium: 5, light: 3', trend: 'up' },
      { label: 'You owe', value: '4 actions', detail: 'Intros: 2, links: 1, demo: 1', trend: 'steady' },
      { label: 'Follow-up draft', value: '4 ready', detail: 'Personalized, dated for tomorrow morning', trend: 'up' },
    ],
    chart: {
      title: 'Conversation depth tonight',
      description: 'Which conversations went past the surface.',
      data: [
        { label: 'Surface', value: 42, color: 'cyan' },
        { label: 'Real', value: 36, color: 'violet' },
        { label: 'Deep', value: 22, color: 'amber' },
      ],
    },
    steps: [
      { title: 'Transcribe', detail: 'On-device with explicit consent. Discarded after the event.', capabilityId: 'mic-listen' },
      { title: 'Generate person cards', detail: 'Name, what they care about, the hook.', capabilityId: 'person-card' },
      { title: 'Track what you owe', detail: 'You promised 4 things. The agent remembers.', capabilityId: 'owe-list' },
      { title: 'Draft tomorrow morning notes', detail: 'Four personalized notes, paused until 8 AM.', capabilityId: 'follow-up-draft' },
    ],
    approval: {
      title: 'Approve the mic and follow-up drafts',
      description: 'Mic is opt-in per conversation. Follow-up drafts are staged but not sent until you confirm tomorrow.',
      risk: 'Medium: you are recording your own side and abstracting the conversation. Discarded at midnight.',
      actions: [
        'Begin opt-in transcription',
        'Generate person cards in real time',
        'Track promises and owed actions',
        'Stage personalized notes for 8 AM tomorrow',
      ],
    },
    checklist: [
      { label: 'Consent is explicit', detail: 'You ask each person before mic is on.', checked: true },
      { label: 'Promises tracked', detail: 'You will not break someone\'s trust by forgetting.', checked: true },
      { label: 'Notes feel like you', detail: 'Tone matches your texts, not LinkedIn.', checked: true },
    ],
    hero: {
      eyebrow: 'Networking surface',
      title: 'A memory you wear at the event, not after it.',
      body: 'No CRM. No business-card scanner. The swarm assembled the surface a real human needs while moving through a room.',
      chips: ['Person cards', 'Promises', 'Proximity', 'Tomorrow drafts'],
    },
    closingTitle: 'Why CRMs miss the moment',
  },
  {
    id: 'confessional',
    title: 'Confessional',
    eyebrow: 'Topic-aware journaling',
    summary: 'Speak honestly. The UI calibrates itself to anger, grief, or excitement.',
    intent:
      'I want to be honest with myself for ten minutes. Calibrate the surface to what I am actually feeling and stop pretending it is a productivity app.',
    inputs: [
      {
        id: 'mode',
        label: 'Felt sense',
        type: 'select',
        value: 'grief',
        options: [
          { label: 'Anger', value: 'anger' },
          { label: 'Grief', value: 'grief' },
          { label: 'Excitement', value: 'joy' },
          { label: 'Fear', value: 'fear' },
          { label: 'Confusion', value: 'fog' },
        ],
      },
      {
        id: 'duration',
        label: 'Time I will give it (min)',
        type: 'range',
        value: 10,
        min: 3,
        max: 30,
        step: 1,
      },
      {
        id: 'witness',
        label: 'Audience',
        type: 'select',
        value: 'self',
        options: [
          { label: 'Just me', value: 'self' },
          { label: 'A future me, in 5 years', value: 'future' },
          { label: 'One person, never to be sent', value: 'unsent' },
        ],
      },
      {
        id: 'topic',
        label: 'What this is about',
        type: 'textarea',
        value: 'I am still grieving someone, and I am tired of pretending that makes me weak.',
      },
    ],
    capabilities: [
      cap('mood-shape', 'Mood Shaper', 'sensor', 'MCP: Self', 'Calibrates layout, contrast, and pace to felt sense.', 90, '300ms'),
      cap('vault', 'Private Vault', 'safety', 'MCP: Local', 'Encrypts entries on-device. Never leaves the machine.', 99, '200ms'),
      cap('unsent-letters', 'Unsent Letters', 'creative', 'MCP: Writer', 'Drafts letters that will never be sent.', 86, '900ms'),
      cap('gratitude-log', 'Gratitude Log', 'memory', 'MCP: Self', 'Surfaces, only on demand.', 88, '300ms'),
      cap('anchor-line', 'Anchor Line', 'health', 'MCP: Calm', 'A single sentence the agent repeats at the end.', 84, '200ms'),
    ],
    metrics: [
      { label: 'Mode', value: 'Grief', detail: 'UI is slower, softer, single-column', trend: 'steady' },
      { label: 'Privacy', value: 'On-device', detail: 'Encrypted vault, no cloud', trend: 'up' },
      { label: 'Anchor line', value: 'Drafted', detail: 'A sentence to leave with', trend: 'steady' },
    ],
    chart: {
      title: 'Mode dial',
      description: 'How the surface adapts.',
      data: [
        { label: 'Pace', value: 28, color: 'violet' },
        { label: 'Density', value: 22, color: 'cyan' },
        { label: 'Contrast', value: 36, color: 'amber' },
      ],
    },
    steps: [
      { title: 'Calibrate', detail: 'UI slows down, single column, soft contrast.', capabilityId: 'mood-shape' },
      { title: 'Open the vault', detail: 'Encrypted on-device. No cloud, ever.', capabilityId: 'vault' },
      { title: 'Write the unsent', detail: 'A letter to someone you will not send it to.', capabilityId: 'unsent-letters' },
      { title: 'Leave an anchor line', detail: 'A single sentence the agent will repeat tomorrow morning.', capabilityId: 'anchor-line' },
    ],
    approval: {
      title: 'Begin the ten minutes',
      description: 'The agent will not interrupt unless you ask it to. The vault is encrypted on this device only.',
      risk: 'Low: nothing is sent. Nothing is shared. Erase any time.',
      actions: [
        'Calibrate UI to grief mode',
        'Open the encrypted vault for this session',
        'Draft an unsent letter',
        'Leave an anchor line for tomorrow',
      ],
    },
    checklist: [
      { label: 'On-device only', detail: 'No network calls leave this machine.', checked: true },
      { label: 'No productivity theater', detail: 'No streaks, no badges, no nudges.', checked: true },
      { label: 'You can erase', detail: 'One tap. Gone. The agent will not remind you it happened.', checked: true },
    ],
    hero: {
      eyebrow: 'Felt-sense surface',
      title: 'A confessional, calibrated to the actual feeling.',
      body: 'No streak. No badge. No "How was your day?" The swarm built a room you can be honest in.',
      chips: ['On-device', 'Mode-aware', 'Unsent letters', 'Anchor line'],
    },
    closingTitle: 'Why this is not a habit app',
  },
]

function cap(
  id: string,
  name: string,
  kind: import('./types').CapabilityKind,
  provider: string,
  description: string,
  confidence: number,
  latency: string,
): import('./types').Capability {
  return {
    id,
    name,
    kind,
    provider,
    description,
    permissions: providerPermissions(kind),
    inputs: [],
    confidence,
    latency,
  }
}

function providerPermissions(kind: import('./types').CapabilityKind): string[] {
  switch (kind) {
    case 'crm':
      return ['Read contacts', 'Draft deals']
    case 'research':
      return ['Read public profiles']
    case 'messaging':
      return ['Create drafts']
    case 'calendar':
      return ['Read availability', 'Create tentative holds']
    case 'finance':
      return ['Read sheets', 'Create model']
    case 'ops':
      return ['Create page', 'Manage tasks']
    case 'browser':
      return ['Navigate', 'Capture preview']
    case 'sensor':
      return ['Read sensor', 'Discarded after session']
    case 'memory':
      return ['On-device only']
    case 'creative':
      return ['Generate text', 'Draft only']
    case 'safety':
      return ['Reversible action', 'No external send']
    case 'commerce':
      return ['Sandbox transaction', 'Refundable']
    case 'social':
      return ['Send invitations', 'Track responses']
    case 'health':
      return ['On-device read']
    default:
      return []
  }
}

export function findUseCase(id: string): UseCaseDefinition {
  return useCases.find((useCase) => useCase.id === id) ?? useCases[0]
}
