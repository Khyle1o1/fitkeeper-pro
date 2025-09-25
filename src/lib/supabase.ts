// Offline-only build: provide a minimal no-op supabase-like object to avoid runtime errors.
export const supabase = {
  from() {
    return {
      select: async () => ({ data: [], error: { message: 'Supabase disabled (offline mode)' } }),
      insert: async () => ({ error: { message: 'Supabase disabled (offline mode)' } }),
      update: async () => ({ error: { message: 'Supabase disabled (offline mode)' } }),
      eq: function () { return this; },
      gte: function () { return this; },
      lte: function () { return this; },
      order: function () { return this; },
      limit: function () { return this; },
    } as any;
  },
} as const;


