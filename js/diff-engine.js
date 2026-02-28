// ── Diff 엔진 ──

function splitIntoArticles(text) {
  const articleRegex = /(제\d+조[^\n]*(?:\n(?!제\d+조)[^\n]*)*)/g;
  const matches = text.match(articleRegex);
  if (matches && matches.length > 1) return matches.map(s => s.trim()).filter(Boolean);
  return text.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
}

function buildLCS(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
  const lcs = []; let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i-1] === b[j-1]) { lcs.unshift(a[i-1]); i--; j--; }
    else if (dp[i-1][j] > dp[i][j-1]) i--;
    else j--;
  }
  return lcs;
}

function computeDiff(oldText, newText) {
  const oldParts = splitIntoArticles(oldText);
  const newParts = splitIntoArticles(newText);
  const lcs = buildLCS(oldParts, newParts);
  const rows = [];
  let oi = 0, ni = 0, li = 0;
  while (oi < oldParts.length || ni < newParts.length) {
    if (oi < oldParts.length && ni < newParts.length && li < lcs.length
        && oldParts[oi] === lcs[li] && newParts[ni] === lcs[li]) {
      rows.push({ type: 'same', old: oldParts[oi], new: newParts[ni] });
      oi++; ni++; li++;
    } else if (oi < oldParts.length && ni < newParts.length
        && !lcs.slice(li).includes(oldParts[oi]) && !lcs.slice(li).includes(newParts[ni])) {
      rows.push({ type: 'changed', old: oldParts[oi], new: newParts[ni] });
      oi++; ni++;
    } else if (oi < oldParts.length && (li >= lcs.length || oldParts[oi] !== lcs[li])) {
      rows.push({ type: 'deleted', old: oldParts[oi], new: '' });
      oi++;
    } else if (ni < newParts.length) {
      rows.push({ type: 'added', old: '', new: newParts[ni] });
      ni++;
    } else break;
  }
  return rows;
}

function inlineDiff(oldStr, newStr) {
  const ow = oldStr.split(/(\s+)/);
  const nw = newStr.split(/(\s+)/);
  const lcs = buildLCS(ow, nw);
  let oldOut = '', newOut = '', oi = 0, ni = 0, li = 0;
  while (oi < ow.length || ni < nw.length) {
    if (oi < ow.length && ni < nw.length && li < lcs.length && ow[oi] === lcs[li] && nw[ni] === lcs[li]) {
      oldOut += escHtml(ow[oi]); newOut += escHtml(nw[ni]); oi++; ni++; li++;
    } else if (oi < ow.length && (li >= lcs.length || ow[oi] !== lcs[li])) {
      oldOut += `<span class="del">${escHtml(ow[oi])}</span>`; oi++;
    } else if (ni < nw.length) {
      newOut += `<span class="ins">${escHtml(nw[ni])}</span>`; ni++;
    } else break;
  }
  return { oldOut, newOut };
}

function renderDiffRows(rows) {
  return rows.map(row => {
    if (row.type === 'same') {
      return `<div class="diff-row">
        <div class="diff-cell old-side row-same">${escHtml(row.old)}</div>
        <div class="diff-cell row-same">${escHtml(row.new)}</div>
      </div>`;
    } else if (row.type === 'changed') {
      const { oldOut, newOut } = inlineDiff(row.old, row.new);
      return `<div class="diff-row">
        <div class="diff-cell old-side row-del">${oldOut}</div>
        <div class="diff-cell row-add">${newOut}</div>
      </div>`;
    } else if (row.type === 'deleted') {
      return `<div class="diff-row">
        <div class="diff-cell old-side row-del">${escHtml(row.old)}</div>
        <div class="diff-cell row-empty">&lt;삭제&gt;</div>
      </div>`;
    } else {
      return `<div class="diff-row">
        <div class="diff-cell old-side row-empty">&lt;신설&gt;</div>
        <div class="diff-cell row-add">${escHtml(row.new)}</div>
      </div>`;
    }
  }).join('');
}

// ── 조항연혁 헬퍼 ──
function extractArticleKey(articleText) {
  const m = articleText.match(/^제(\d+)조/);
  if (m) return `제${m[1]}조`;
  return articleText.split('\n')[0].trim().slice(0, 20);
}

function collectAllArticles(bodies) {
  const keys = [], seen = new Set();
  bodies.forEach(body => {
    splitIntoArticles(body).forEach(a => {
      const k = extractArticleKey(a);
      if (k && !seen.has(k)) { keys.push(k); seen.add(k); }
    });
  });
  return keys;
}
