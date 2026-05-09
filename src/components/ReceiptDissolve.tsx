import type { ArtifactReceipt, UseCaseDefinition } from '../types'

type ReceiptDissolveProps = {
  artifactReceipt?: ArtifactReceipt
  useCase: UseCaseDefinition
  onDismiss: () => void
}

export function ReceiptDissolve({ artifactReceipt, useCase, onDismiss }: ReceiptDissolveProps) {
  return (
    <section className="receipt-shell" role="dialog" aria-label="Execution receipt">
      <div className="receipt-card">
        <p className="eyebrow">Local artifact receipt</p>
        <h2>{artifactReceipt ? 'A real output packet was created.' : 'The local export is still resolving.'}</h2>
        <p>
          AgenticPrime completed the <strong>{useCase.title}</strong> run and wrote the approved surface into local
          files you can inspect, edit, submit, or hand to another agent.
        </p>
        {artifactReceipt ? (
          <>
            <div className="artifact-folder">
              <span>Output folder</span>
              <code>{artifactReceipt.folder}</code>
            </div>
            <ul className="artifact-list">
              {artifactReceipt.files.map((file) => (
                <li key={file.path}>
                  <strong>{file.label}</strong>
                  <code>{file.path}</code>
                  <span>{file.purpose}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <ul className="action-list">
            {useCase.approval.actions.map((action) => (
              <li key={action}>Approved: {action}</li>
            ))}
          </ul>
        )}
        <p className="receipt-fineprint">
          {artifactReceipt?.summary ??
            'If export fails, the app will show the failure here instead of pretending work happened.'}
        </p>
        <div className="intent-actions">
          <button className="secondary-action" type="button" onClick={onDismiss}>
            Start another surface
          </button>
        </div>
      </div>
    </section>
  )
}
