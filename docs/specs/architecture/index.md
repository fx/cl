# Architecture

## Overview

**cl** (the chemical symbol for chlorine) is a client-side single-page application for pool chemistry management. The app MUST run entirely in the browser with no backend, persisting data to localStorage. It SHOULD be installable as a PWA for pool-side use. The stack MUST use Bun as runtime/package manager, Vite as build tool, React 19 with @fx/ui components, Tailwind CSS v4, Biome for linting/formatting, and Vitest for testing.

## Background

Pool owners need to track chemistry levels, predict chlorine decay, and schedule dosing — but existing tools are either expensive IoT devices or manual spreadsheets. cl provides an intelligent, offline-capable SPA that combines solar/weather data with chemistry models to give actionable recommendations. The "no backend" constraint keeps the project simple and deployable as a static site.

- Related specs: [Pool Management](../pool-management/), [Sun Exposure](../sun-exposure/), [Water Chemistry](../water-chemistry/), [Chemistry Forecast](../chemistry-forecast/)

## Requirements

### Tech Stack

The project MUST use the following stack:

- **Runtime/Package Manager:** Bun (latest stable)
- **Build Tool:** Vite 7+ with `@vitejs/plugin-react`
- **UI Framework:** React 19 with `@fx/ui` component library
- **Styling:** Tailwind CSS v4 with `@tailwindcss/vite` plugin
- **Linting/Formatting:** Biome 2+
- **Testing:** Vitest 3+ with `@testing-library/react` and `jsdom`
- **Language:** TypeScript 5.7+

The project MUST NOT use Bun's bundler for development (no React Fast Refresh support). Vite's dev server MUST be used for HMR.

#### Scenario: Dev server startup

- **GIVEN** a freshly cloned repository
- **WHEN** the developer runs `bun install && bun run dev`
- **THEN** Vite dev server starts with HMR on the default port

#### Scenario: Production build

- **GIVEN** the project is configured
- **WHEN** the developer runs `bun run build`
- **THEN** Vite produces an optimized static build in `dist/`

### Project Structure

The project MUST follow this directory layout:

```
cl/
├── public/                  # Static assets, PWA icons
├── src/
│   ├── app.tsx              # Root app component with router
│   ├── main.tsx             # Entry point, mounts React
│   ├── components/          # Shared UI components
│   │   └── ui/              # App-specific UI primitives
│   ├── features/            # Feature modules
│   │   ├── pools/           # Pool CRUD, list, detail
│   │   ├── chemistry/       # Water chemistry model, test logging
│   │   ├── forecast/        # Prediction engine, dashboard
│   │   └── sun/             # Sun exposure calculations
│   ├── lib/                 # Pure utility functions
│   │   ├── chemistry/       # Chemistry math (decay, dosing)
│   │   ├── solar/           # SunCalc wrappers, Open-Meteo client
│   │   └── storage/         # localStorage abstraction
│   ├── stores/              # Zustand stores
│   └── types/               # Shared TypeScript types
├── docs/                    # Specs, changes, task tracking
├── index.html               # Vite entry HTML
├── vite.config.ts
├── tsconfig.json
├── biome.json
└── package.json
```

Feature modules SHOULD be self-contained with their own components, hooks, and utilities. Cross-feature imports MUST go through `lib/` or `stores/`.

#### Scenario: Feature isolation

- **GIVEN** a developer is working on the forecast feature
- **WHEN** they need pool data
- **THEN** they import from `stores/` (shared state), not from `features/pools/` directly

### Data Persistence

The app MUST use **Zustand with persist middleware** for state management and localStorage persistence.

- All pool data, test history, and user preferences MUST be persisted to localStorage
- The store MUST use `version` and `migrate` fields for schema evolution
- Ephemeral UI state (modals, loading indicators) MUST NOT be persisted
- The store SHOULD use `partialize` to select only persistent fields
- The total data footprint SHOULD remain under 2 MB to stay well within localStorage's 5-10 MB limit

#### Scenario: Data survives reload

- **GIVEN** a user has added a pool with test results
- **WHEN** they close and reopen the browser tab
- **THEN** all pool data and test history are restored from localStorage

#### Scenario: Schema migration

- **GIVEN** a user has data from store version 1
- **WHEN** the app updates to store version 2 with new fields
- **THEN** the migrate function transforms v1 data to v2 without data loss

### Progressive Web App

The app SHOULD be configured as a PWA using `vite-plugin-pwa`:

- The app MUST use `generateSW` strategy (auto-generated service worker)
- The app MUST register with `registerType: 'autoUpdate'`
- The app MUST include a web manifest with `display: 'standalone'`
- The app MUST provide icons at 192x192 and 512x512 for installability
- The app SHOULD include Apple-specific meta tags for iOS home screen behavior

#### Scenario: Offline access

- **GIVEN** a user has previously loaded the app while online
- **WHEN** they open the app without internet connectivity
- **THEN** the app loads from the service worker cache and all local data is accessible

#### Scenario: Install prompt

- **GIVEN** a user visits the app in a mobile browser
- **WHEN** the browser determines the app meets PWA criteria
- **THEN** the browser MAY show an install-to-home-screen prompt

