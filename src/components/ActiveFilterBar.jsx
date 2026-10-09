import React from 'react';

function Chip({ label, value, onRemove }) {
  return (
    <span className="chip">
      <span className="chip-label">{label}</span>
      <span>{value}</span>
      <button className="chip-remove" onClick={onRemove} aria-label={`Remove ${label.toLowerCase()} filter`}>
        &times;
      </button>
    </span>
  );
}

export default function ActiveFilterBar({
  topic,
  onClearTopic,
  company,
  onClearCompany,
  diff,
  onClearDiff,
  query,
  onClearQuery,
  onClearAll
}) {
  const chips = [];
  if (query.trim()) chips.push(<Chip key="q" label="Search" value={`“${query.trim()}”`} onRemove={onClearQuery} />);
  if (topic !== 'ALL') chips.push(<Chip key="t" label="Topic" value={topic} onRemove={onClearTopic} />);
  if (company !== 'ALL') chips.push(<Chip key="c" label="Company" value={company} onRemove={onClearCompany} />);
  if (diff !== 'ALL') chips.push(<Chip key="d" label="Difficulty" value={diff[0] + diff.slice(1).toLowerCase()} onRemove={onClearDiff} />);

  if (chips.length === 0) return null;

  return (
    <div className="active-filters">
      {chips}
      {chips.length > 1 && (
        <button className="clear-all-btn" onClick={onClearAll}>Clear all</button>
      )}
    </div>
  );
}
