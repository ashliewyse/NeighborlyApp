export const GROUP = "22222222-2222-4222-8222-222222222222";
export const OWNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const VIEWER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const fixture: any = {
  viewer: VIEWER,
  session: VIEWER,
  tables: {},
  saveError: false,
  loadError: false,
  reset(joined = false) {
    this.viewer = VIEWER;
    this.session = VIEWER;
    this.saveError = false;
    this.loadError = false;
    this.tables = {
      community_groups_directory: [
        {
          id: GROUP,
          name: "Welcome & Testing",
          description: "A real early-member group.",
          emoji: "🤝",
          city: "Michigan City",
          created_by: OWNER,
          is_active: true,
          member_count: joined ? 2 : 1,
        },
      ],
      community_group_members: [
        { group_id: GROUP, user_id: OWNER },
        ...(joined ? [{ group_id: GROUP, user_id: VIEWER }] : []),
      ],
      community_group_invites: [],
      community_group_posts: [],
      community_group_replies: [],
      site_admins: [],
      profiles: [
        { id: OWNER, full_name: "Alex Owner", city: "Michigan City" },
        { id: VIEWER, full_name: "Jamie Neighbor", city: "Michigan City" },
        {
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          full_name: "Casey Neighbor",
          city: "Michigan City",
        },
      ],
      posts: [],
      post_comments: [],
      business_profiles: [],
      community_areas: [],
    };
  },
};
fixture.reset();
export const supabase: any = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    getUser: async () => ({
      data: { user: fixture.session ? { id: fixture.session } : null },
      error: null,
    }),
  },
  storage: {
    from: () => ({
      getPublicUrl: (path: string) => ({
        data: { publicUrl: "https://example.test/" + path },
      }),
    }),
  },
  rpc: async (name: string, args: any) => {
    if (name === "my_account_restriction")
      return { data: [{ state: "active" }], error: null };
    if (name !== "respond_to_group_invite")
      throw new Error("Unexpected RPC " + name);
    const row = fixture.tables.community_group_invites.find(
      (r: any) =>
        r.id === args.p_invite_id &&
        r.invitee_id === fixture.session &&
        r.status === "pending",
    );
    if (!row || fixture.saveError)
      return { data: null, error: { message: "Unable to respond" } };
    row.status = args.p_accept ? "accepted" : "declined";
    if (
      args.p_accept &&
      !fixture.tables.community_group_members.some(
        (m: any) =>
          m.group_id === row.group_id && m.user_id === fixture.session,
      )
    )
      fixture.tables.community_group_members.push({
        group_id: row.group_id,
        user_id: fixture.session,
      });
    return { data: row.group_id, error: null };
  },
  from(table: string) {
    if (!fixture.tables[table]) throw new Error("Unexpected table " + table);
    const filters: ((r: any) => boolean)[] = [];
    const ordering: { key: string; ascending: boolean }[] = [];
    let payload: any = null,
      operation = "read",
      single = false,
      limit = Infinity;
    const q: any = {
      select(fields: string) {
        if (table === "posts" && fields.includes("profiles"))
          throw new Error(
            "Posts reference auth.users; profile embedding is not available",
          );
        return q;
      },
      eq(k: string, v: any) {
        filters.push((r) => r[k] === v);
        return q;
      },
      neq(k: string, v: any) {
        filters.push((r) => r[k] !== v);
        return q;
      },
      ilike(k: string, v: string) {
        filters.push((r) =>
          String(r[k])
            .toLowerCase()
            .includes(v.replace(/%/g, "").toLowerCase()),
        );
        return q;
      },
      in(k: string, values: any[]) {
        filters.push((r) => values.includes(r[k]));
        return q;
      },
      order(key: string, options = { ascending: true }) {
        ordering.push({ key, ascending: options.ascending });
        return q;
      },
      limit(n: number) {
        limit = n;
        return q;
      },
      maybeSingle() {
        single = true;
        return q;
      },
      single() {
        single = true;
        return q;
      },
      insert(value: any) {
        payload = value;
        operation = "insert";
        return q;
      },
      delete() {
        operation = "delete";
        return q;
      },
      then(resolve: any, reject: any) {
        return Promise.resolve()
          .then(() => {
            let rows = fixture.tables[table].filter((r: any) =>
                filters.every((f) => f(r)),
              ),
              error = null;
            if (operation === "read" && fixture.loadError)
              error = { message: "Offline" };
            if (operation !== "read" && fixture.saveError)
              error = { message: "Offline" };
            if (!error && operation === "insert") {
              if (
                table === "community_group_invites" &&
                fixture.tables[table].some(
                  (r: any) =>
                    r.group_id === payload.group_id &&
                    r.invitee_id === payload.invitee_id,
                )
              )
                error = { message: "Already invited", code: "23505" };
              else {
                const row = {
                  id: crypto.randomUUID(),
                  created_at: "2026-11-03T12:00:00Z",
                  status: "pending",
                  ...payload,
                };
                fixture.tables[table].push(row);
                rows = [row];
              }
            }
            if (!error && operation === "delete")
              fixture.tables[table] = fixture.tables[table].filter(
                (r: any) => !filters.every((f) => f(r)),
              );
            if (
              table === "community_group_posts" ||
              table === "community_group_replies"
            )
              rows = rows.map((r: any) => ({
                ...r,
                author: fixture.tables.profiles.find(
                  (p: any) => p.id === r.author_id,
                ),
              }));
            if (table === "community_groups_directory")
              rows = rows.map((r: any) => ({
                ...r,
                member_count: fixture.tables.community_group_members.filter(
                  (m: any) => m.group_id === r.id,
                ).length,
              }));
            rows.sort((a: any, b: any) => {
              for (const { key, ascending } of ordering) {
                if (a[key] !== b[key])
                  return (a[key] < b[key] ? -1 : 1) * (ascending ? 1 : -1);
              }
              return 0;
            });
            rows = rows.slice(0, limit);
            return {
              data: error ? null : single ? (rows[0] ?? null) : rows,
              error,
            };
          })
          .then(resolve, reject);
      },
    };
    return q;
  },
};
export const publicSupabase = supabase;
