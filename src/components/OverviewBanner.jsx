import React from 'react';

const RING_R = 48;
const RING_C = 2 * Math.PI * RING_R;

function DiffCard({ level, name, solved, total, activeDiff, onSelectDiff }) {
  const isActive = activeDiff === level;
  const pct = total ? (solved / total) * 100 : 0;
  return (
    <button
      className={`diff-card ${name.toLowerCase()} ${isActive ? 'active' : ''}`}
      onClick={() => onSelectDiff(isActive ? 'ALL' : level)}
      title={isActive ? 'Clear difficulty filter' : `Show only ${name}`}
      aria-pressed={isActive}
    >
      <div className="diff-card-top">
        <span className="diff-card-name">{name}</span>
        <span className="diff-card-count">{solved}<span>/{total}</span></span>
      </div>
      <div className="mini-bar"><div style={{ width: `${pct}%` }} /></div>
    </button>
  );
}

export default function OverviewBanner({
  totalCount,
  solvedCount,
  easySolved,
  easyTotal,
  medSolved,
  medTotal,
  hardSolved,
  hardTotal,
  activeDiff,
  onSelectDiff,
  onExport,
  onImport,
  onReset
}) {
  const ratio = totalCount ? solvedCount / totalCount : 0;
  const overallPct = Math.round(ratio * 100);

  return (
    <section className="card overview">
      <div className="ring" title={`${overallPct}% complete`}>
        <svg width="112" height="112" viewBox="0 0 112 112">
          <circle className="ring-track" cx="56" cy="56" r={RING_R} fill="none" strokeWidth="8" />
          <circle
            className="ring-fill"
            cx="56" cy="56" r={RING_R}
            fill="none" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - ratio)}
          />
        </svg>
        <div className="ring-label">
          <b>{solvedCount}</b>
          <span>of {totalCount} solved</span>
        </div>
      </div>

      <div className="overview-body">
        <div className="overview-head">
          <div>
            <h1>Interview Problems</h1>
            <p>{totalCount} company-tagged questions · {overallPct}% complete</p>
          </div>
          <div className="overview-actions">
            <button className="btn" onClick={onExport} title="Export progress to JSON">Export</button>
            <label className="btn" title="Import progress from JSON">
              Import
              <input type="file" accept="application/json" onChange={onImport} hidden />
            </label>
            <button className="btn btn-ghost-danger" onClick={onReset} title="Reset all progress">Reset</button>
          </div>
        </div>

        <div className="diff-cards">
          <DiffCard level="EASY" name="Easy" solved={easySolved} total={easyTotal} activeDiff={activeDiff} onSelectDiff={onSelectDiff} />
          <DiffCard level="MEDIUM" name="Medium" solved={medSolved} total={medTotal} activeDiff={activeDiff} onSelectDiff={onSelectDiff} />
          <DiffCard level="HARD" name="Hard" solved={hardSolved} total={hardTotal} activeDiff={activeDiff} onSelectDiff={onSelectDiff} />
        </div>
      </div>
    </section>
  );
}
