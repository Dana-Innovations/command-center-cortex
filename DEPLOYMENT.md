# Command Center Deployment

## Canonical production setup
- Repo: `Dana-Innovations/command-center-cortex`
- Vercel project: `sonance/command-center`
- Production URL: `https://command-center-sonance.vercel.app`
- Cortex OAuth callback: `https://command-center-sonance.vercel.app/auth/cortex/callback`

## Rules
- Use **one canonical repo**: `Dana-Innovations/command-center-cortex`
- Use **one canonical production deploy**: Sonance org Vercel project
- Do **not** treat personal Vercel projects as production
- Do **not** introduce alternate production URLs without also updating OAuth redirect URIs and environment variables

## Required environment variables
### Public
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CORTEX_URL`
- `NEXT_PUBLIC_CORTEX_CLIENT_ID`
- `NEXT_PUBLIC_SITE_URL=https://command-center-sonance.vercel.app`

### Server
- `CORTEX_CLIENT_ID`
- `CORTEX_CLIENT_SECRET`
- `NEXTAUTH_URL=https://command-center-sonance.vercel.app`
- `NEXTAUTH_SECRET`

## Deployment workflow
1. Push changes to `main` on `Dana-Innovations/command-center-cortex`
2. Confirm Sonance Vercel project is the target
3. Verify production URL is `https://command-center-sonance.vercel.app`
4. If auth changes, verify Cortex OAuth callback matches the production URL exactly

## Anti-footgun note
Personal Vercel deployments may still exist, but they are not canonical production targets.
