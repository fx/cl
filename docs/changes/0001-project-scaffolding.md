# 0001: Project Scaffolding

## Summary

Bootstrap the cl project with the full tech stack: Bun, Vite 7, React 19, @fx/ui, Tailwind CSS v4, Biome, Vitest, and PWA support. Create the directory structure, configure all tooling, and produce a minimal running app with a placeholder route.

**Spec:** [Architecture](../specs/architecture/)
**Status:** draft
**Depends On:** —

## Motivation

- The repository is currently empty (README.md only). All tooling and source structure must be created from scratch.
- A correct foundation avoids rework later — Vite config, Biome rules, Tailwind theme integration with @fx/ui, and Zustand store setup are all easier to get right once upfront.

## Requirements

### Vite + React Setup

The project MUST be initialized with a working Vite + React 19 + TypeScript configuration.

#### Scenario: Dev server runs

- **GIVEN** a fresh clone with `bun install` completed
- **WHEN** `bun run dev` is executed
- **THEN** Vite dev server starts with HMR, serving the React app at `localhost:5173`

### @fx/ui Integration

The project MUST install and configure @fx/ui with its required peer dependencies and CSS.

#### Scenario: @fx/ui components render

- **GIVEN** the app imports `Button` from `@fx/ui`
- **WHEN** the app renders
- **THEN** the Button renders with correct Tailwind v4 styles from @fx/ui's globals.css

### Biome Configuration

Biome MUST be configured for linting and formatting.

#### Scenario: Lint and format

- **GIVEN** a TypeScript file with formatting issues
- **WHEN** `bun run lint` is executed
- **THEN** Biome reports lint errors and `bun run format` fixes formatting

### Vitest Configuration

Vitest MUST be configured with jsdom and @testing-library/react.

#### Scenario: Tests run

- **GIVEN** a simple test file exists
- **WHEN** `bun run test` is executed
- **THEN** Vitest runs and reports results

### PWA Setup

vite-plugin-pwa MUST be installed and configured with a basic manifest.

#### Scenario: PWA installable

- **GIVEN** a production build is served
- **WHEN** Lighthouse audits the app
- **THEN** the app meets PWA installability criteria

### Zustand Store Shell

A Zustand store with persist middleware MUST be configured as the data layer foundation.

#### Scenario: State persists

- **GIVEN** the store has initial state
- **WHEN** the page is reloaded
- **THEN** state is restored from localStorage

### Client-Side Routing

A router MUST be configured with placeholder routes.

#### Scenario: Navigation works

- **GIVEN** routes for `/`, `/pools/new`, `/pools/:id`
- **WHEN** the user navigates between routes
- **THEN** the correct placeholder view renders without full page reload

## Design

### Approach

1. Initialize with `bun create vite cl --template react-ts`
2. Install dependencies: `@fx/ui`, `zustand`, `suncalc`, `leaflet`, `wouter`, `vite-plugin-pwa`, `recharts`
3. Install dev dependencies: `@biomejs/biome`, `vitest`, `@vitest/ui`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@types/leaflet`
4. Configure `biome.json`, `vite.config.ts`, `tsconfig.json`
5. Import `@fx/ui/styles/globals.css` in the entry point
6. Create directory structure per architecture spec
7. Set up Zustand store with persist middleware (version 1, empty pools array)
8. Configure wouter routes with placeholder components
9. Add a smoke test

### Decisions

- **Decision:** Use `wouter` over `@tanstack/router`
  - **Why:** Only 5 routes, wouter is 2KB vs 30KB+. Simpler API for a small app.
  - **Alternatives considered:** @tanstack/router (type-safe but heavy for this scope), react-router (most popular but also heavy)

- **Decision:** Use Zustand over TanStack DB
  - **Why:** Zustand persist is simple, well-documented, and sufficient for localStorage. TanStack DB is newer and designed for sync scenarios we don't need yet.
  - **Alternatives considered:** TanStack DB LocalStorageCollection, Jotai atomWithStorage

### Non-Goals

- No actual feature implementation — just scaffolding and tooling
- No real UI beyond placeholder text per route
- No API calls yet

## Tasks

- [ ] Initialize Vite project with React 19 + TypeScript template
- [ ] Install and configure @fx/ui with Tailwind CSS v4
- [ ] Configure Biome for linting and formatting
- [ ] Configure Vitest with jsdom and testing-library
- [ ] Set up vite-plugin-pwa with basic manifest and icons
- [ ] Create `src/` directory structure per architecture spec
- [ ] Set up Zustand store with persist middleware (pools, testResults, preferences)
- [ ] Configure wouter with placeholder routes (/, /pools/new, /pools/:id, /pools/:id/test, /pools/:id/history)
- [ ] Create a root layout with minimal app shell (header with app name)
- [ ] Add package.json scripts (dev, build, preview, test, lint, format)
- [ ] Write a smoke test (app renders without crashing)
- [ ] Verify production build works (`bun run build && bun run preview`)

## Open Questions

- [ ] Should we use `@fontsource/jetbrains-mono` (per @fx/ui) or the system monospace font? Follow @fx/ui's convention.

## References

- Spec: [Architecture](../specs/architecture/)
- [@fx/ui setup guide](https://github.com/fx/ui)
- [Vite PWA guide](https://vite-pwa-org.netlify.app/guide/)
