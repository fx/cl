# 0006: Chemistry Forecast Engine

## Summary

Implement the 7-day chlorine forecast pipeline: hourly decay simulation combining the chemistry model with sun exposure data, automatic dose scheduling, and the NextAction recommendation engine. This is the core intelligence of cl.

**Spec:** [Chemistry Forecast](../specs/chemistry-forecast/)
**Status:** draft
**Depends On:** 0004, 0005

## Motivation

- The forecast is cl's primary differentiator — turning raw chemistry data into "add X chlorine by Y date"
- Without the forecast, the app is just a test logger and dosing calculator (many existing apps do this)
- The hourly simulation accounts for day/night UV cycles, making predictions significantly more accurate than simple linear extrapolation

## Requirements

### Hourly Simulation

The forecast MUST simulate FC decay hour by hour for 168 hours (7 days).

#### Scenario: Day/night sawtooth

- **GIVEN** a pool starting at FC = 6.0 with CYA = 40 in a sunny location
- **WHEN** the simulation runs
- **THEN** FC declines faster during daylight (UV + demand) and slower overnight (demand only), producing a descending curve with daily inflection points

### Dose Scheduling

The forecast MUST automatically insert dose events when FC approaches the minimum.

#### Scenario: Auto-dose schedule

- **GIVEN** FC decays from 6.0 to below 3.0 (min for CYA 40) after ~2.5 days
- **WHEN** the scheduler runs
- **THEN** it inserts a dose event at the 1-ppm-before-minimum point, calculates the product amount to restore to target (6.0), and continues simulation post-dose

### NextAction Determination

The forecast MUST produce a single NextAction recommendation.

#### Scenario: Dose needed soon

- **GIVEN** FC predicted to drop below minimum in 8 hours
- **WHEN** NextAction is computed
- **THEN** type = "dose", priority = "urgent", with specific product amount and timing

#### Scenario: All good

- **GIVEN** FC stays in range for 4+ days
- **WHEN** NextAction is computed
- **THEN** type = "ok", priority = "info", showing next scheduled dose date

#### Scenario: Stale test data

- **GIVEN** last FC test was 5 days ago
- **WHEN** NextAction is computed
- **THEN** type = "test", priority = "warning", prompting the user to retest

### Confidence Levels

The forecast MUST indicate confidence based on test freshness.

#### Scenario: High confidence

- **GIVEN** FC was tested 6 hours ago
- **WHEN** the forecast displays
- **THEN** confidence = "high", no staleness warnings

#### Scenario: Low confidence

- **GIVEN** FC was tested 6 days ago
- **WHEN** the forecast displays
- **THEN** confidence = "low", prominent retest banner

### CYA Accumulation Warnings

For trichlor/dichlor pools, the forecast MUST project CYA increase from dosing.

#### Scenario: CYA creep

- **GIVEN** a trichlor pool with CYA = 55, forecast schedules 3 doses/week
- **WHEN** warnings are generated
- **THEN** a warning shows projected CYA rise and recommends switching to liquid chlorine

## Design

### Approach

- Create `lib/chemistry/forecast.ts` — the simulation loop: takes startFc, sun exposure, decay params, pool config → ForecastHour[]
- Create `lib/chemistry/scheduler.ts` — walks ForecastHour[], inserts DoseEvents when FC approaches minimum
- Create `lib/chemistry/next-action.ts` — analyzes forecast to produce NextAction
- Create `lib/chemistry/warnings.ts` — generates ForecastWarnings from pool state, tests, and forecast
- Create a `useForecast(poolId)` hook that orchestrates: get pool → get latest tests → get sun exposure → generate forecast → return ForecastResult
- The hook MUST memoize the forecast and only recompute when inputs change

### Decisions

- **Decision:** Run the simulation synchronously (not in a Web Worker)
  - **Why:** 168 iterations of simple arithmetic completes in < 1ms. A Web Worker adds complexity with zero benefit.
  - **Alternatives considered:** Web Worker (unnecessary), requestIdleCallback (unnecessary)

- **Decision:** Schedule doses at the "1 ppm above minimum" threshold, not at the minimum itself
  - **Why:** Gives the pool owner a buffer window. If they're 4 hours late dosing, FC is still above minimum.
  - **Alternatives considered:** Dose at minimum (too late), dose at fixed interval (ignores conditions)

- **Decision:** Default dose time preference to evening (6 PM local)
  - **Why:** Most pool owners add chemicals in the evening — chlorine has all night to work before UV hits. When the "dose needed" time falls during the day, snap it to the next evening.
  - **Alternatives considered:** Exact time when FC crosses threshold (often inconvenient, e.g., 2 AM)

### Non-Goals

- No UI implementation (that's 0007)
- No push notifications
- No SWG runtime calculation (deferred per spec)

## Tasks

- [ ] Define `ForecastResult`, `ForecastHour`, `DoseEvent`, `NextAction`, `ForecastWarning` types in `src/types/`
- [ ] Implement `lib/chemistry/forecast.ts` — simulateHourly() loop with hourly k_uv and k_demand
- [ ] Implement `lib/chemistry/scheduler.ts` — findDoseEvents() with 1-ppm buffer, evening dose snapping
- [ ] Implement `lib/chemistry/next-action.ts` — determineNextAction() logic (dose/test/ok based on forecast + test freshness)
- [ ] Implement `lib/chemistry/warnings.ts` — generateWarnings() for CYA creep, stale tests, pH, LSI
- [ ] Create `useForecast(poolId)` hook — orchestrates the full pipeline with memoization
- [ ] Write unit tests for simulation (known inputs → expected FC curve)
- [ ] Write unit tests for dose scheduling (correct timing and amounts)
- [ ] Write unit tests for NextAction determination (all 3 types and priorities)
- [ ] Write unit tests for warning generation (CYA creep, stale test thresholds)
- [ ] Write integration test: full pipeline from pool + tests + sun data → complete ForecastResult

## Open Questions

- [ ] Should the dose scheduler allow the user to mark a dose as "done" (resetting the forecast from the actual post-dose FC)? This is effectively logging a test — redirect to test form post-dose? Yes, likely.

## References

- Spec: [Chemistry Forecast](../specs/chemistry-forecast/)
- Related: [0004-sun-exposure-engine](./0004-sun-exposure-engine.md), [0005-water-chemistry-model](./0005-water-chemistry-model.md)
