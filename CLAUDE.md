# Command Center

Next.js 15 executive dashboard. Aggregates email, calendar, tasks, chats, Slack, Salesforce, and Power BI via Cortex MCP.

## Commands

```bash
npm install            # install dependencies
vercel env pull .env.local  # pull env vars (REQUIRED before first run)
npm run dev            # start dev server on :3000
npm run build          # production build
npm run lint           # run linter
```

## DO NOT TOUCH — Protected Files

These files implement Cortex OAuth (PKCE) and MUST NOT be modified unless explicitly asked:

- `src/middleware.ts`
- `src/lib/cortex/auth.ts`
- `src/app/auth/cortex/callback/route.ts`
- `src/lib/cortex/pkce.ts`

## MUST Rules

- All user-specific content MUST come from the authenticated Cortex user. NEVER hardcode names, emails, user IDs, or demo data.
- All external data MUST flow through `callCortexMCP()` or `cortexCall()` in `src/lib/cortex/client.ts` using the user's token. MUST NOT add direct API keys or bypass Cortex.
- User-specific features (e.g. Jeana, CEO tone) MUST be gated behind `isAri` or a similar authenticated user check. MUST NOT make them globally visible.
- Supabase schema changes MUST use a new migration file in `supabase/migrations/`. MUST NOT modify existing migration files.
- All new Supabase tables MUST have RLS enabled, `updated_at` triggers, and indexes — follow the patterns in `supabase/migrations/20260305_setup_schema.sql`.

## Architecture

- **Auth:** Cortex OAuth2 PKCE → cookies (`cortex_access_token`, `cortex_user`) → middleware validates & forwards token via `x-cortex-token` header
- **Data:** Sync routes (`src/app/api/sync/*`) call Cortex MCP → upsert to Supabase
- **Supabase:** 12 tables with RLS. Schema in `supabase/migrations/`
- **Types:** All table interfaces in `src/lib/types.ts`
- **Connections:** `src/lib/cortex/connections.ts` checks which services a user has connected before fetching

## Supabase Tables

`user_profiles`, `emails`, `calendar_events`, `tasks`, `chats`, `teams_channels`, `slack_feed`, `salesforce_opportunities`, `salesforce_reports`, `sync_log`, `action_queue`, `audit_log`

## Common Mistakes to Avoid

- Adding `ANTHROPIC_API_KEY`, `SLACK_TOKEN`, or any direct service API key — everything goes through Cortex
- Spreading user data into components without checking the authenticated user first
- Modifying auth cookies or middleware token forwarding logic
- Creating Supabase tables via the dashboard instead of migration files
