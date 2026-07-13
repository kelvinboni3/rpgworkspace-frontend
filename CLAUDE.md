# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This is the frontend for RPG Workspace, a React SPA that consumes the `RpgWorkspace.Api` backend (see the sibling `Back/` project — different repo root, referenced here as `../Back`). Note: much of this doc predates the current feature set (the character journal/dossier UI, book volumes, AI note structuring) — prefer reading the code in `src/pages`/`src/components/campaign` over trusting every claim below outside the Routing/Auth-state sections, which are current.

The app's home (`/`, `paths.characters`) is `MyCharactersPage` — a player creates/lists their own `Character`s (solo, no workspace/campaign needed) via `CharacterService.getMine()`/`createSolo()`. The original GM-facing home (`AppHomePage`, workspaces list) still exists and is fully functional, just relocated behind `paths.gmArea` (`/gm`, a "coming soon" page) → `paths.gmWorkspaces` (`/gm/workspaces`, the real `AppHomePage`) — this is a navigation change only, no GM functionality was removed.

## Commands

Run from this directory (`Front/`):

```bash
npm run dev        # vite dev server
npm run build      # tsc -b (project references) && vite build
npm run lint       # eslint .
npm run preview    # preview a production build
```

There is no test runner configured (no test script, no test files, no Vitest/Jest dependency) — don't assume one exists.

Environment: copy `.env.example` to `.env` and set `VITE_API_BASE_URL` (used verbatim as the axios `baseURL` in `src/services/api-client.ts`). **`.env.example` currently points at `http://localhost:5000/api`, but the backend's actual dev port is `5069` (http) / `7019` (https) per `Back/src/RpgWorkspace.Api/Properties/launchSettings.json`** — update the local `.env` accordingly rather than trusting the example value.

## Architecture

### Stack

React 19 + TypeScript + Vite 7, React Router 7 (`createBrowserRouter`, data-router style, not the older `<Routes>` JSX style), TanStack Query 5 for server state, React Hook Form + Zod (`@hookform/resolvers/zod`) for forms, Tailwind 3 + Radix primitives assembled shadcn-style (`components.json`: style `new-york`, base color `slate`, icon library `lucide`).

Path alias `@/*` → `src/*`, configured in **three** places that must stay in sync if it ever changes: `vite.config.ts` (`resolve.alias`), `tsconfig.app.json` (`compilerOptions.paths`), and implicitly relied on by `components.json`'s aliases (`@/components`, `@/utils`, `@/hooks`).

### App bootstrap and providers

`src/main.tsx` renders `<AppProviders>` (in `src/app/providers.tsx`) wrapping `<RouterProvider router={router}>`. Provider order: `QueryClientProvider` (client from `src/services/query-client.ts`, defaults: no refetch-on-focus, 1 retry, 60s staleTime) → `ThemeProvider` (`src/components/theme-provider.tsx`, a from-scratch light/dark/system implementation storing the choice in `localStorage["rpg-workspace-theme"]` and toggling a `light`/`dark` class on `documentElement` — this is the standard shadcn `ThemeProvider` snippet, not a library). There is no global error boundary and no toast/notification provider yet.

### Routing

`src/routes/router.tsx` defines the whole tree; add new pages here, not through file-based routing. Shape:
- `paths.login` (`/login`) → `LoginPage`, unauthenticated, outside the layout.
- everything else nests under `<ProtectedRoute>` → `<AppLayout>` (the shell: centered `max-w-7xl` container) → page components, with `index: true` **and** `paths.characters` (`/characters`) both mapping to `MyCharactersPage` (the new home), `paths.gmArea` (`/gm`) → `GmAreaComingSoonPage` → `paths.gmWorkspaces` (`/gm/workspaces`) → the original `AppHomePage`, and `paths.subscription` (`/subscription`) → `SubscriptionPage`. `AppLayout`'s header renders a small nav (`Personagens` / `Mestre`, the latter styled muted/locked) alongside the existing theme toggle and user menu.

`paths.ts` (`src/routes/paths.ts`) is the single source of truth for route strings — reference `paths.xxx`, don't hardcode path strings in components.

`ProtectedRoute` (`src/routes/protected-route.tsx`) gates on `authStore.isAuthenticated()` and redirects to login with `state={{ from: location }}` on failure (so a future login page can redirect back). Note it calls `authStore` directly rather than through a reactive hook/context — see below, this only re-evaluates on route navigation/remount, not on arbitrary auth-state changes elsewhere in the tree.

### Auth state

`src/store/auth-store.ts` is **not** a state-management library (no Zustand/Redux despite the name) — it's a plain object wrapping `localStorage` (`rpg-workspace-access-token`, `rpg-workspace-user` keys) with `get/set/clear` methods and `isAuthenticated()`. Reading/writing it does not trigger React re-renders anywhere; components relying on auth state changing at runtime (e.g. right after login) need to force navigation/remount themselves rather than expecting reactivity. `src/hooks/use-auth.ts` (`useAuth()`) is currently just a thin passthrough returning `authStore` as-is — it exists as the seam to later swap in real reactive state (context/Zustand) without touching call sites, so prefer calling `useAuth()` from components instead of importing `authStore` directly, even though today they're equivalent.

`src/services/api-client.ts` is the single axios instance (`apiClient`) — it attaches `Authorization: Bearer <token>` from `authStore.getAccessToken()` via a request interceptor, and a response interceptor auto-clears the session and redirects to `/login` on a 401 (skipped for `/auth/*` endpoints themselves, and only when a session was actually present, so a failed login attempt doesn't bounce the user).

`src/services/auth-service.ts` (`AuthService.login`/`register`) calls `POST /auth/login` and `/auth/register`, matching `AuthController` in the backend, and defines the `AuthResponse`/`LoginRequest`/`RegisterRequest` shapes inline in the service file (not in `types/`) — follow this per-service-file colocation for new API modules rather than centralizing all DTOs in `types/api.ts`. `types/api.ts` is reserved for cross-cutting shapes only (`ApiErrorResponse`, generic `PaginatedResponse<T>`).

`Character.campaignId` is `string | null` (a `null` campaign means a solo character, no workspace/campaign at all — see `MyCharactersPage`/`character-detail-page.tsx`'s `isSolo` checks). `src/services/subscription-service.ts` (`SubscriptionService.getMine`/`startCheckout`) backs the free-tier gate: creating a second solo character on the free plan 402s, which pages catch via `isAxiosError(error) && error.response?.status === 402` (same pattern as the existing 503 handling in `note-structuring-widget.tsx`) and route to `paths.subscription`. `startCheckout` currently 501s (no payment gateway configured yet) — `SubscriptionPage` renders a friendly "not configured" message for that status rather than a generic error.

### UI primitives

`src/components/ui/` holds shadcn-generated primitives (`button.tsx`, `input.tsx` so far) — add new ones the same way (`class-variance-authority` for variants, `cn()` from `src/utils/cn.ts` — a standard `clsx` + `tailwind-merge` combinator — for class merging). `src/utils/form.ts` re-exports `zodResolver` as the intended single import point for wiring Zod schemas into `react-hook-form`.

When wiring up new pages, mind `eslint.config.js`'s `react-refresh/only-export-components` rule: it's already configured to allow `buttonVariants` and `useTheme` as extra named exports alongside components — extend `allowExportNames` there if a new file needs to export both a component and a non-component constant/hook.
