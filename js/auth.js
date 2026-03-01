// ── Auth 상태 ──
const Auth = {
  _isAdmin: false,
  _email: '',

  get isAdmin() { return this._isAdmin; },

  // 세션 복원 (페이지 로드 시 호출)
  async restore() {
    const sb = getSupabase();
    if (!sb) return;
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) { console.error('Session restore error:', error); return; }
      const session = data && data.session;
      if (session && session.user && session.user.id && session.user.email) {
        this._isAdmin = true;
        this._email = session.user.email;
      }
    } catch (e) {
      console.error('Session restore exception:', e);
    }
  },

  // 로그인
  async signIn(email, password) {
    const sb = getSupabase();
    if (!sb) return { ok: false, error: 'Supabase가 연결되지 않았습니다.' };
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };
      if (!data || !data.session) return { ok: false, error: '세션을 생성할 수 없습니다.' };
      this._isAdmin = true;
      this._email = data.session.user.email;
      return { ok: true };
    } catch (e) {
      console.error('SignIn exception:', e);
      return { ok: false, error: '로그인 중 오류가 발생했습니다.' };
    }
  },

  // 로그아웃
  async signOut() {
    const sb = getSupabase();
    try {
      if (sb) await sb.auth.signOut();
    } catch (e) {
      console.error('SignOut exception:', e);
    }
    this._isAdmin = false;
    this._email = '';
  }
};
