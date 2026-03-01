// ── Supabase 설정 ──
// Supabase를 사용하려면 아래 값을 실제 프로젝트의 URL과 anon key로 교체하세요.
const SUPABASE_URL = null;
const SUPABASE_KEY = null;

let _sbClient = null;

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  if (!_sbClient) {
    if (typeof supabase === 'undefined') {
      console.warn('Supabase library is not loaded.');
      return null;
    }
    _sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _sbClient;
}

// ── 그룹(분류) 목록 ──
const GROUPS = ['학사', '인사', '재무', 'IT보안'];