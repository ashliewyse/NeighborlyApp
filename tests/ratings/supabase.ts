export const fixture = {
  viewer: 'reviewer-1' as string | null,
  rows: [] as any[],
  saveError: null as string | null,
  loadError: null as string | null,
  reset() { this.viewer = 'reviewer-1'; this.rows = []; this.saveError = null; this.loadError = null; },
};
export const supabase = {
  rpc: async () => ({ data: [], error: null }),
  auth: { getUser: async () => ({ data: { user: fixture.viewer ? { id: fixture.viewer } : null }, error: null }) },
  from(table: string) {
    const filters: Record<string, any> = {};
    let payload: any = null;
    let single = false;
    const q: any = {
      select: () => q, eq(key: string, value: any) { filters[key] = value; return q; },
      in: () => q, or: () => q, order: () => q, range: () => q,
      upsert(value: any, options: any) {
        if (table !== 'neighbor_reviews' || options.onConflict !== 'reviewer_id,reviewee_id') throw new Error('Wrong review storage contract');
        payload = value; return q;
      },
      single() { single = true; return q; }, maybeSingle() { single = true; return q; },
      then(resolve: any) {
        let data: any = [];
        let error: any = null;
        if (table === 'neighbor_reviews') {
          if (payload) {
            if (fixture.saveError) error = { message: fixture.saveError };
            else if (!fixture.viewer || payload.reviewer_id !== fixture.viewer || payload.reviewee_id === fixture.viewer) error = { message: 'Access denied' };
            else {
              const existing = fixture.rows.find(r => r.reviewer_id === payload.reviewer_id && r.reviewee_id === payload.reviewee_id);
              const row = { id: existing?.id ?? fixture.rows.length + 1, created_at: '2026-11-02T12:00:00Z', updated_at: '2026-11-02T12:00:00Z', ...payload, author: { full_name: 'Test Reviewer', account_type: 'business' } };
              fixture.rows = [...fixture.rows.filter(r => r.id !== row.id), row];
              data = [row];
            }
          } else if (fixture.loadError) error = { message: fixture.loadError };
          else data = fixture.rows.filter(r => Object.entries(filters).every(([k,v]) => r[k] === v));
        } else if (table === 'business_profiles') data = [{ user_id: 'reviewer-1', business_name: 'Test Business Reviewer' }];
        resolve({ data: single ? data[0] ?? null : data, error });
      },
    };
    return q;
  },
};
export const publicSupabase = supabase;
