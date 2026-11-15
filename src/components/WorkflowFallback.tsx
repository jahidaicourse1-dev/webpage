interface WorkflowFallbackProps {
  className?: string;
}

const STAGES = [
  { id: '01', label: 'Trigger', sub: 'Sheets / Webhook' },
  { id: '02', label: 'Orchestrate', sub: 'n8n Pipeline' },
  { id: '03', label: 'Reason', sub: 'Gemini API' },
  { id: '04', label: 'Deliver', sub: 'Web / Telegram / Mail' },
];

export default function WorkflowFallback({ className = '' }: WorkflowFallbackProps) {
  return (
    <div
      data-testid="workflow-fallback"
      aria-label="Workflow automation pipeline diagram"
      className={`relative border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8 planning-grid-bg ${className}`}
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-6">
        <span className="font-mono-tabular text-xs uppercase tracking-wider text-[var(--muted)]">
          Pipeline Architecture
        </span>
        <span className="font-mono-tabular text-xs font-medium text-[var(--text)]">4 Stages</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {STAGES.map((stage, index) => (
          <div
            key={stage.id}
            className="relative border border-[var(--border)] bg-[var(--bg)] p-4 flex flex-col justify-between min-h-[104px]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-[1.5px] w-3 bg-[var(--accent)]" aria-hidden="true" />
                <span className="font-mono-tabular text-xs font-medium text-[var(--text)]">
                  {stage.id}
                </span>
              </div>
              {index < STAGES.length - 1 && (
                <span className="font-mono-tabular text-xs text-[var(--muted)]" aria-hidden="true">
                  →
                </span>
              )}
            </div>
            <div className="mt-4">
              <div className="font-display text-base font-semibold text-[var(--text)]">{stage.label}</div>
              <div className="text-xs text-[var(--muted)] mt-0.5">{stage.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
