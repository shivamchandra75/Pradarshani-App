# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
"Praman Hai" (pradarshani_app): a reference/proof archive. Content hierarchy: Religion -> Book Category -> Book -> Media (proof images + description + tags). React 19 + TypeScript + Vite + Tailwind v4 + Supabase (Postgres, Auth, Storage). PWA, deployed as an SPA (`public/_redirects` is Netlify-style).

## Commands
- `npm run dev` - Vite dev server (`--host`, reachable from phone for PWA/mobile testing)
- `npm run build` - `tsc -b && vite build` (type errors fail the build)
- `npm run lint` - oxlint (not ESLint). Rules: react/rules-of-hooks (error), only-export-components (warn)
- No test runner is configured. `test-storage.ts` at the root is a stale scratch script (queries the old `image_url` column), not a test.
- Requires `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; `src/supabase.ts` throws at import if missing.

## Architecture
- **All data access lives in `src/services/mediaService.ts`** (Supabase queries + Storage). Pages/components call it; they don't call `supabase.from(...)` directly (except `AuthContext`, which reads `users.role`). Types for tables are in `src/types/database.ts`.
- **Auth/role gating**: `AuthContext` loads `public.users.role` (`guest | user | admin | super_admin`). In `App.tsx`, `PrivateRoute` renders `Guest404` (a disguised fake 404, deliberately not "pending approval") for `guest`; `AdminRoute` requires admin/super_admin; `SuperAdminRoute` guards `/admin/dashboard` (upload stats, user roles, storage size; storage size comes from the `get_media_storage_bytes()` RPC). New signups (email or Google OAuth) become `guest` via a DB trigger and are promoted manually in the Supabase dashboard. UI gating is cosmetic; real enforcement is RLS (policies and schema documented in `AGENT_HANDOFF.md`).
- **Navigation state is in the URL** so the mobile hardware Back button works: `useHistoryModal` syncs modals to query params (`?preview=`, `?edit=`); `FolderExplorer` keeps its depth in `fpath`; search filters in `SearchResults` use `{ replace: true }` so a whole search session is one history entry. Keep this when adding modals or navigation.
- **Search**: `utils/search.ts` extracts keywords (Hindi/Hinglish + English stopwords, Devanagari-aware) and ranks tags by token overlap; search is tag-based.
- **PWA**: `public/manifest.json`, `public/sw.js` (pass-through fetch handler, required for Chrome install prompt), PNG icons registered from `src/main.tsx`.

## Gotchas
- `verbatimModuleSyntax` is on: import types with `import type { ... }` or the build fails.
- Deleting a media row cascades in SQL but does NOT delete Storage files. Always use `deleteMediaRecord()` / `deleteImageFromStorage()`; they also call `cleanupOrphanTags()`. Tags are stored lowercase; orphaned tags are purged.
- Images go to the public `media-uploads` bucket (`proofs/`, `book-covers/`). `compressImageIfNeeded` only compresses files larger than 600 KB (max 1920px).
- `media.image_urls` is `text[]` (migrated from single `image_url`).
- `AGENT_HANDOFF.md` has the full schema, RLS SQL, and feature history; read it before touching DB or auth. Preserve the owner's existing edits unless told otherwise.
- `.agents/AGENTS.md` mentions Firestore; this project uses Supabase, so ignore it.
