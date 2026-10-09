import React, { memo, useEffect, useRef } from 'react';

const COMPANY_COLORS = {
  'Accenture': '#a371f7',
  'Adobe': '#f85149',
  'Amazon': '#d29922',
  'Apple': '#e6edf3',
  'Atlassian': '#58a6ff',
  'Blackrock': '#39c5cf',
  'ByteDance': '#3fb950',
  'Cisco': '#56d364',
  'Goldman Sach': '#eac54f',
  'Google': '#ff7b72'
};

function getCompanyColor(name) {
  return COMPANY_COLORS[name] || '#848d97';
}

const ProblemRow = memo(function ProblemRow({
  problem,
  isSolved,
  isFocused,
  activeTopic,
  activeCompany,
  onToggleSolved,
  onSelectTopic,
  onSelectCompany
}) {
  const rowRef = useRef(null);

  useEffect(() => {
    if (isFocused) rowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [isFocused]);

  return (
    <div ref={rowRef} className={`problem-row ${isSolved ? 'solved' : ''} ${isFocused ? 'kb-focus' : ''}`}>
      <div className="check-cell">
        <input
          type="checkbox"
          className="problem-check"
          checked={isSolved}
          onChange={(e) => onToggleSolved(problem.id, e.target.checked, e.target)}
          aria-label={`Mark ${problem.title} as solved`}
        />
      </div>

      <div className="content-cell">
        <div className="row-top">
          <span className="row-id">{problem.id}.</span>
          <a className="row-title" href={problem.link} target="_blank" rel="noopener noreferrer">
            <span>{problem.title}</span>
            <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor">
              <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 8.28 8.78a.75.75 0 0 1-1.06-1.06l4.75-4.75-1.543-1.543a.25.25 0 0 1 .177-.427Z"/>
            </svg>
          </a>
          <span className={`diff-pill ${problem.difficulty}`}>
            {problem.difficulty[0] + problem.difficulty.slice(1).toLowerCase()}
          </span>
        </div>

        <div className="row-bottom">
          {(problem.topics || []).map((t) => (
            <button
              key={t}
              type="button"
              className={`tag ${activeTopic === t ? 'active' : ''}`}
              onClick={() => onSelectTopic(activeTopic === t ? 'ALL' : t)}
              title={`Filter by topic: ${t}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="companies-cell">
        {(problem.companies || []).map((c) => (
          <button
            key={c}
            type="button"
            className={`tag company-pill ${activeCompany === c ? 'active' : ''}`}
            onClick={() => onSelectCompany(activeCompany === c ? 'ALL' : c)}
            title={`Filter by company: ${c}`}
          >
            <span className="dot" style={{ background: getCompanyColor(c) }}></span>
            <span>{c}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

const TABS = [
  ['ALL', 'All'],
  ['UNSOLVED', 'Todo'],
  ['SOLVED', 'Solved']
];

export default function ProblemTable({
  problems,
  totalCount,
  solvedSet,
  statusTab,
  onStatusTabChange,
  page,
  onPageChange,
  perPage,
  onPerPageChange,
  activeTopic,
  activeCompany,
  focusedIndex,
  onToggleSolved,
  onSelectTopic,
  onSelectCompany,
  onClearFilters
}) {
  const solvedCount = solvedSet.size;
  const tabCounts = { ALL: totalCount, UNSOLVED: totalCount - solvedCount, SOLVED: solvedCount };

  const totalFiltered = problems.length;
  const limit = perPage === 'ALL' ? Math.max(1, totalFiltered) : Number(perPage);
  const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
  const currentPage = Math.min(page, totalPages);

  const startIndex = (currentPage - 1) * limit;
  const endIndex = Math.min(startIndex + limit, totalFiltered);
  const pagedProblems = problems.slice(startIndex, endIndex);

  return (
    <div className="card list">
      <div className="list-header">
        <div className="segmented" role="tablist">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={statusTab === key}
              className={`seg-btn ${statusTab === key ? 'active' : ''}`}
              onClick={() => onStatusTabChange(key)}
            >
              {label}<span className="n">{tabCounts[key]}</span>
            </button>
          ))}
        </div>

        <div className="list-meta">
          <span>
            {totalFiltered === 0 ? 'No results' : `${startIndex + 1}–${endIndex} of ${totalFiltered}`}
          </span>
          <span className="per-page-wrap">
            <select
              className="select select-sm"
              value={perPage}
              onChange={(e) => onPerPageChange(e.target.value)}
              aria-label="Problems per page"
            >
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
              <option value="ALL">Show all</option>
            </select>
          </span>
        </div>
      </div>

      <div>
        {totalFiltered === 0 ? (
          <div className="empty-state">
            <h3>No matching problems</h3>
            <p>Try a different search or loosen your filters.</p>
            <button className="btn" onClick={onClearFilters}>Clear filters</button>
          </div>
        ) : (
          pagedProblems.map((q, idx) => (
            <ProblemRow
              key={q.id}
              problem={q}
              isSolved={solvedSet.has(q.id)}
              isFocused={focusedIndex === idx}
              activeTopic={activeTopic}
              activeCompany={activeCompany}
              onToggleSolved={onToggleSolved}
              onSelectTopic={onSelectTopic}
              onSelectCompany={onSelectCompany}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <nav className="list-footer" aria-label="Pagination">
          <button className="page-btn" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} aria-label="Previous page">
            ‹
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => totalPages <= 8 || p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
            .map((p, i, arr) => {
              const prev = arr[i - 1];
              return (
                <React.Fragment key={p}>
                  {prev && p - prev > 1 && <span className="page-btn dots">…</span>}
                  <button
                    className={`page-btn ${currentPage === p ? 'active' : ''}`}
                    onClick={() => onPageChange(p)}
                    aria-current={currentPage === p ? 'page' : undefined}
                  >
                    {p}
                  </button>
                </React.Fragment>
              );
            })}

          <button className="page-btn" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} aria-label="Next page">
            ›
          </button>
        </nav>
      )}
    </div>
  );
}
