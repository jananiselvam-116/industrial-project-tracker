import '../styles/company.css';

function getStatusInfo(pct) {
  if (pct >= 100) return { label: 'Completed', cls: 'badge-success' };
  if (pct < 50)   return { label: 'Delayed',   cls: 'badge-danger'  };
  return            { label: 'On Track',  cls: 'badge-warning' };
}

function ProgressCard({ label, value, icon, accent }) {
  return (
    <div className={`pcard pcard-${accent}`}>
      <div className="pcard-icon">{icon}</div>
      <div className="pcard-body">
        <div className="pcard-label">{label}</div>
        <div className="pcard-value">{value}</div>
      </div>
    </div>
  );
}

function ProgressBar({ pct }) {
  const { label, cls } = getStatusInfo(pct);
  const clamped = Math.min(100, Math.max(0, pct));

  return (
    <div className="progress-block">
      <div className="progress-top">
        <span className="progress-pct">{clamped}%</span>
        <span className={`badge ${cls}`}>{label}</span>
      </div>
      <div className="progress-track">
        <div
          className={`progress-fill fill-${cls.replace('badge-', '')}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export { ProgressCard, ProgressBar, getStatusInfo };
