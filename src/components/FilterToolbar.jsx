import React from 'react';

export default function FilterToolbar({
  query,
  onQueryChange,
  topic,
  onTopicChange,
  topicsList,
  company,
  onCompanyChange,
  companiesList,
  sort,
  onSortChange,
  searchInputRef
}) {
  return (
    <div className="toolbar">
      <div className="search-wrap">
        <svg className="search-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.5 4.5 0 1 0-9 0 4.5 4.5 0 0 0 9 0Z"/>
        </svg>
        <input
          ref={searchInputRef}
          type="text"
          className="search-input"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search title, #id, topic, company…"
          aria-label="Search problems"
        />
        <div className="search-end">
          {query ? (
            <button className="search-clear-btn" onClick={() => onQueryChange('')} aria-label="Clear search">
              &times;
            </button>
          ) : (
            <kbd>/</kbd>
          )}
        </div>
      </div>

      <select
        className={`select ${topic !== 'ALL' ? 'is-set' : ''}`}
        value={topic}
        onChange={(e) => onTopicChange(e.target.value)}
        aria-label="Filter by topic"
      >
        <option value="ALL">All topics</option>
        {topicsList.map(([t, count]) => (
          <option key={t} value={t}>{t} ({count})</option>
        ))}
      </select>

      <select
        className={`select ${company !== 'ALL' ? 'is-set' : ''}`}
        value={company}
        onChange={(e) => onCompanyChange(e.target.value)}
        aria-label="Filter by company"
      >
        <option value="ALL">All companies</option>
        {companiesList.map(([c, count]) => (
          <option key={c} value={c}>{c} ({count})</option>
        ))}
      </select>

      <select
        className="select"
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        aria-label="Sort problems"
      >
        <option value="freq">Sort: Most asked</option>
        <option value="id">Sort: Problem #</option>
        <option value="alpha">Sort: Title A–Z</option>
        <option value="diff">Sort: Difficulty</option>
      </select>
    </div>
  );
}
