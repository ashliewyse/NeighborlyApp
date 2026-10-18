export const calls: { uploads: any[]; updates: any[] } = { uploads: [], updates: [] };
const urls = new Map<string, string>();
const notify = () => window.dispatchEvent(new Event('qa-backend'));
const sample = '/tests/profile-crop/sample.svg';

export const supabase = {
  auth: { getUser: async () => ({ data: { user: { id: 'crop-test-owner' } } }) },
  from(table: string) {
    let update: unknown;
    const query = {
      select: () => query,
      update(value: unknown) { update = value; return query; },
      eq: () => query,
      maybeSingle: async () => ({ data: table === 'business_profiles'
        ? { logo_url: sample, cover_url: sample, theme: 'blue' }
        : { avatar_url: sample }, error: null }),
      order: async () => ({ data: [], error: null }),
      then(resolve: (value: unknown) => void) {
        if (update) { calls.updates.push({ table, value: update }); notify(); }
        resolve({ data: [], error: null });
      },
    };
    return query;
  },
  storage: { from: () => ({
    async upload(path: string, file: File) {
      const url = URL.createObjectURL(file);
      urls.set(path, url);
      const img = new Image();
      img.src = url;
      await img.decode();
      calls.uploads.push({ path, type: file.type, width: img.naturalWidth, height: img.naturalHeight });
      notify();
      return { error: null };
    },
    getPublicUrl: (path: string) => ({ data: { publicUrl: urls.get(path) } }),
  }) },
};
export const publicSupabase = supabase;
