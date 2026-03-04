// ═══════════════════════════════════════════
//  1. 경로 / 유틸리티
// ═══════════════════════════════════════════

const ROOT = (() => {
  const p = location.pathname;
  const m = p.match(/^(\/[^/]+\/)/);
  return m ? m[1] : '/';
})();

function url(path) { return ROOT + path; }

function escHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getParam(key) {
  return new URLSearchParams(location.search).get(key);
}

// ═══════════════════════════════════════════
//  2. 토스트
// ═══════════════════════════════════════════

let _toastTimer;
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ═══════════════════════════════════════════
//  3. 배지 헬퍼
// ═══════════════════════════════════════════

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

// ═══════════════════════════════════════════
//  4. 로그인 시도 제한
// ═══════════════════════════════════════════

const LoginGuard = {
  MAX: 5,
  LOCK_MIN: 15,
  _key: 'login_attempts',
  _get() {
    try {
      var d = JSON.parse(sessionStorage.getItem(this._key) || '{}');
      if (d.lockUntil && Date.now() > d.lockUntil) return { count: 0 };
      return d;
    } catch { return { count: 0 }; }
  },
  isLocked() {
    var d = this._get();
    return d.lockUntil && Date.now() < d.lockUntil;
  },
  remaining() {
    var d = this._get();
    if (this.isLocked()) return 0;
    return this.MAX - (d.count || 0);
  },
  fail() {
    var d = this._get();
    d.count = (d.count || 0) + 1;
    if (d.count >= this.MAX) d.lockUntil = Date.now() + this.LOCK_MIN * 60000;
    sessionStorage.setItem(this._key, JSON.stringify(d));
  },
  reset() { sessionStorage.removeItem(this._key); }
};

// ═══════════════════════════════════════════
//  5. 헤더
// ═══════════════════════════════════════════

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

  if (!document.getElementById('sidebarOverlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebarOverlay';
    overlay.onclick = closeSidebar;
    document.body.appendChild(overlay);
  }
  updateAdminUI();
}

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

// ═══════════════════════════════════════════
//  6. 사이드바
// ═══════════════════════════════════════════

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

  // 접기 버튼 별도 추가 (innerHTML 이후에 appendChild)
  if (!document.getElementById('sbCollapseBtn')) {
    var btn = document.createElement('button');
    btn.className = 'sb-collapse-btn';
    btn.id = 'sbCollapseBtn';
    btn.title = '사이드바 접기';
    btn.textContent = '\u25C0';
    btn.onclick = toggleSidebarCollapse;
    el.appendChild(btn);
  }

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
    hd.innerHTML = `<span class="tree-arrow">▶</span>${g}<span class="tree-cnt" style="margin-left:auto">${items.length}</span>`;
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
      ci.innerHTML = `<span class="tree-icon" style="opacity:.4">└</span>${cat}<span class="tree-cnt">${cnt}</span>`;
      ch.appendChild(ci);
    });

    sec.appendChild(ch);
  });
}

function onSbSearch(q) {
  if (!q.trim()) { buildTree(); return; }
  location.href = url(`list.html?q=${encodeURIComponent(q)}`);
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

// ── 사이드바 접기/펼치기 (PC) ──
function toggleSidebarCollapse() {
  var sb = document.getElementById('sidebar');
  var main = document.getElementById('main');
  var btn = document.getElementById('sbCollapseBtn');
  var footer = document.getElementById('appFooter');
  if (!sb) return;
  var collapsed = sb.classList.toggle('collapsed');
  if (main) main.classList.toggle('sidebar-collapsed', collapsed);
  if (footer) footer.style.marginLeft = collapsed ? '0' : '';
  if (btn) btn.textContent = collapsed ? '\u25B6' : '\u25C0';
}

// ═══════════════════════════════════════════
//  7. 자동완성 검색
// ═══════════════════════════════════════════

function attachAutocomplete(inputId, opts) {
  opts = opts || {};
  var input = document.getElementById(inputId);
  if (!input) return;
  var minLen   = opts.minLen   || 2;
  var maxItems = opts.maxItems || 8;
  var onSelect = opts.onSelect || function(reg) {
    location.href = url('detail.html?id=' + reg.id);
  };

  var wrap = input.parentElement;
  wrap.style.position = 'relative';

  var dd = document.createElement('div');
  dd.className = 'ac-dropdown';
  dd.id = inputId + '_ac';
  wrap.appendChild(dd);

  var activeIdx = -1, filtered = [];

  function render(items) {
    filtered = items; activeIdx = -1;
    if (!items.length) { dd.classList.remove('open'); return; }
    dd.innerHTML = items.map(function(r, i) {
      var last = r.history && r.history.length ? r.history[r.history.length-1] : null;
      var ds = last ? last.date : '';
      return '<div class="ac-item" data-idx="'+i+'">'
        + '<span class="ac-title">' + hlMatch(r.title, input.value) + '</span>'
        + '<span class="ac-meta">' + (r.group||'') + (ds?' \u00B7 '+ds:'') + '</span></div>';
    }).join('');
    dd.classList.add('open');
  }

  function hlMatch(t, q) {
    if (!q) return escHtml(t);
    var esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escHtml(t).replace(new RegExp('('+esc+')','gi'), '<mark class="ac-mark">$1</mark>');
  }

  function close() { dd.classList.remove('open'); activeIdx = -1; }

  input.addEventListener('input', function() {
    var q = input.value.trim();
    if (q.length < minLen) { close(); return; }
    render(_allRegs.filter(function(r) {
      return r.title.toLowerCase().includes(q.toLowerCase());
    }).slice(0, maxItems));
  });

  input.addEventListener('keydown', function(e) {
    if (!dd.classList.contains('open')) return;
    var items = dd.querySelectorAll('.ac-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx+1, items.length-1);
      items.forEach(function(el,i){ el.classList.toggle('ac-active', i===activeIdx); });
      if (items[activeIdx]) items[activeIdx].scrollIntoView({block:'nearest'});
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx-1, 0);
      items.forEach(function(el,i){ el.classList.toggle('ac-active', i===activeIdx); });
      if (items[activeIdx]) items[activeIdx].scrollIntoView({block:'nearest'});
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault(); onSelect(filtered[activeIdx]); close();
    } else if (e.key === 'Escape') { close(); }
  });

  dd.addEventListener('mousedown', function(e) {
    var item = e.target.closest('.ac-item');
    if (!item) return;
    e.preventDefault();
    onSelect(filtered[parseInt(item.dataset.idx)]); close();
  });

  input.addEventListener('blur', function() { setTimeout(close, 200); });
}

