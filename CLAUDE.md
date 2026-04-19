# CLAUDE.md

## Project Overview

Pool chemistry PWA ("cl") for managing swimming pool water chemistry. Users add pools with geolocation, log water tests, view chemistry evaluations (FC/CYA ratios, LSI), and get 7-day chlorine decay forecasts with dosing recommendations.

## Tech Stack

- **Framework:** React 19, TypeScript 6
- **Bundler:** Vite 8, SWC via @vitejs/plugin-react
- **Styling:** Tailwind CSS 4 (via @tailwindcss/vite), tw-animate-css
- **Components:** @fx/ui (shared component library)
- **State:** Zustand 5 with persist middleware
- **Routing:** Wouter 3
- **Charts:** Recharts 3
- **Maps:** Leaflet + react-leaflet
- **Solar:** suncalc (sun position), Open-Meteo API (GHI data)
- **PWA:** vite-plugin-pwa (generateSW strategy, autoUpdate)
- **Linting/Formatting:** Biome 2
- **Testing:** Vitest 4, @testing-library/react, jsdom, @vitest/coverage-v8

## Key Commands

| Command | Description |
|---|---|
| `bun --bun run dev` | Start dev server |
| `bun --bun run build` | Type-check and build for production |
| `bun --bun run test` | Run all tests (vitest run) |
| `bun --bun run test:watch` | Run tests in watch mode |
| `bun --bun run test:coverage` | Run tests with coverage |
| `bun --bun run lint` | Lint and format check (biome check) |
| `bun --bun run format` | Auto-fix lint and format (biome check --write) |

## Project Structure

```
src/
  app.tsx                  # Root component with Wouter routes
  main.tsx                 # Entry point, renders <App />
  test-setup.ts            # Vitest setup (jest-dom matchers)
  types/                   # Shared TypeScript types (Pool, WaterTest, etc.)
  components/
    layout.tsx             # App shell / layout wrapper
    ui/                    # (reserved for local UI primitives)
  features/
    chemistry/             # Water test form, dosing calculator, trend charts
    forecast/              # 7-day forecast dashboard, charts, alerts
    pools/                 # Pool CRUD, map, location picker, history
    sun/                   # (reserved for sun-related UI)
  hooks/
    use-forecast.ts        # Forecast data hook
    use-geolocation.ts     # Browser geolocation hook
    use-sun-exposure.ts    # Sun exposure calculation hook
  lib/
    id.ts                  # UUID generation with non-secure-context fallback
    chemistry/             # Chemistry engine: decay, dosing, evaluation, FC/CYA, forecast
    solar/                 # Solar engine: suncalc wrapper, Open-Meteo client, fallback
  stores/
    app-store.ts           # Main persisted store (pools, test results, prefs)
    solar-cache-store.ts   # Solar API response cache
```

## Conventions

- **Formatter:** Biome -- tabs, double quotes, 80-char line width
- **Imports:** Relative paths (no `@/` aliases). Biome auto-sorts imports.
- **Naming:** kebab-case files, PascalCase components, camelCase functions/variables
- **Components:** Named exports (no default exports)
- **State:** Zustand stores in `src/stores/`, feature hooks in `src/hooks/`
- **Types:** Centralized in `src/types/index.ts`, re-exported via barrel
- **IDs:** Use `generateId()` from `src/lib/id.ts` (never raw `crypto.randomUUID`)
- **Geolocation:** Always guard with `window.isSecureContext` before using browser geolocation

## Testing

- **Runner:** Vitest with jsdom environment
- **Setup:** `src/test-setup.ts` imports `@testing-library/jest-dom/vitest`
- **Patterns:** Co-located test files (`*.test.ts` / `*.test.tsx` next to source)
- **Coverage:** 100% thresholds (lines, functions, branches, statements)
- **Component tests:** @testing-library/react with `renderHook` for hooks
- **Library tests:** Pure unit tests with vitest assertions

## Task Tracking

**You MUST load the `/project-management` skill before creating, modifying, or completing any task.** It owns all task-tracking rules and knows where tasks belong. Do not manage tasks without it.

# currentDate
Today's date is 2026-04-19.
