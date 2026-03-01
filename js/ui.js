// ── 경로 prefix (GitHub Pages 서브폴더 대응) ──
const ROOT = (() => {
  const p = location.pathname;
  const m = p.match(/^(\/[^/]+\/)/);
  return m ? m[1] : '/';
})();

function url(path) { return ROOT + path; }

// ── 헤더 렌더 ──
function renderHeader(activeNav) {
  const el = document.getElementById('header');
  if (!el) return;
  el.innerHTML = `
    <button class="hamburger" id="hamburgerBtn" onclick="toggleSidebar()" aria-label="메뉴">
      <span></span><span></span><span></span>
    </button>
    <a class="header-logo" href="${url('index.html')}">
      <div class="logo-icon">📋</div>
      <div>
        <div class="logo-text">규정관리시스템</div>
        <div class="logo-sub">Regulation Management System</div>
      </div>
    </a>
    <nav class="header-nav">
      <a href="${url('index.html')}" ${activeNav==='home'?'class="active"':''}>홈</a>
      <a href="${url('list.html')}" ${activeNav==='list'?'class="active"':''}>규정정보</a>
      <a href="${url('list.html?recent=1')}" ${activeNav==='recent'?'class="active"':''}>최신 제·개정</a>
    </nav>
    <div class="header-right" id="headerRight"></div>`;

  // 사이드바 오버레이 생성
  if (!document.getElementById('sidebarOverlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebarOverlay';
    overlay.onclick = closeSidebar;
    document.body.appendChild(overlay);
  }
  updateAdminUI();
}

// ── 관리자 UI 갱신 ──
function updateAdminUI() {
  const el = document.getElementById('headerRight');
  if (!el) return;
  if (Auth.isAdmin) {
    el.innerHTML = `
      <div class="admin-bar">
        <div class="admin-badge"><span class="dot"></span>관리자 모드</div>
        <a class="btn-admin-reg" href="${url('edit.html')}">＋ 규정 등록</a>
        <button class="btn-logout" onclick="handleLogout()">로그아웃</button>
      </div>`;
  } else {
    el.innerHTML = `<a class="btn-login" href="${url('admin/index.html')}">🔒 관리자 로그인</a>`;
  }
}

async function handleLogout() {
  await Auth.signOut();
  updateAdminUI();
  showToast('🔒 로그아웃되었습니다');
  setTimeout(() => location.href = url('index.html'), 800);
}

// ── 사이드바 렌더 ──
let _treeOpen = new Set(['학사', '인사', '재무', 'IT보안']);
let _allRegs = [];

async function renderSidebar(activeGroup, activeCat) {
  const el = document.getElementById('sidebar');
  if (!el) return;

  el.innerHTML = `
    <div class="sb-search-box">
      <div class="sb-search-wrap">
        <span class="sb-search-icon">🔍</span>
        <input type="text" id="sbSearch" placeholder="규정명 검색..." oninput="onSbSearch(this.value)">
      </div>
    </div>
    <div class="tree-section" id="treeSection"></div>`;

  if (!_allRegs.length) _allRegs = LocalCache.load();
  buildTree(activeGroup, activeCat);
}

function buildTree(activeGroup, activeCat) {
  const sec = document.getElementById('treeSection');
  if (!sec) return;
  sec.innerHTML = '';

  const allEl = document.createElement('a');
  allEl.className = 'tree-item' + (!activeGroup ? ' active' : '');
  allEl.href = url('list.html');
  allEl.innerHTML = `<span class="tree-icon">📂</span>전체 규정<span class="tree-cnt">${_allRegs.length}</span>`;
  sec.appendChild(allEl);

  GROUPS.forEach(g => {
    const items = _allRegs.filter(r => r.group === g);
    if (!items.length) return;
    const isOpen = _treeOpen.has(g);

    const hd = document.createElement('div');
    hd.className = 'tree-group-hd' + (isOpen ? ' open' : '');
    hd.innerHTML = `<span class="tree-arrow">▶</span>${escHtml(g)}<span class="tree-cnt" style="margin-left:auto">${items.length}</span>`;
    hd.onclick = () => {
      isOpen ? _treeOpen.delete(g) : _treeOpen.add(g);
      buildTree(activeGroup, activeCat);
    };
    sec.appendChild(hd);

    const ch = document.createElement('div');
    ch.className = 'tree-children' + (isOpen ? ' open' : '');

    const gAll = document.createElement('a');
    gAll.className = 'tree-item' + (activeGroup === g && !activeCat ? ' active' : '');
    gAll.href = url(`list.html?group=${encodeURIComponent(g)}`);
    gAll.innerHTML = `<span class="tree-icon">📁</span>전체<span class="tree-cnt">${items.length}</span>`;
    ch.appendChild(gAll);

    const cats = [...new Set(items.map(r => r.category).filter(Boolean))];
    cats.forEach(cat => {
      const cnt = items.filter(r => r.category === cat).length;
      const ci = document.createElement('a');
      ci.className = 'tree-item' + (activeGroup === g && activeCat === cat ? ' active' : '');
      ci.style.paddingLeft = '36px';
      ci.href = url(`list.html?group=${encodeURIComponent(g)}&cat=${encodeURIComponent(cat)}`);
      ci.innerHTML = `<span class="tree-icon" style="opacity:.4">└</span>${escHtml(cat)}<span class="tree-cnt">${cnt}</span>`;
      ch.appendChild(ci);
    });

    sec.appendChild(ch);
  });
}

function onSbSearch(q) {
  if (!q.trim()) { buildTree(); return; }
  const results = _allRegs.filter(r => r.title.includes(q));
  location.href = url(`list.html?q=${encodeURIComponent(q)}`);
}

// ── 헬퍼 ──
function sBadge(s) {
  const m = { active: ['시행중', 'sbadge-active'], draft: ['초안', 'sbadge-draft'], obsolete: ['폐기', 'sbadge-obsolete'] };
  const [l, c] = m[s] || ['—', ''];
  return `<span class="sbadge ${c}">${l}</span>`;
}

function rtypeBadge(reg) {
  const isNew = reg.history.length === 1;
  const tc = isNew ? 'rtype-new' : reg.status === 'obsolete' ? 'rtype-obs' : 'rtype-rev';
  const tl = isNew ? '제정' : reg.status === 'obsolete' ? '폐기' : '개정';
  return `<span class="rtype ${tc}">${tl}</span>`;
}

function escHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── 토스트 ──
let _toastTimer;
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── URL 파라미터 ──
function getParam(key) {
  return new URLSearchParams(location.search).get(key);
}

// ── 공통 초기화 ──
async function commonInit(activeNav, activeGroup, activeCat) {
  await Auth.restore();
  renderHeader(activeNav);
  // 데이터 미리 로드 (캐시 없으면 DB에서)
  const cached = LocalCache.load();
  if (cached.length) {
    _allRegs = cached;
  } else {
    _allRegs = await DB.fetchAll();
    if (!_allRegs.length) {
      await DB.initWithSample();
      _allRegs = LocalCache.load();
    }
  }
  await renderSidebar(activeGroup, activeCat);
}

// ── 사이드바 토글 (모바일) ──
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const btn = document.getElementById('hamburgerBtn');
  const overlay = document.getElementById('sidebarOverlay');
  const isOpen = sb && sb.classList.contains('open');
  if (isOpen) { closeSidebar(); } else {
    sb && sb.classList.add('open');
    btn && btn.classList.add('open');
    overlay && overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function closeSidebar() {
  const sb = document.getElementById('sidebar');
  const btn = document.getElementById('hamburgerBtn');
  const overlay = document.getElementById('sidebarOverlay');
  sb && sb.classList.remove('open');
  btn && btn.classList.remove('open');
  overlay && overlay.classList.remove('show');
  document.body.style.overflow = '';
}
