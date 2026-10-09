(function(){
  const dataEl = document.getElementById('data-island');
  if(!dataEl) return;
  const DATA = JSON.parse(dataEl.textContent);
  const TOTAL = DATA.length;

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

  function getCompanyColor(name){
    return COMPANY_COLORS[name] || '#848d97';
  }

  // State
  const state = {
    solved: new Set(),
    statusTab: 'ALL', // 'ALL' | 'UNSOLVED' | 'SOLVED'
    topic: 'ALL',
    company: 'ALL',
    diff: 'ALL',
    sort: 'freq', // 'freq' | 'id' | 'alpha' | 'diff'
    query: '',
    perPage: 50,
    page: 1
  };

  let focusedIndex = -1;

  // Topic & Company indexes
  const topicMap = new Map();
  const companyMap = new Map();

  DATA.forEach(q => {
    (q.topics || []).forEach(t => topicMap.set(t, (topicMap.get(t) || 0) + 1));
    (q.companies || []).forEach(c => companyMap.set(c, (companyMap.get(c) || 0) + 1));
  });

  const sortedTopics = Array.from(topicMap.keys()).sort((a,b) => topicMap.get(b) - topicMap.get(a));
  const sortedCompanies = Array.from(companyMap.keys()).sort((a,b) => companyMap.get(b) - companyMap.get(a));

  const diffTotals = {
    EASY: DATA.filter(q => q.difficulty === 'EASY').length,
    MEDIUM: DATA.filter(q => q.difficulty === 'MEDIUM').length,
    HARD: DATA.filter(q => q.difficulty === 'HARD').length
  };

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }
  function diffRank(d){ return d === 'EASY' ? 0 : d === 'MEDIUM' ? 1 : 2; }

  // ---------------- Populate Dropdowns ----------------
  function initDropdowns(){
    const topicSelect = document.getElementById('topicFilter');
    if(topicSelect){
      topicSelect.innerHTML = `<option value="ALL">All Topics (${sortedTopics.length})</option>`;
      sortedTopics.forEach(t => {
        const count = topicMap.get(t);
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = `${t} (${count})`;
        topicSelect.appendChild(opt);
      });
    }

    const companySelect = document.getElementById('companyFilter');
    if(companySelect){
      companySelect.innerHTML = `<option value="ALL">All Companies (${sortedCompanies.length})</option>`;
      sortedCompanies.forEach(c => {
        const count = companyMap.get(c);
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = `${c} (${count})`;
        companySelect.appendChild(opt);
      });
    }
  }

  // ---------------- Database & Persistence ----------------
  function updateDbStatus(status, text){
    const pill = document.getElementById('dbPill');
    const label = document.getElementById('dbStatusText');
    if(!pill || !label) return;
    pill.className = `db-pill ${status}`;
    label.textContent = text;
  }

  async function loadSolved(){
    try{
      const res = await fetch('/api/solved');
      if(!res.ok) throw new Error('Server returned ' + res.status);
      const ids = await res.json();
      state.solved = new Set(ids);
      localStorage.setItem('leetcode_solved_cache', JSON.stringify(ids));
      updateDbStatus('connected', 'Postgres Connected');
    }catch(e){
      console.warn('Postgres offline, using local cache', e);
      try{
        const cached = localStorage.getItem('leetcode_solved_cache');
        if(cached){
          const ids = JSON.parse(cached);
          if(Array.isArray(ids)) state.solved = new Set(ids);
        }
      }catch(err){}
      updateDbStatus('error', 'Offline Cache');
      showToast('Running in local offline mode.', 'info');
    }
  }

  async function setSolved(id, solved, sourceEl){
    if(solved) state.solved.add(id); else state.solved.delete(id);
    if(solved && sourceEl) burstConfetti(sourceEl);

    try{
      localStorage.setItem('leetcode_solved_cache', JSON.stringify(Array.from(state.solved)));
    }catch(e){}

    try{
      const res = await fetch(`/api/solved/${id}`, { method: solved ? 'POST' : 'DELETE' });
      if(!res.ok) throw new Error('Server returned ' + res.status);
      updateDbStatus('connected', 'Postgres Connected');
    }catch(e){
      console.warn('Could not save to Postgres', e);
      updateDbStatus('error', 'Saved to Local Cache');
    }
  }

  async function resetAllSolved(){
    try{
      const res = await fetch('/api/reset', { method: 'POST' });
      if(!res.ok) throw new Error('Server returned ' + res.status);
    }catch(e){}
    state.solved = new Set();
    localStorage.removeItem('leetcode_solved_cache');
    showToast('Progress reset successfully.', 'info');
  }

  function exportProgress(){
    const payload = {
      exportedAt: new Date().toISOString(),
      solvedCount: state.solved.size,
      totalCount: TOTAL,
      solvedIds: Array.from(state.solved)
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leetcode-progress-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Progress exported.', 'success');
  }

  async function importProgress(file){
    const reader = new FileReader();
    reader.onload = async (e) => {
      try{
        const parsed = JSON.parse(e.target.result);
        const ids = Array.isArray(parsed) ? parsed : parsed.solvedIds;
        if(!Array.isArray(ids)) throw new Error('Invalid format');
        ids.forEach(id => { if(Number.isInteger(id)) state.solved.add(id); });
        localStorage.setItem('leetcode_solved_cache', JSON.stringify(Array.from(state.solved)));
        try{
          await fetch('/api/solved/bulk', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ ids: Array.from(state.solved) })
          });
        }catch(err){}
        render();
        showToast(`Imported ${ids.length} problem(s).`, 'success');
      }catch(err){
        showToast('Invalid JSON file format.', 'error');
      }
    };
    reader.readAsText(file);
  }

  // ---------------- Confetti & Toast ----------------
  function showToast(message, type='info'){
    const container = document.getElementById('toastContainer');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  function burstConfetti(originEl){
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = originEl.getBoundingClientRect();
    const colors = ['#3fb950', '#4493f8', '#d29922', '#a371f7', '#f85149'];
    for(let i=0; i<12; i++){
      const p = document.createElement('span');
      p.className = 'confetti-piece';
      p.style.left = (rect.left + rect.width/2) + 'px';
      p.style.top = (rect.top + rect.height/2) + 'px';
      p.style.background = colors[i % colors.length];
      const angle = Math.random() * Math.PI * 2;
      const dist = 28 + Math.random() * 40;
      p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 700);
    }
  }

  // ---------------- Filtering & Sorting ----------------
  function getFiltered(){
    let rows = DATA;

    // Status tab
    if(state.statusTab === 'UNSOLVED') rows = rows.filter(q => !state.solved.has(q.id));
    else if(state.statusTab === 'SOLVED') rows = rows.filter(q => state.solved.has(q.id));

    // Problem type / Topic
    if(state.topic !== 'ALL'){
      rows = rows.filter(q => (q.topics || []).includes(state.topic));
    }

    // Company
    if(state.company !== 'ALL'){
      rows = rows.filter(q => (q.companies || []).includes(state.company));
    }

    // Difficulty
    if(state.diff !== 'ALL'){
      rows = rows.filter(q => q.difficulty === state.diff);
    }

    // Search query
    if(state.query.trim()){
      const q = state.query.trim().toLowerCase();
      rows = rows.filter(r =>
        r.title.toLowerCase().includes(q) ||
        String(r.id) === q ||
        (r.topics || []).some(t => t.toLowerCase().includes(q)) ||
        (r.companies || []).some(c => c.toLowerCase().includes(q))
      );
    }

    return rows;
  }

  function sortRows(rows){
    rows = rows.slice();
    if(state.sort === 'freq'){
      rows.sort((a,b) => b.count - a.count || a.id - b.id);
    }else if(state.sort === 'id'){
      rows.sort((a,b) => a.id - b.id);
    }else if(state.sort === 'alpha'){
      rows.sort((a,b) => a.title.localeCompare(b.title));
    }else if(state.sort === 'diff'){
      rows.sort((a,b) => diffRank(a.difficulty) - diffRank(b.difficulty) || a.id - b.id);
    }
    return rows;
  }

  // ---------------- Render Progress & Stats ----------------
  function renderProgress(){
    const solvedCount = state.solved.size;
    const overallPct = Math.round((solvedCount / TOTAL) * 100) || 0;

    let easySolved = 0, medSolved = 0, hardSolved = 0;
    DATA.forEach(q => {
      if(state.solved.has(q.id)){
        if(q.difficulty === 'EASY') easySolved++;
        else if(q.difficulty === 'MEDIUM') medSolved++;
        else if(q.difficulty === 'HARD') hardSolved++;
      }
    });

    // Multi-segmented bar (percentages out of 374)
    const easyWidth = (easySolved / TOTAL) * 100;
    const medWidth = (medSolved / TOTAL) * 100;
    const hardWidth = (hardSolved / TOTAL) * 100;

    const segEasy = document.getElementById('segEasy');
    const segMed = document.getElementById('segMedium');
    const segHard = document.getElementById('segHard');
    if(segEasy) segEasy.style.width = easyWidth + '%';
    if(segMed) segMed.style.width = medWidth + '%';
    if(segHard) segHard.style.width = hardWidth + '%';

    // Text stats
    const totalSolvedEl = document.getElementById('statTotalSolved');
    const totalPctEl = document.getElementById('statTotalPct');
    if(totalSolvedEl) totalSolvedEl.textContent = solvedCount;
    if(totalPctEl) totalPctEl.textContent = overallPct + '%';

    const easyEl = document.getElementById('statEasySolved');
    if(easyEl) easyEl.textContent = easySolved;

    const medEl = document.getElementById('statMedSolved');
    if(medEl) medEl.textContent = medSolved;

    const hardEl = document.getElementById('statHardSolved');
    if(hardEl) hardEl.textContent = hardSolved;

    // Issue Tabs Counters
    const tabAllCount = document.getElementById('tabCountAll');
    const tabUnsolvedCount = document.getElementById('tabCountUnsolved');
    const tabSolvedCount = document.getElementById('tabCountSolved');
    if(tabAllCount) tabAllCount.textContent = TOTAL;
    if(tabUnsolvedCount) tabUnsolvedCount.textContent = TOTAL - solvedCount;
    if(tabSolvedCount) tabSolvedCount.textContent = solvedCount;
  }

  // ---------------- Render Active Filters Bar ----------------
  function renderActiveFilters(){
    const bar = document.getElementById('activeFiltersBar');
    const chipsContainer = document.getElementById('activeFilterChips');
    if(!bar || !chipsContainer) return;

    chipsContainer.innerHTML = '';
    const filters = [];

    if(state.topic !== 'ALL'){
      filters.push({
        label: `Topic: ${state.topic}`,
        onRemove: () => {
          state.topic = 'ALL';
          const sel = document.getElementById('topicFilter');
          if(sel) sel.value = 'ALL';
          state.page = 1;
          render();
        }
      });
    }

    if(state.company !== 'ALL'){
      filters.push({
        label: `Company: ${state.company}`,
        onRemove: () => {
          state.company = 'ALL';
          const sel = document.getElementById('companyFilter');
          if(sel) sel.value = 'ALL';
          state.page = 1;
          render();
        }
      });
    }

    if(state.diff !== 'ALL'){
      filters.push({
        label: `Difficulty: ${state.diff[0]}${state.diff.slice(1).toLowerCase()}`,
        onRemove: () => {
          state.diff = 'ALL';
          const sel = document.getElementById('diffFilter');
          if(sel) sel.value = 'ALL';
          state.page = 1;
          render();
        }
      });
    }

    if(state.query.trim()){
      filters.push({
        label: `Search: "${state.query.trim()}"`,
        onRemove: () => {
          state.query = '';
          const inp = document.getElementById('searchInput');
          if(inp) inp.value = '';
          state.page = 1;
          render();
        }
      });
    }

    if(filters.length === 0){
      bar.style.display = 'none';
    }else{
      bar.style.display = 'flex';
      filters.forEach(f => {
        const chip = document.createElement('span');
        chip.className = 'filter-chip';
        chip.innerHTML = `<span>${escapeHtml(f.label)}</span><button class="filter-chip-remove" aria-label="Remove">&times;</button>`;
        chip.querySelector('.filter-chip-remove').onclick = f.onRemove;
        chipsContainer.appendChild(chip);
      });
    }
  }

  function clearAllFilters(){
    state.topic = 'ALL';
    state.company = 'ALL';
    state.diff = 'ALL';
    state.query = '';
    state.page = 1;

    const t = document.getElementById('topicFilter'); if(t) t.value = 'ALL';
    const c = document.getElementById('companyFilter'); if(c) c.value = 'ALL';
    const d = document.getElementById('diffFilter'); if(d) d.value = 'ALL';
    const s = document.getElementById('searchInput'); if(s) s.value = '';

    render();
  }

  // ---------------- Build Problem Row ----------------
  function buildProblemRow(q){
    const row = document.createElement('div');
    const isSolved = state.solved.has(q.id);
    row.className = 'problem-row' + (isSolved ? ' solved' : '');
    row.dataset.id = q.id;
    row.tabIndex = -1;

    // Checkbox Cell
    const checkCell = document.createElement('div');
    checkCell.className = 'check-cell';
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'problem-check';
    check.checked = isSolved;
    check.setAttribute('aria-label', `Mark ${q.title} as solved`);
    check.onchange = async () => {
      row.classList.toggle('solved', check.checked);
      await setSolved(q.id, check.checked, check);
      renderProgress();
      if(state.statusTab !== 'ALL'){
        renderList();
      }
    };
    checkCell.appendChild(check);

    // Content Cell
    const contentCell = document.createElement('div');
    contentCell.className = 'content-cell';

    // Row Top: ID, Title, External link, Difficulty
    const rowTop = document.createElement('div');
    rowTop.className = 'row-top';

    const idSpan = document.createElement('span');
    idSpan.className = 'row-id';
    idSpan.textContent = `#${q.id}`;

    const titleLink = document.createElement('a');
    titleLink.className = 'row-title';
    titleLink.href = q.link;
    titleLink.target = '_blank';
    titleLink.rel = 'noopener noreferrer';
    titleLink.innerHTML = `${escapeHtml(q.title)} <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor"><path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 8.28 8.78a.75.75 0 0 1-1.06-1.06l4.75-4.75-1.543-1.543a.25.25 0 0 1 .177-.427Z"/></svg>`;

    const diffBadge = document.createElement('span');
    diffBadge.className = `diff-pill ${q.difficulty}`;
    diffBadge.textContent = q.difficulty[0] + q.difficulty.slice(1).toLowerCase();

    rowTop.appendChild(idSpan);
    rowTop.appendChild(titleLink);
    rowTop.appendChild(diffBadge);
    contentCell.appendChild(rowTop);

    // Row Bottom: Clickable Topic Tags
    const rowBottom = document.createElement('div');
    rowBottom.className = 'row-bottom';
    (q.topics || []).forEach(t => {
      const tag = document.createElement('span');
      tag.className = 'topic-tag' + (state.topic === t ? ' active' : '');
      tag.textContent = t;
      tag.title = `Filter by topic: ${t}`;
      tag.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.topic = state.topic === t ? 'ALL' : t;
        const sel = document.getElementById('topicFilter');
        if(sel) sel.value = state.topic;
        state.page = 1;
        render();
      };
      rowBottom.appendChild(tag);
    });
    contentCell.appendChild(rowBottom);

    // Companies Cell (Right side)
    const companiesCell = document.createElement('div');
    companiesCell.className = 'companies-cell';

    const pillsWrap = document.createElement('div');
    pillsWrap.className = 'companies-pills';

    q.companies.forEach(c => {
      const pill = document.createElement('span');
      pill.className = 'company-pill' + (state.company === c ? ' active' : '');
      pill.title = `Filter by company: ${c}`;
      pill.innerHTML = `<span class="dot" style="background:${getCompanyColor(c)}"></span><span>${escapeHtml(c)}</span>`;
      pill.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.company = state.company === c ? 'ALL' : c;
        const sel = document.getElementById('companyFilter');
        if(sel) sel.value = state.company;
        state.page = 1;
        render();
      };
      pillsWrap.appendChild(pill);
    });

    companiesCell.appendChild(pillsWrap);

    row.appendChild(checkCell);
    row.appendChild(contentCell);
    row.appendChild(companiesCell);
    return row;
  }

  // ---------------- Render Problem List & Pagination ----------------
  function renderList(){
    const container = document.getElementById('problemList');
    if(!container) return;

    const filtered = sortRows(getFiltered());
    const totalFiltered = filtered.length;

    // Pagination calculations
    const limit = state.perPage === 'ALL' ? totalFiltered : Number(state.perPage);
    const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
    if(state.page > totalPages) state.page = totalPages;

    const startIndex = (state.page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalFiltered);
    const pagedRows = filtered.slice(startIndex, endIndex);

    // Pagination info text
    const infoEl = document.getElementById('paginationInfo');
    if(infoEl){
      if(totalFiltered === 0){
        infoEl.textContent = '0 problems';
      }else{
        infoEl.textContent = `Showing ${startIndex + 1}–${endIndex} of ${totalFiltered}`;
      }
    }

    container.innerHTML = '';
    if(totalFiltered === 0){
      container.innerHTML = `
        <div class="empty-state">
          <h3>No matching problems found</h3>
          <p>Try clearing your search or topic/company filters.</p>
        </div>`;
    }else{
      const frag = document.createDocumentFragment();
      pagedRows.forEach(q => frag.appendChild(buildProblemRow(q)));
      container.appendChild(frag);
    }

    renderPagination(totalPages);
    focusedIndex = -1;
  }

  function renderPagination(totalPages){
    const nav = document.getElementById('paginationNav');
    const footer = document.getElementById('paginationFooter');
    if(!nav || !footer) return;

    if(totalPages <= 1 || state.perPage === 'ALL'){
      footer.style.display = 'none';
      return;
    }

    footer.style.display = 'flex';
    nav.innerHTML = '';

    // Previous Button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = state.page <= 1;
    prevBtn.onclick = () => {
      if(state.page > 1){
        state.page--;
        renderList();
        scrollToTableTop();
      }
    };
    nav.appendChild(prevBtn);

    // Page numbers
    for(let p = 1; p <= totalPages; p++){
      if(totalPages > 8 && Math.abs(p - state.page) > 2 && p !== 1 && p !== totalPages){
        if(p === 2 || p === totalPages - 1){
          const dots = document.createElement('span');
          dots.className = 'page-btn';
          dots.style.pointerEvents = 'none';
          dots.textContent = '…';
          nav.appendChild(dots);
        }
        continue;
      }

      const pBtn = document.createElement('button');
      pBtn.className = 'page-btn' + (state.page === p ? ' active' : '');
      pBtn.textContent = p;
      pBtn.onclick = () => {
        state.page = p;
        renderList();
        scrollToTableTop();
      };
      nav.appendChild(pBtn);
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.textContent = 'Next';
    nextBtn.disabled = state.page >= totalPages;
    nextBtn.onclick = () => {
      if(state.page < totalPages){
        state.page++;
        renderList();
        scrollToTableTop();
      }
    };
    nav.appendChild(nextBtn);
  }

  function scrollToTableTop(){
    const box = document.querySelector('.gh-box');
    if(box){
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function render(){
    renderProgress();
    renderActiveFilters();
    renderList();
  }

  // ---------------- Keyboard Shortcuts ----------------
  function visibleRows(){
    return Array.from(document.querySelectorAll('#problemList .problem-row'));
  }

  function setFocus(idx){
    const rows = visibleRows();
    if(rows.length === 0) return;
    rows.forEach(r => r.classList.remove('kb-focus'));
    focusedIndex = Math.max(0, Math.min(idx, rows.length - 1));
    const row = rows[focusedIndex];
    row.classList.add('kb-focus');
    row.scrollIntoView({block:'nearest', behavior:'smooth'});
  }

  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName;
    if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'){
      if(e.key === 'Escape') document.activeElement.blur();
      return;
    }
    if(e.key === '/'){
      e.preventDefault();
      const s = document.getElementById('searchInput');
      if(s) s.focus();
      return;
    }
    if(e.key === 'j'){
      e.preventDefault();
      setFocus(focusedIndex + 1);
    }else if(e.key === 'k'){
      e.preventDefault();
      setFocus(focusedIndex - 1);
    }else if(e.key === 'x' || e.key === 'Enter'){
      const rows = visibleRows();
      if(focusedIndex >= 0 && rows[focusedIndex]){
        e.preventDefault();
        const check = rows[focusedIndex].querySelector('.problem-check');
        if(check){
          check.checked = !check.checked;
          check.dispatchEvent(new Event('change'));
        }
      }
    }
  });

  // ---------------- Wire Up Controls ----------------
  function wireControls(){
    // Status Tabs (All / Unsolved / Solved)
    const tabBtns = document.querySelectorAll('.box-header-tabs .tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.statusTab = btn.dataset.status;
        state.page = 1;
        render();
      });
    });

    // Search
    const searchInput = document.getElementById('searchInput');
    if(searchInput){
      searchInput.addEventListener('input', e => {
        state.query = e.target.value;
        state.page = 1;
        render();
      });
    }

    // Topic Filter Select
    const topicFilter = document.getElementById('topicFilter');
    if(topicFilter){
      topicFilter.addEventListener('change', e => {
        state.topic = e.target.value;
        state.page = 1;
        render();
      });
    }

    // Company Filter Select
    const companyFilter = document.getElementById('companyFilter');
    if(companyFilter){
      companyFilter.addEventListener('change', e => {
        state.company = e.target.value;
        state.page = 1;
        render();
      });
    }

    // Difficulty Filter Select
    const diffFilter = document.getElementById('diffFilter');
    if(diffFilter){
      diffFilter.addEventListener('change', e => {
        state.diff = e.target.value;
        state.page = 1;
        render();
      });
    }

    // Sort Filter Select
    const sortFilter = document.getElementById('sortFilter');
    if(sortFilter){
      sortFilter.addEventListener('change', e => {
        state.sort = e.target.value;
        renderList();
      });
    }

    // Per Page Select
    const perPageSelect = document.getElementById('perPageSelect');
    if(perPageSelect){
      perPageSelect.addEventListener('change', e => {
        state.perPage = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
        state.page = 1;
        renderList();
      });
    }

    // Clear all filters button
    const clearAllBtn = document.getElementById('clearAllBtn');
    if(clearAllBtn) clearAllBtn.addEventListener('click', clearAllFilters);

    // Export / Import
    const exportBtn = document.getElementById('exportBtn');
    if(exportBtn) exportBtn.addEventListener('click', exportProgress);

    const importInput = document.getElementById('importInput');
    if(importInput){
      importInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if(file) importProgress(file);
        e.target.value = '';
      });
    }

    // Reset
    const resetBtn = document.getElementById('resetBtn');
    if(resetBtn){
      resetBtn.addEventListener('click', async () => {
        if(confirm('Are you sure you want to reset all progress? This cannot be undone.')){
          await resetAllSolved();
          render();
        }
      });
    }
  }

  // ---------------- Init ----------------
  (async function init(){
    initDropdowns();
    wireControls();
    await loadSolved();
    render();
  })();
})();
