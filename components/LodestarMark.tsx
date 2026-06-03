export default function LodestarMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'lodestar-mark compact' : 'lodestar-mark'} aria-label="Lodestar CV">
      <div className="sun-arc" />
      <div className="horizon-line" />
      <div className="glow" />
      {!compact && (
        <div className="wordmark-block">
          <div className="wordmark">LODESTAR</div>
          <div className="cv-row"><span />CV<span /></div>
        </div>
      )}
    </div>
  );
}
