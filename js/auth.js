// ── Auth 상태 ──
const Auth = {
  _isAdmin: false,
  _email: '',

  get isAdmin() { return this._isAdmin; },

  // 세션 복원 (페이지 로드 시 호출)
  async restore() {
    const sb = getSupabase();
    if (!sb) return;
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      this._isAdmin = true;
      this._email = session.user.email;
    }
  },

  // 로그인
  async signIn(email, password) {
    const sb = getSupabase();
    if (!sb) return { error: 'Supabase가 연결되지 않았습니다.' };
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    this._isAdmin = true;
    this._email = email;
    return { ok: true };
  },

  // 로그아웃
  async signOut() {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    this._isAdmin = false;
    this._email = '';
  }
};
