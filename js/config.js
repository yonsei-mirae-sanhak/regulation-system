// ══════════════════════════════════════════
// Supabase 설정
// 아래 값을 본인의 Supabase 프로젝트 URL과 anon 키로 교체하세요.
// 실제 키를 이 파일에 직접 커밋하지 마세요.
// ══════════════════════════════════════════
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
// ══════════════════════════════════════════

let _sb = null;

function getSupabase() {
  if (_sb) return _sb;
  if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') return null;
  if (!SUPABASE_KEY || SUPABASE_KEY === 'YOUR_SUPABASE_ANON_KEY') return null;
  _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return _sb;
}