function initSidebarAutocomplete() {
  var sb = document.getElementById('sbSearch');
  if (!sb) return;
  sb.removeAttribute('oninput');
  sb.placeholder = '규정명 검색... (2글자 이상)';
  attachAutocomplete('sbSearch', { minLen:2, maxItems:6,
    onSelect: function(r){ location.href = url('detail.html?id='+r.id); }
  });
  sb.addEventListener('keydown', function(e) {
    var ac = document.getElementById('sbSearch_ac');
    if (e.key==='Enter' && !(ac && ac.querySelector('.ac-active'))) {
      var q = sb.value.trim();
      if (q) location.href = url('list.html?q='+encodeURIComponent(q));
    }
  });
}

function initHomeAutocomplete() {
  if (!document.getElementById('hsInput')) return;
  attachAutocomplete('hsInput', { minLen:2, maxItems:8,
    onSelect: function(r){ location.href = url('detail.html?id='+r.id); }
  });
}

// ═══════════════════════════════════════════
//  8. 인쇄 기능
// ═══════════════════════════════════════════

function printRegulation() {
  var ph = document.querySelector('.print-header');
  if (!ph) {
    ph = document.createElement('div');
    ph.className = 'print-header';
    var c = document.getElementById('content');
    if (c) c.insertBefore(ph, c.firstChild);
  }
  var t = document.querySelector('.detail-ttl');
  var title = t ? t.textContent : '규정';
  var d = new Date();
  var ds = d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0');
  ph.innerHTML = '<h1>규정관리시스템</h1><p>출력일: '+ds+' | '+escHtml(title)+'</p>';
  setTimeout(function(){ window.print(); }, 100);
}

function printList() {
  var ph = document.querySelector('.print-header');
  if (!ph) {
    ph = document.createElement('div');
    ph.className = 'print-header';
    var c = document.getElementById('content');
    if (c) c.insertBefore(ph, c.firstChild);
  }
  var d = new Date();
  var ds = d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0');
  var vt = document.querySelector('.view-ttl');
  var title = vt ? vt.textContent.trim() : '규정 목록';
  ph.innerHTML = '<h1>규정관리시스템 \u2014 '+escHtml(title)+'</h1><p>출력일: '+ds+'</p>';
  setTimeout(function(){ window.print(); }, 100);
}

// ═══════════════════════════════════════════
//  9. 푸터
// ═══════════════════════════════════════════

function renderFooter() {
  if (document.getElementById('appFooter')) return;
  var footer = document.createElement('footer');
  footer.id = 'appFooter';
  footer.innerHTML = '<div class="footer-inner">'
    + '<p class="footer-addr">(26493) 강원도 원주시 연세대길 1 연세대학교 미래캠퍼스 미래산학협력단(산학관 505호)</p>'
    + '<p class="footer-copy">COPYRIGHT\u00A9 YONSEI UNIVERSITY MIRAE CAMPUS ALL RIGHTS RESERVED.</p>'
    + '</div>';
  document.body.appendChild(footer);
}

// ═══════════════════════════════════════════
//  10. 공통 초기화
// ═══════════════════════════════════════════

async function commonInit(activeNav, activeGroup, activeCat) {
  await Auth.restore();
  renderHeader(activeNav);
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
  renderFooter();
  initSidebarAutocomplete();
}
