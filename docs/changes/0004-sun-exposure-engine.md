# 0004: Sun Exposure Engine

## Summary

Implement the sun exposure calculation engine: SunCalc integration for sunrise/sunset/daylight, Open-Meteo API client for solar radiation and weather data, and the effective sun hours pipeline (PSH × tree factor). This provides the environmental input to the chlorine decay model.

**Spec:** [Sun Exposure](../specs/sun-exposure/)
**Status:** draft
**Depends On:** 0002

## Motivation

- UV radiation is the #1 factor in outdoor chlorine decay — without sun exposure data, the forecast is just guessing
- Open-Meteo provides free, keyless, CORS-enabled solar radiation data — ideal for a SPA
- SunCalc provides offline-capable sun position calculations as a fallback

## Requirements

### SunCalc Integration

The app MUST use SunCalc for astronomical calculations.

#### Scenario: Daylight hours

- **GIVEN** a pool at (33.4484, -112.0740) on 2026-06-21
- **WHEN** `getSunTimes` is called
- **THEN** it returns sunrise ~5:20, sunset ~19:44, daylight ~14.4 hours

### Open-Meteo Client

The app MUST fetch 7-day hourly solar and weather data from Open-Meteo.

#### Scenario: Fetch solar data

- **GIVEN** a pool with valid coordinates
- **WHEN** the sun exposure engine initializes
- **THEN** it calls Open-Meteo with shortwave_radiation, cloud_cover, uv_index, temperature_2m for 7 days

#### Scenario: Cache hit

- **GIVEN** data was fetched 30 minutes ago
- **WHEN** sun exposure is requested again
- **THEN** cached data is returned without a new API call

### Effective Sun Hours Pipeline

The engine MUST compute effective sun hours: PSH × tree_factor.

#### Scenario: Full pipeline

- **GIVEN** a pool with 25% tree cover, and Open-Meteo returns 7,500 Wh/m² daily GHI
- **WHEN** effective sun hours are computed
- **THEN** PSH = 7.5, tree_factor = 1 - (0.25)^0.7 ≈ 0.63, effective = 4.7 hours

### Fallback Mode

The engine MUST degrade gracefully when offline.

#### Scenario: Offline fallback

- **GIVEN** no API data is available
- **WHEN** the engine computes sun exposure
- **THEN** it uses SunCalc for daylight hours and a latitude-based PSH estimate, with a UI indicator

## Design

### Approach

- Create `lib/solar/suncalc.ts` — thin wrapper around SunCalc with typed return values
- Create `lib/solar/open-meteo.ts` — API client with request builder, response parser, and cache logic
- Create `lib/solar/exposure.ts` — pure functions: calculatePSH, calculateTreeFactor, calculateEffectiveSunHours
- Create `lib/solar/index.ts` — orchestrator: computeSunExposure(pool) → SunExposureResult
- Store cached API responses in Zustand (non-persisted apiCache field)
- Cache key: `${lat},${lng}` rounded to 2 decimal places, with 1-hour TTL

### Decisions

- **Decision:** Cache in Zustand memory, not localStorage
  - **Why:** Weather data is time-sensitive (1-hour TTL). Persisting stale forecasts across sessions would be misleading.
  - **Alternatives considered:** localStorage cache with TTL (adds complexity, stale data risk)

- **Decision:** Use daily PSH (not hourly granularity) for the initial decay model input
  - **Why:** Simpler model, easier to reason about and test. Hourly granularity can be added later if needed.
  - **Alternatives considered:** Hour-by-hour GHI feeding into hourly decay (more accurate but complex)

### Non-Goals

- No NASA POWER integration (deferred per spec open question)
- No map visualization of sun exposure
- No hourly UV breakdown display (just daily summary)

## Tasks

- [ ] Install `suncalc` and `@types/suncalc` (if available, otherwise write minimal types)
- [ ] Create `lib/solar/suncalc.ts` — getSunTimes(date, lat, lng) returning typed sunrise/sunset/daylight
- [ ] Create `lib/solar/open-meteo.ts` — buildOpenMeteoUrl(), fetchSolarData(), parseResponse()
- [ ] Add API response cache to Zustand store (non-persisted, keyed by rounded lat/lng, 1-hour TTL)
- [ ] Create `lib/solar/exposure.ts` — calculatePSH(), calculateTreeFactor(), calculateEffectiveSunHours()
- [ ] Create `lib/solar/fallback.ts` — latitude-based seasonal PSH estimate for offline mode
- [ ] Create `lib/solar/index.ts` — computeSunExposure(pool) orchestrator returning SunExposureResult
- [ ] Define `SunExposureResult`, `DailySunExposure`, `HourlySunData` types in `src/types/`
- [ ] Write unit tests for all pure functions (PSH, tree factor, effective sun hours)
- [ ] Write unit tests for Open-Meteo response parsing (mock fetch)
- [ ] Write unit tests for fallback estimation
- [ ] Write integration test: full pipeline with mocked API returns correct SunExposureResult

## Open Questions

- [ ] Should the API client retry on transient failures (e.g., 1 retry after 2 seconds), or fail immediately to fallback? Recommend: 1 retry, then fallback.

## References

- Spec: [Sun Exposure](../specs/sun-exposure/)
- [Open-Meteo API Docs](https://open-meteo.com/en/docs)
- [SunCalc API](https://github.com/mourner/suncalc#reference)
- Related: [0002-pool-crud](./0002-pool-crud.md)
