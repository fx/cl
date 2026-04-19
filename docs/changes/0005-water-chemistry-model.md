# 0005: Water Chemistry Model & Test Logging

## Summary

Implement the core chemistry model (chlorine decay, FC/CYA relationship, dosing calculator, LSI), water test logging UI, and test history view. This provides the mathematical engine and data collection that the forecast depends on.

**Spec:** [Water Chemistry](../specs/water-chemistry/)
**Status:** implemented
**Depends On:** 0002

## Motivation

- The chlorine decay model is the mathematical core of the app — without it, no predictions are possible
- Water test logging creates the historical data that trains the learned decay rate and validates predictions
- The dosing calculator provides immediate value even before the forecast is built (users can calculate "how much bleach for +3 ppm" right away)

## Requirements

### Chlorine Decay Model

The app MUST implement first-order kinetics with UV and demand components.

#### Scenario: Daytime decay

- **GIVEN** FC = 5.0, CYA = 30, 85°F, GHI = 800 W/m²
- **WHEN** decay is calculated for 4 hours
- **THEN** FC ≈ 2.8 ppm (k_uv = 0.112, k_demand = 0.032, k_total = 0.144)

#### Scenario: Overnight decay

- **GIVEN** FC = 4.0, CYA = 50, 80°F, no sun
- **WHEN** decay runs for 10 hours
- **THEN** FC ≈ 3.1 ppm (k_demand only ≈ 0.025)

### FC/CYA Relationship

The app MUST compute min/target/max FC from CYA level.

#### Scenario: Target calculation

- **GIVEN** CYA = 40
- **WHEN** FC target is computed
- **THEN** min = 3, target = 6, max = 7, SLAM = 16

### Dosing Calculator

The app MUST calculate product amounts for a target FC increase.

#### Scenario: Liquid chlorine dose

- **GIVEN** 15,000 gal pool, current FC = 2.0, target FC = 5.0, using 12.5% liquid
- **WHEN** dose is calculated
- **THEN** result ≈ 48 fl oz (3 pints) of 12.5% sodium hypochlorite

### LSI Calculation

The app MUST compute LSI when all required parameters are available.

#### Scenario: Balanced water

- **GIVEN** pH = 7.4, TA = 100, CH = 300, temp = 82°F, TDS = 1000
- **WHEN** LSI is computed
- **THEN** result is near 0.0 (balanced)

### Water Test Logging

The app MUST provide a form to log test results with all parameters optional.

#### Scenario: Quick test

- **GIVEN** user navigates to `/pools/:id/test`
- **WHEN** they enter FC = 3.5 and pH = 7.4 and submit
- **THEN** a test is saved with those values, timestamp = now, all other fields null

### Test History

The app MUST display test history with trend charts.

#### Scenario: FC trend chart

- **GIVEN** 10 FC tests over 3 weeks
- **WHEN** the user views test history
- **THEN** they see a line chart of FC over time with the target range shaded

### Learned Decay Rate

The app SHOULD learn the pool's actual decay rate from paired FC tests.

#### Scenario: Learning from tests

- **GIVEN** 6 FC tests showing consistent observed k ≈ 0.10
- **WHEN** the model predicts decay
- **THEN** k_effective blends 70% observed + 30% model

## Design

### Approach

- Create `lib/chemistry/decay.ts` — calculateDecayRate(), predictFc(), UV and demand rate tables
- Create `lib/chemistry/fc-cya.ts` — calculateFcTarget(), FC/CYA lookup table with interpolation
- Create `lib/chemistry/dosing.ts` — calculateDose(), product strength constants, unit conversion
- Create `lib/chemistry/lsi.ts` — calculateLsi()
- Create `lib/chemistry/learned-rate.ts` — learnDecayRate() from test pairs
- Create `lib/chemistry/evaluate.ts` — evaluateChemistry() producing ChemistryStatus with recommendations
- Add testResults to Zustand store: `Record<string, WaterTest[]>` with addTest, deleteTest actions
- Build `TestForm` component (features/chemistry/) with @fx/ui inputs for all parameters
- Build `TestHistory` component with table + Recharts trend chart
- Build `DosingCalculator` component (standalone utility, also used by forecast)

### Decisions

- **Decision:** Implement all chemistry math as pure functions in `lib/chemistry/`
  - **Why:** Pure functions are trivially testable, composable, and independent of React. The forecast engine can reuse them directly.
  - **Alternatives considered:** Chemistry logic in React hooks (harder to test, tighter coupling)

- **Decision:** Store decay rate lookup tables as typed constants, not config files
  - **Why:** The tables (k_uv_base by CYA, FC/CYA targets) are small, stable, and benefit from TypeScript typing. No need for external config.
  - **Alternatives considered:** JSON config files (unnecessary indirection)

### Non-Goals

- No forecast generation yet (0006)
- No forecast chart (0007)
- No breakpoint chlorination wizard (just the calculation + recommendation in ChemistryStatus)

## Tasks

- [x] Define `WaterTest`, `ChemistryStatus`, `Recommendation`, `DecayParameters` types in `src/types/`
- [x] Implement `lib/chemistry/fc-cya.ts` — FC/CYA lookup table, interpolation, calculateFcTarget()
- [x] Implement `lib/chemistry/decay.ts` — k_uv_base table, temperature_factor (Arrhenius), calculateDecayRate(), predictFc()
- [x] Implement `lib/chemistry/dosing.ts` — product strength constants, calculateDose(), unit formatting (fl oz, pints, gallons, oz weight)
- [x] Implement `lib/chemistry/lsi.ts` — calculateLsi() with all intermediate values
- [x] Implement `lib/chemistry/learned-rate.ts` — extract k from test pairs, rolling average, blend with model
- [x] Implement `lib/chemistry/evaluate.ts` — evaluateChemistry() producing status + recommendations
- [x] Add test result CRUD to Zustand store (addTest, deleteTest, getTestsForPool)
- [x] Build `TestForm` component — all parameter inputs with validation, backdate option
- [x] Build `TestHistory` component — reverse-chronological list with out-of-range highlighting
- [x] Build `TestTrendChart` component — FC and pH line charts over time using @fx/ui Chart (Recharts)
- [x] Build `DosingCalculator` component — standalone tool for "how much to add" calculations
- [x] Wire routes: `/pools/:id/test` → TestForm, `/pools/:id/history` → TestHistory
- [x] Write unit tests for FC/CYA calculations (all table values + interpolation)
- [x] Write unit tests for decay model (daytime, nighttime, varying CYA, varying temp)
- [x] Write unit tests for dosing calculator (all 6 chlorine sources, unit conversion)
- [x] Write unit tests for LSI calculation
- [x] Write unit tests for learned rate blending
- [x] Write component tests for TestForm (validation, submission)

## Open Questions

- [x] Should the dosing calculator be accessible as a standalone page (not tied to a pool) for quick "how much bleach?" calculations? Would be useful but adds a route. Defer to post-v1.

## References

- Spec: [Water Chemistry](../specs/water-chemistry/)
- [TFP FC/CYA Table](https://www.troublefreepool.com/blog/2019/01/18/free-chlorine-and-cyanuric-acid-relationship-explained/)
- [PMC7506937: Decay Kinetics](https://pmc.ncbi.nlm.nih.gov/articles/PMC7506937/)
- Related: [0002-pool-crud](./0002-pool-crud.md)
