import type { UseCaseDefinition } from '../types'

type UseCasePickerProps = {
  useCases: UseCaseDefinition[]
  selectedId: string
  onSelect: (id: string) => void
}

const HERO_USE_CASE_ID = 'crisis-operator'

export function UseCasePicker({ useCases, selectedId, onSelect }: UseCasePickerProps) {
  return (
    <section className="picker-shell" aria-label="Use case shelf">
      <div className="picker-heading">
        <p className="eyebrow">Use cases</p>
        <h2>Choose the situation.</h2>
        <p>Each card loads a focused task surface, tuned by one intent and a small set of controls.</p>
      </div>
      <div className="picker-rail">
        {useCases.map((useCase) => {
          const isSelected = useCase.id === selectedId
          const isHero = useCase.id === HERO_USE_CASE_ID
          return (
            <button
              key={useCase.id}
              type="button"
              className={`picker-card ${isSelected ? 'picker-active' : ''} ${isHero ? 'picker-hero' : ''}`}
              onClick={() => onSelect(useCase.id)}
            >
              {isHero ? <span className="picker-hero-badge">Hero demo</span> : null}
              <span className="picker-eyebrow">{useCase.eyebrow}</span>
              <strong>{useCase.title}</strong>
              <span className="picker-summary">{useCase.summary}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
