import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import PROBLEMS from './data/problems.json';

import TopNav from './components/TopNav';
import OverviewBanner from './components/OverviewBanner';
import FilterToolbar from './components/FilterToolbar';
import ActiveFilterBar from './components/ActiveFilterBar';
import ProblemTable from './components/ProblemTable';
import ShortcutsModal from './components/ShortcutsModal';
import ToastContainer from './components/ToastContainer';

export default function App() {
  const [solved, setSolved] = useState(new Set());
  const [dbStatus, setDbStatus] = useState('checking'); // 'checking' | 'connected' | 'error'
  const [statusTab, setStatusTab] = useState('ALL'); // 'ALL' | 'UNSOLVED' | 'SOLVED'
  const [topic, setTopic] = useState('ALL');
  const [company, setCompany] = useState('ALL');
  const [diff, setDiff] = useState('ALL');
  const [sort, setSort] = useState('freq');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [toasts, setToasts] = useState([]);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // ---------- Theme (dark / light) ----------
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('lc_theme') || 'dark'; } catch { return 'dark'; }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('lc_theme', theme); } catch {}
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const searchInputRef = useRef(null);

  // ---------------- Toast Notifications ----------------
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // ---------------- Load Saved Progress ----------------
  useEffect(() => {
    async function initProgress() {
      try {
        const res = await fetch('/api/solved');
        if (!res.ok) throw new Error('Server returned ' + res.status);
        const ids = await res.json();
        setSolved(new Set(ids));
        localStorage.setItem('leetcode_solved_cache', JSON.stringify(ids));
        setDbStatus('connected');
      } catch (err) {
        console.warn('Postgres offline, using local cache:', err);
        try {
          const cached = localStorage.getItem('leetcode_solved_cache');
          if (cached) {
            const ids = JSON.parse(cached);
            if (Array.isArray(ids)) setSolved(new Set(ids));
          }
        } catch (e) {}
        setDbStatus('error');
        showToast('Running in local offline cache mode.', 'info');
      }
    }
    initProgress();
  }, [showToast]);

  // ---------------- Toggle Solved ----------------
  const toggleSolved = useCallback(async (id, isSolvedNow, targetEl) => {
    setSolved((prev) => {
      const next = new Set(prev);
      if (isSolvedNow) next.add(id);
      else next.delete(id);
      try {
        localStorage.setItem('leetcode_solved_cache', JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });

    if (isSolvedNow) {
      const confettiColors = ['#ffa116', '#1cbbaa', '#ffb800', '#f6524d', '#ffffff'];
      if (targetEl && targetEl.getBoundingClientRect) {
        const rect = targetEl.getBoundingClientRect();
        confetti({
          particleCount: 60,
          spread: 80,
          origin: {
            x: (rect.left + rect.width / 2) / window.innerWidth,
            y: (rect.top + rect.height / 2) / window.innerHeight
          },
          colors: confettiColors,
          scalar: 0.9
        });
      } else {
        confetti({ particleCount: 60, spread: 80, origin: { y: 0.8 }, colors: confettiColors });
      }
    }

    try {
      const res = await fetch(`/api/solved/${id}`, {
        method: isSolvedNow ? 'POST' : 'DELETE'
      });
      if (!res.ok) throw new Error('Server returned ' + res.status);
      setDbStatus('connected');
    } catch (e) {
      setDbStatus('error');
    }
  }, []);

  // ---------------- Reset Progress ----------------
  const resetProgress = useCallback(async () => {
    if (!window.confirm('Are you sure you want to reset all solved progress? This cannot be undone.')) {
      return;
    }
    try {
      await fetch('/api/reset', { method: 'POST' });
    } catch (e) {}
    setSolved(new Set());
    localStorage.removeItem('leetcode_solved_cache');
    showToast('Progress reset successfully.', 'info');
  }, [showToast]);

  // ---------------- Export & Import Progress ----------------
  const exportProgress = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      solvedCount: solved.size,
      totalCount: PROBLEMS.length,
      solvedIds: Array.from(solved)
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leetcode-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Progress exported to JSON.', 'success');
  }, [solved, showToast]);

  const importProgress = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const ids = Array.isArray(parsed) ? parsed : parsed.solvedIds;
        if (!Array.isArray(ids)) throw new Error('Invalid JSON format');

        setSolved((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => { if (Number.isInteger(id)) next.add(id); });
          try {
            localStorage.setItem('leetcode_solved_cache', JSON.stringify(Array.from(next)));
          } catch (err) {}
          return next;
        });

        try {
          await fetch('/api/solved/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
          });
        } catch (err) {}

        showToast(`Imported ${ids.length} problem(s).`, 'success');
      } catch (err) {
        showToast('Could not import file. Please select a valid JSON export.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [showToast]);

  // ---------------- Derived Topic & Company Lists ----------------
  const { topicsList, companiesList, diffTotals } = useMemo(() => {
    const tMap = new Map();
    const cMap = new Map();
    let easy = 0, med = 0, hard = 0;

    PROBLEMS.forEach((q) => {
      if (q.difficulty === 'EASY') easy++;
      else if (q.difficulty === 'MEDIUM') med++;
      else if (q.difficulty === 'HARD') hard++;

      (q.topics || []).forEach((t) => tMap.set(t, (tMap.get(t) || 0) + 1));
      (q.companies || []).forEach((c) => cMap.set(c, (cMap.get(c) || 0) + 1));
    });

    const sTopics = Array.from(tMap.entries()).sort((a, b) => b[1] - a[1]);
    const sCompanies = Array.from(cMap.entries()).sort((a, b) => b[1] - a[1]);

    return {
      topicsList: sTopics,
      companiesList: sCompanies,
      diffTotals: { easy, med, hard }
    };
  }, []);

  // ---------------- Difficulty Solved Counts ----------------
  const { easySolved, medSolved, hardSolved } = useMemo(() => {
    let easy = 0, med = 0, hard = 0;
    PROBLEMS.forEach((q) => {
      if (solved.has(q.id)) {
        if (q.difficulty === 'EASY') easy++;
        else if (q.difficulty === 'MEDIUM') med++;
        else if (q.difficulty === 'HARD') hard++;
      }
    });
    return { easySolved: easy, medSolved: med, hardSolved: hard };
  }, [solved]);

  // ---------------- Filtering & Sorting ----------------
  const filteredProblems = useMemo(() => {
    let rows = PROBLEMS;

    // Status Tab
    if (statusTab === 'UNSOLVED') rows = rows.filter((q) => !solved.has(q.id));
    else if (statusTab === 'SOLVED') rows = rows.filter((q) => solved.has(q.id));

    // Problem Type / Topic
    if (topic !== 'ALL') {
      rows = rows.filter((q) => (q.topics || []).includes(topic));
    }

    // Company
    if (company !== 'ALL') {
      rows = rows.filter((q) => (q.companies || []).includes(company));
    }

    // Difficulty
    if (diff !== 'ALL') {
      rows = rows.filter((q) => q.difficulty === diff);
    }

    // Search query
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter((r) =>
        r.title.toLowerCase().includes(q) ||
        String(r.id) === q ||
        (r.topics || []).some((t) => t.toLowerCase().includes(q)) ||
        (r.companies || []).some((c) => c.toLowerCase().includes(q))
      );
    }

    // Sorting
    rows = rows.slice();
    if (sort === 'freq') {
      rows.sort((a, b) => b.count - a.count || a.id - b.id);
    } else if (sort === 'id') {
      rows.sort((a, b) => a.id - b.id);
    } else if (sort === 'alpha') {
      rows.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'diff') {
      const diffRank = (d) => (d === 'EASY' ? 0 : d === 'MEDIUM' ? 1 : 2);
      rows.sort((a, b) => diffRank(a.difficulty) - diffRank(b.difficulty) || a.id - b.id);
    }

    return rows;
  }, [statusTab, topic, company, diff, query, sort, solved]);

  // ---------------- Filter Handlers ----------------
  const handleSelectTopic = useCallback((newTopic) => {
    setTopic(newTopic);
    setPage(1);
  }, []);

  const handleSelectCompany = useCallback((newCompany) => {
    setCompany(newCompany);
    setPage(1);
  }, []);

  const handleSelectDiff = useCallback((newDiff) => {
    setDiff(newDiff);
    setPage(1);
  }, []);

  const handleQueryChange = useCallback((newQuery) => {
    setQuery(newQuery);
    setPage(1);
  }, []);

  const handleClearAll = useCallback(() => {
    setTopic('ALL');
    setCompany('ALL');
    setDiff('ALL');
    setQuery('');
    setPage(1);
  }, []);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [statusTab, topic, company, diff, query, sort, page, perPage]);

  // ---------------- Keyboard Shortcuts ----------------
  useEffect(() => {
    function handleKeyDown(e) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape') document.activeElement.blur();
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      if (e.key === 'Escape') {
        setIsShortcutsOpen(false);
        return;
      }

      const limit = perPage === 'ALL' ? Math.max(1, filteredProblems.length) : Number(perPage);
      const totalPages = Math.max(1, Math.ceil(filteredProblems.length / limit));
      const offset = (Math.min(page, totalPages) - 1) * limit;
      const visibleCount = Math.max(0, Math.min(limit, filteredProblems.length - offset));
      const focusedProb = focusedIndex >= 0 ? filteredProblems[offset + focusedIndex] : null;

      if (e.key === 'j') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, visibleCount - 1));
      } else if (e.key === 'k') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'x' && focusedProb) {
        e.preventDefault();
        toggleSolved(focusedProb.id, !solved.has(focusedProb.id));
      } else if (e.key === 'Enter' && focusedProb && document.activeElement === document.body) {
        e.preventDefault();
        window.open(focusedProb.link, '_blank', 'noopener');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [perPage, filteredProblems, focusedIndex, page, solved, toggleSolved]);

  return (
    <>
      <TopNav
        dbStatus={dbStatus}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="container">
        {/* Progress & Overview Banner */}
        <OverviewBanner
          totalCount={PROBLEMS.length}
          solvedCount={solved.size}
          easySolved={easySolved}
          easyTotal={diffTotals.easy}
          medSolved={medSolved}
          medTotal={diffTotals.med}
          hardSolved={hardSolved}
          hardTotal={diffTotals.hard}
          activeDiff={diff}
          onSelectDiff={handleSelectDiff}
          onExport={exportProgress}
          onImport={importProgress}
          onReset={resetProgress}
        />

        {/* Filter Toolbar */}
        <FilterToolbar
          query={query}
          onQueryChange={handleQueryChange}
          topic={topic}
          onTopicChange={handleSelectTopic}
          topicsList={topicsList}
          company={company}
          onCompanyChange={handleSelectCompany}
          companiesList={companiesList}
          sort={sort}
          onSortChange={setSort}
          searchInputRef={searchInputRef}
        />

        {/* Active Filter Chips */}
        <ActiveFilterBar
          topic={topic}
          onClearTopic={() => handleSelectTopic('ALL')}
          company={company}
          onClearCompany={() => handleSelectCompany('ALL')}
          diff={diff}
          onClearDiff={() => handleSelectDiff('ALL')}
          query={query}
          onClearQuery={() => handleQueryChange('')}
          onClearAll={handleClearAll}
        />

        {/* GitHub Issues Problem Table */}
        <ProblemTable
          problems={filteredProblems}
          totalCount={PROBLEMS.length}
          solvedSet={solved}
          statusTab={statusTab}
          onStatusTabChange={(newTab) => { setStatusTab(newTab); setPage(1); }}
          page={page}
          onPageChange={(newPage) => {
            setPage(newPage);
            window.scrollTo({ top: 120, behavior: 'smooth' });
          }}
          perPage={perPage}
          onPerPageChange={(newPerPage) => {
            setPerPage(newPerPage);
            setPage(1);
          }}
          activeTopic={topic}
          activeCompany={company}
          focusedIndex={focusedIndex}
          onToggleSolved={toggleSolved}
          onSelectTopic={handleSelectTopic}
          onSelectCompany={handleSelectCompany}
          onClearFilters={handleClearAll}
        />

        <footer className="page-footer">
          Press <kbd>?</kbd> for keyboard shortcuts
        </footer>
      </main>

      {/* Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} />
    </>
  );
}
