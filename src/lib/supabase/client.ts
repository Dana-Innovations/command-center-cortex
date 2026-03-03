import { createBrowserClient } from '@supabase/ssr';

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a no-op proxy so hooks that still reference Supabase
    // don't crash when env vars are missing (live-data mode).
    return new Proxy({} as ReturnType<typeof createBrowserClient>, {
      get(_target, prop) {
        if (prop === 'auth') {
          return {
            getUser: async () => ({ data: { user: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            signOut: async () => {},
          };
        }
        if (prop === 'from') {
          return () => ({
            select: () => ({
              order: () => ({
                eq: () => ({ data: [], error: null }),
                gte: () => ({ lte: () => ({ order: () => ({ data: [], error: null }) }), data: [], error: null }),
                data: [],
                error: null,
              }),
              eq: () => ({ order: () => ({ data: [], error: null }), data: [], error: null }),
              limit: () => ({ order: () => ({ data: [], error: null }), data: [], error: null }),
              data: [],
              error: null,
            }),
            insert: () => ({ data: null, error: null }),
            upsert: () => ({ data: null, error: null }),
          });
        }
        if (prop === 'channel') {
          return () => ({
            on: function() { return this; },
            subscribe: () => {},
          });
        }
        if (prop === 'removeChannel') {
          return () => {};
        }
        return undefined;
      },
    });
  }

  _client = createBrowserClient(url, key);
  return _client;
}