### Routing

The app MUST use client-side routing for navigation between views. The router SHOULD be lightweight (e.g., `wouter` or `@tanstack/router`).

Required routes:

| Route | View | Description |
|-------|------|-------------|
| `/` | Pool list | Dashboard showing all pools |
| `/pools/new` | Add pool | Pool creation form |
| `/pools/:id` | Pool detail | Chemistry dashboard for one pool |
| `/pools/:id/test` | Log test | Record new water test results |
| `/pools/:id/history` | Test history | Past test results and trends |

#### Scenario: Direct URL access

- **GIVEN** a user bookmarks `/pools/abc123`
- **WHEN** they navigate directly to that URL
- **THEN** the app loads and displays the correct pool detail view

### External API Dependencies

The app MUST call the following external APIs from the browser (all support CORS, no API keys required):

| API | Purpose | CORS | Key |
|-----|---------|------|-----|
| Open-Meteo Forecast | Cloud cover, UV index, temperature | Yes | No |
| Open-Meteo Solar Radiation | GHI, DNI, DHI (W/m²) | Yes | No |

The app MAY optionally call:

| API | Purpose | CORS | Key |
|-----|---------|------|-----|
| NASA POWER | Historical solar climatology averages | Likely | No |

All API calls MUST include error handling and graceful degradation — the app MUST remain functional if APIs are unreachable (using last-cached data or reasonable defaults).

#### Scenario: API unavailable

- **GIVEN** the Open-Meteo API is unreachable
- **WHEN** the app needs solar data for a forecast
- **THEN** the app uses the most recently cached API response, or falls back to seasonal averages based on latitude

### No Backend Constraint

The app MUST NOT require a backend server for any core functionality. All computation MUST happen client-side:

- Chemistry decay models: client-side math
- Sun position calculations: `suncalc` library (in-browser)
- Dosing recommendations: client-side formulas
- Data storage: localStorage via Zustand persist

A backend MAY be added later for data sync, but the app MUST remain fully functional without one.

## Design

### Architecture

```
┌──────────────────────────────────────────────┐
│                   Browser                     │
│                                               │
│  ┌─────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  React   │  │ Zustand  │  │ localStorage│ │
│  │   UI     │←→│  Store   │←→│  (persist)  │ │
│  └────┬─────┘  └────┬─────┘  └─────────────┘ │
│       │              │                         │
│  ┌────┴─────┐  ┌────┴──────────────────┐     │
│  │ @fx/ui   │  │    lib/ (pure math)   │     │
│  │components│  │  ├─ chemistry/        │     │
│  └──────────┘  │  ├─ solar/            │     │
│                │  └─ storage/           │     │
│                └────────┬──────────────┘     │
│                         │                     │
│                    ┌────┴─────┐               │
│                    │  APIs    │               │
│                    │Open-Meteo│               │
│                    │ SunCalc  │               │
│                    └──────────┘               │
└──────────────────────────────────────────────┘
```

### Data Models

Core types are defined in the [Water Chemistry](../water-chemistry/) and [Pool Management](../pool-management/) specs. The architecture spec defines only the store shape:

```typescript
interface AppState {
  // Persisted
  pools: Pool[]
  testResults: Record<PoolId, WaterTest[]>
  preferences: UserPreferences

  // Ephemeral (not persisted)
  apiCache: Record<string, CachedResponse>
  ui: UIState
}
```

### API Surface

Not applicable — this is a client-side SPA with no backend API.

### Business Logic

All business logic lives in `lib/` as pure, testable functions. Feature modules compose these functions with React hooks and UI. See individual feature specs for business logic details.

## Constraints

- **Browser support:** Modern evergreen browsers (Chrome, Firefox, Safari, Edge — latest 2 versions)
- **Performance:** Initial load MUST be under 500 KB gzipped. Lighthouse performance score SHOULD be 90+
- **localStorage limit:** Total persisted data MUST stay under 2 MB
- **No API keys:** All external APIs used MUST be free and keyless for the SPA to work without configuration
- **Offline-capable:** Core features (viewing pools, logging tests, viewing forecasts from cached data) MUST work offline after first load

## Open Questions

- **Router choice:** `wouter` (tiny, 2KB) vs `@tanstack/router` (full-featured, type-safe). Recommend `wouter` for simplicity given the small route count.
- **Future backend:** If a backend is added later, should the data layer migrate to TanStack DB + ElectricSQL for sync, or a simpler REST API approach? Deferred until needed.

## References

- [@fx/ui](https://github.com/fx/ui) — React component library (Base UI + Tailwind v4 + CVA)
- [Open-Meteo API](https://open-meteo.com/) — Free weather and solar radiation API
- [Vite](https://vite.dev/) — Build tool
- [Zustand](https://zustand-demo.pmnd.rs/) — State management with persist middleware
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) — PWA support for Vite
- [SunCalc](https://github.com/mourner/suncalc) — Sun position calculations

## Changelog

| Date | Change | Document |
|------|--------|----------|
| 2026-04-18 | Initial spec created | — |
