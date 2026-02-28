// ══════════════════════════════════════════
// Supabase 설정 - 여기에 키를 입력하세요
// ══════════════════════════════════════════
const SUPABASE_URL = 'https://wcjymtpobpveaawnalqw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjanltdHBvYnB2ZWFhd25hbHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTI5NjMsImV4cCI6MjA4Nzc2ODk2M30._FGF2omzLKX33bdBE_LQGrme_4R_WOJ6WebU2E3JXOU';
// ══════════════════════════════════════════

let _sb = null;

function getSupabase() {
  if (_sb) return _sb;
  if (SUPABASE_URL === 'wcjymtpobpveaawnalqw') return null;
  _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return _sb;
}

const GROUPS = ['학사', '인사', '재무', 'IT보안', '준법', '운영', '기타'];
