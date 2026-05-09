import { findUseCase, useCases } from './useCases'

/**
 * Lightweight keyword routing so mismatched wording (e.g. burgers + Security Deposit) can snap to a
 * closer operator before `/api/generate-ui`. Not ML — conservative thresholds with a sticky bias.
 */
const INTENT_TAGS: Record<string, readonly RegExp[]> = {
  'security-deposit-dispute': [
    /deposit|landlord|tenant|eviction|\blease\b|withhold|itemized|\brent\b|\bmove[-\s]?out\b|surety|\btrebled?\b|\bmailbox\b(?!\s+automation)/i,
  ],
  'negotiation-theater': [/salary|compensation|negotiat|offer|counteroffer|renewal|\bvendor\b|\bcontract\b|\bwalk[-\s]?away\b|\bcomp\s+negotiat/i],
  'crisis-operator': [/passport|visa|lost|stranded|\bembassy\b|emergency|[\s,]battery|\brun out\b|\bstolen\b|\bhotel\b\s+now/i],
  'win-this-room': [
    /\bhackathon\b|\b(?:ship|demo)\b.*\d|\b\d+\s*(?:hours?|hrs?)\b.*deadline|\bexpo\b|\bpitch\b(?!\s+deck\s+investor\b)/i,
    /\b(?:restaurant|burger|coffee|food|\beat\b|brunch|dinner|lunch|cafe)|where\s+(?:can|should)\s+i\s+(?:eat|find)|things\s+to\s+do\b/i,
    /\bnboston\b(?!\s+marathon\b)|\bbi\s+tinkerers\b/i,
  ],
  'existential-decision': [/quit\s+(?:my\s+)?job|should\s+i\s+(?:move|quit|marry)|found\s+(?:a\s+)?company|relocat|fork\s+in\s+the\s+road/i],
  'dungeon-master': [/\bdnd\b|\bdungeons?\s*(?:and|\/)\s*dragons\b|\bnpc\b|\bdice\b.*\d|\bcampaign\b|\btabletop\b|\brogue\b(?!\s*mortgage)/i],
  'reality-compiler':
    [/prototype|compile\s+(?:into|from)|sentence(?:\s+in)?(?:\s+out)?|\barchitecture\b\s+sketch|\bspec\b.*system/i],
  'memory-lane': [/birthday\s+party|\bmilestone\b.*(?:birthday|celebr)|eulogy|toast\s+(?:to|speech)/i],
  'self-surveillance': [/habit|streak|\baccountabilit|surveillance\b.*(?:self|myself)|intervention\b.*habit|\bdopamine\b/i],
  'speed-date-memory': [/meet\s+(?:people|folks)|networking|remember\s+(?:names|who)|hallway\s+conversation|\bconference\b.*people/i],
  'confessional': [/journal|grief|venting|confess|diary|mood:\s*|how\s+angry|heartbreak/i],
}

function scoreUseCase(id: string, text: string): number {
  const patterns = INTENT_TAGS[id]
  if (!patterns?.length) {
    return 0
  }

  let score = 0
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      score += 5
    }
  }

  return Math.min(score, 15)
}

export type UseCaseRouting = {
  /** Use-case id we should generate with */
  toId: string
  /** Human-readable label for UI status lines */
  label: string
  /** Debugging / QA */
  fromId: string
}

/**
 * Returns a routing suggestion when keyword evidence clearly favors another card.
 * Applies a sticky bonus to the active card so tiny hints do not bounce the operator.
 */
export function suggestUseCaseRouting(currentId: string, intentTrimmed: string): UseCaseRouting | null {
  if (!intentTrimmed) {
    return null
  }

  const lowered = intentTrimmed.toLowerCase()

  const raw = new Map<string, number>()
  for (const definition of useCases) {
    raw.set(definition.id, scoreUseCase(definition.id, lowered))
  }

  const stickyBonus = 2
  let bestId = currentId
  let bestAdjusted = (raw.get(currentId) ?? 0) + stickyBonus

  for (const definition of useCases) {
    const adjusted = (raw.get(definition.id) ?? 0) + (definition.id === currentId ? stickyBonus : 0)
    if (adjusted > bestAdjusted) {
      bestAdjusted = adjusted
      bestId = definition.id
    }
  }

  if (bestId === currentId) {
    return null
  }

  const challenger = raw.get(bestId) ?? 0
  const incumbent = raw.get(currentId) ?? 0

  if (challenger < 5 || challenger - incumbent < 3) {
    return null
  }

  return {
    fromId: currentId,
    toId: bestId,
    label: findUseCase(bestId).title,
  }
}
