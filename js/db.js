// ── 로컬스토리지 캐시 ──
const LocalCache = {
  KEY: 'regbook_v4',
  load() { try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); } catch { return []; } },
  save(data) { localStorage.setItem(this.KEY, JSON.stringify(data)); },
  clear() { localStorage.removeItem(this.KEY); }
};

// ── DB (Supabase + localStorage 폴백) ──
const DB = {
  // 전체 불러오기
  async fetchAll() {
    const sb = getSupabase();
    if (!sb) return LocalCache.load();

    const { data, error } = await sb
      .from('regulations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) { console.error('fetchAll error:', error); return LocalCache.load(); }

    const mapped = data.map(r => ({
      id: r.id, title: r.title, group: r.group_name,
      category: r.category, status: r.status, version: r.version,
      date: r.date, dept: r.dept, body: r.body,
      history: r.history || []
    }));

    LocalCache.save(mapped);
    return mapped;
  },

  // 단건 불러오기
  async fetchOne(id) {
    const sb = getSupabase();
    if (!sb) {
      const all = LocalCache.load();
      return all.find(r => r.id === id) || null;
    }
    const { data, error } = await sb.from('regulations').select('*').eq('id', id).single();
    if (error) { console.error('fetchOne error:', error); return null; }
    return {
      id: data.id, title: data.title, group: data.group_name,
      category: data.category, status: data.status, version: data.version,
      date: data.date, dept: data.dept, body: data.body,
      history: data.history || []
    };
  },

  // 저장 (생성/수정)
  async upsert(reg) {
    const sb = getSupabase();
    if (!sb) {
      let all = LocalCache.load();
      const idx = all.findIndex(r => r.id === reg.id);
      if (idx >= 0) all[idx] = reg; else all.unshift(reg);
      LocalCache.save(all);
      return true;
    }
    const { error } = await sb.from('regulations').upsert({
      id: reg.id, title: reg.title, group_name: reg.group,
      category: reg.category, status: reg.status, version: reg.version,
      date: reg.date, dept: reg.dept, body: reg.body,
      history: reg.history, updated_at: new Date().toISOString()
    });
    if (error) { console.error('upsert error:', error); return false; }
    // 로컬 캐시도 갱신
    let all = LocalCache.load();
    const idx = all.findIndex(r => r.id === reg.id);
    if (idx >= 0) all[idx] = reg; else all.unshift(reg);
    LocalCache.save(all);
    return true;
  },

  // 삭제
  async remove(id) {
    const sb = getSupabase();
    if (!sb) {
      let all = LocalCache.load().filter(r => r.id !== id);
      LocalCache.save(all);
      return true;
    }
    const { error } = await sb.from('regulations').delete().eq('id', id);
    if (error) { console.error('remove error:', error); return false; }
    let all = LocalCache.load().filter(r => r.id !== id);
    LocalCache.save(all);
    return true;
  },

  // 초기화 (샘플 데이터 업로드)
  async initWithSample() {
    for (const reg of SAMPLE_DATA) {
      await this.upsert(reg);
    }
  }
};
