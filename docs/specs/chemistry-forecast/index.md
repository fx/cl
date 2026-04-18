# Chemistry Forecast

## Overview

The chemistry forecast feature combines the chlorine decay model (from [Water Chemistry](../water-chemistry/)) with the sun exposure engine (from [Sun Exposure](../sun-exposure/)) to predict chlorine levels over a 7-day window, determine when the pool will need chlorination, and recommend exactly how much product to add. This is the core value proposition of cl — turning raw data into a simple answer: **"Add X amount of chlorine by Y date."**

## Background

Pool owners typically chlorinate on a fixed schedule (e.g., "add a gallon every Tuesday and Friday") regardless of actual conditions. This leads to either over-chlorination (wasting product, irritating skin) or under-chlorination (risking algae and bacteria). By modeling actual decay conditions — sun exposure, temperature, CYA level — cl provides dynamic, condition-aware dosing schedules.

The forecast pipeline:
1. Start from the most recent FC test result
2. Apply the decay model hour-by-hour using forecast weather data
3. Identify when FC drops below the minimum (from FC/CYA table)
4. Calculate the dose needed to restore FC to target
5. Repeat for the full 7-day window

Related specs: [Water Chemistry](../water-chemistry/), [Sun Exposure](../sun-exposure/), [Pool Management](../pool-management/), [Architecture](../architecture/)

## Requirements

### Forecast Generation

The app MUST generate a 7-day chlorine forecast for each pool.

- The forecast MUST start from the most recent FC test result
- If no FC test exists, the app MUST show a prompt to log the first test instead of an empty forecast
- The forecast MUST use hourly time steps for accuracy (day/night cycles matter)
- The forecast MUST incorporate weather data from [Sun Exposure](../sun-exposure/) for each hour
- The forecast MUST recalculate when:
  - A new water test is logged
  - Weather data is refreshed
  - Pool properties change (volume, CYA, tree cover, chlorine source)

#### Scenario: Generate forecast from test

- **GIVEN** a pool with last FC test = 5.0 ppm (logged today at 9 AM), CYA = 40, 85°F, Phoenix location, 10% tree cover
- **WHEN** the forecast runs
- **THEN** it produces hourly FC predictions for 7 days, showing FC declining through each day (faster in sun hours) and stabilizing at night

#### Scenario: No test data

- **GIVEN** a newly created pool with no water tests
- **WHEN** the user views the pool dashboard
- **THEN** the forecast section shows: "Log your first water test to see chlorine predictions" with a button to log a test

### Forecast Calculation Pipeline

The app MUST compute the forecast using this pipeline for each hour in the 7-day window:

```
for each hour h from now to now + 168h:
  1. Get sun exposure data for hour h (GHI, temperature)
  2. Compute k_uv for this hour (based on CYA and GHI)
  3. Compute k_demand for this hour (based on temperature)
  4. Blend with learned rate if available (k_effective)
  5. Apply decay: FC(h+1) = FC(h) × exp(-k_effective × 1)
  6. If a scheduled dose occurs at hour h, add dose to FC
  7. Record FC(h) in the forecast array
```

- Indoor pools MUST skip step 2 (k_uv = 0 always)
- If weather data is unavailable for future hours, the app MUST use the latest available day's pattern repeated

#### Scenario: Day/night cycle

- **GIVEN** a pool with FC = 5.0, CYA = 30, in a sunny location
- **WHEN** the forecast runs across a 24-hour period
- **THEN** FC drops faster during daylight hours (~0.14 h⁻¹ UV + 0.03 demand) and slower overnight (~0.03 demand only), producing a characteristic stair-step pattern

### Chlorination Schedule

The app MUST identify when FC will drop below the minimum for the pool's CYA level and recommend dosing.

**Algorithm:**

1. Walk the forecast forward hour by hour
2. When `FC(h) < min_FC_for_CYA`, mark hour `h` as "dose needed"
3. Actually, recommend dosing **before** FC drops below minimum — find the hour where FC first enters the "warning zone" (within 1 ppm of minimum)
4. Calculate the dose to bring FC back to the target (midpoint of FC range for the CYA level)
5. Insert the dose into the forecast and continue simulating
6. Repeat until end of 7-day window

The result is a **dosing schedule**: a list of recommended dose events with dates, times, and amounts.

#### Scenario: Weekly dosing schedule

- **GIVEN** a 15,000 gal pool, CYA = 40 (target FC = 6, min FC = 3), using 12.5% liquid chlorine, in a sunny location
- **WHEN** the forecast predicts FC dropping from 6.0 to 3.0 in ~2.5 days
- **THEN** the schedule shows: "Add 32 fl oz (1 quart) of liquid chlorine on Wednesday evening and again on Saturday evening"

#### Scenario: High-sun rapid decay

- **GIVEN** an unstabilized pool (CYA = 0) in July in Phoenix
- **WHEN** the forecast runs
- **THEN** it recommends daily (or even twice-daily) chlorination, AND prominently recommends adding CYA to 30-50 ppm to reduce the dosing frequency

### Forecast Display

The app MUST display the forecast in the pool detail view with:

#### Current Status Panel

- **Estimated current FC** — extrapolated from last test using decay model
- **Time since last test** — "Tested 6 hours ago"
- **Status indicator** — Green (FC in range), Yellow (approaching low), Red (below minimum)
- **FC/CYA ratio** — with OK/warning indicator

#### Forecast Chart

- **7-day line chart** showing predicted FC over time
- **Target range** shown as a shaded green band
- **Minimum FC line** shown as a red dashed line
- **Dose events** shown as vertical markers with amounts
- **Day/night** SHOULD be subtly indicated (background shading)
- **Current time** shown as a vertical "now" line

The chart MUST use @fx/ui Chart component (Recharts-based).

#### Scenario: Forecast chart display

- **GIVEN** a pool with a 7-day forecast showing 3 recommended dose events
- **WHEN** the user views the pool dashboard
- **THEN** they see a line chart with FC declining in sawtooth pattern (decline → dose → jump → decline), with green target band and red minimum line

#### Next Action Card

The most prominent UI element MUST be a **"Next Action" card** showing:

- What to do: "Add chlorine" / "Test water" / "All good"
- When: "Today by 6 PM" / "Tomorrow morning" / "In 3 days"
- How much: "48 fl oz (3 pints) of 12.5% liquid chlorine"
- Why: "FC will drop below 3.0 ppm by tomorrow afternoon"

#### Scenario: Next action - dose needed soon

- **GIVEN** the forecast predicts FC dropping below minimum in 8 hours
- **WHEN** the user views the dashboard
- **THEN** the Next Action card shows: priority = urgent (red), action = "Add 32 fl oz of liquid chlorine by this evening", reason = "FC estimated at 2.1 ppm — below minimum of 3.0 for CYA 40"

#### Scenario: Next action - all good

- **GIVEN** the forecast shows FC staying in range for 4+ days
- **WHEN** the user views the dashboard
- **THEN** the Next Action card shows: priority = info (green), action = "Next chlorination: Thursday evening", reason = "FC is 5.2 ppm — on track"

#### Scenario: Next action - test needed

- **GIVEN** the last FC test was more than 3 days ago
- **WHEN** the user views the dashboard
- **THEN** the Next Action card shows: priority = warning (yellow), action = "Test your water", reason = "Last test was 4 days ago — test to update your forecast"

### Stale Test Handling

The app MUST handle aging test data appropriately.

- Tests less than 24 hours old: forecast starts from test value with high confidence
- Tests 1-3 days old: forecast starts from decayed value with moderate confidence
- Tests more than 3 days old: the app MUST prompt the user to retest
- Tests more than 7 days old: the app SHOULD mark the forecast as "unreliable" and show the retest prompt prominently

#### Scenario: Stale test warning

- **GIVEN** the last FC test is 5 days old
- **WHEN** the user views the forecast
- **THEN** the forecast chart shows with a "Low confidence" badge, and a banner says "Your last test was 5 days ago. Test your water for a more accurate forecast."

### CYA Accumulation Warnings

For pools using trichlor or dichlor, the app MUST project CYA accumulation from dosing.

- Each dose event in the schedule MUST include projected CYA increase
- The app MUST warn when projected CYA will exceed 80 ppm
- The app SHOULD recommend switching to liquid chlorine when CYA is above 60 ppm
- The app MUST calculate the dilution needed (partial drain + refill) to bring CYA back to target

#### Scenario: CYA creep warning

- **GIVEN** a pool with CYA = 55 using trichlor, and the weekly dosing schedule adds ~4 ppm CYA per week
- **WHEN** the user views the forecast
- **THEN** a warning shows: "CYA projected to reach 71 ppm in 4 weeks. Consider switching to liquid chlorine or draining 25% and refilling."

### Multi-Parameter Monitoring

While the primary forecast is for FC, the app SHOULD also track and alert on other parameters:

- **pH drift:** If the last pH test was out of range, show a persistent reminder
- **TA check:** If TA hasn't been tested in 30 days, suggest testing
- **CH check:** If CH hasn't been tested in 60 days, suggest testing
- **LSI alert:** If the computed LSI from the last comprehensive test is out of range, show a warning

These are secondary to the FC forecast and SHOULD be displayed below the main forecast section.

#### Scenario: pH reminder

- **GIVEN** the last pH test showed 7.8 (above ideal range)
- **WHEN** the user views the dashboard
- **THEN** below the forecast, a card shows: "pH was 7.8 — above target of 7.2-7.6. Add muriatic acid to lower."

## Design

### Architecture

```
┌──────────────────────────────────────────────────┐
│                Forecast Pipeline                  │
│                                                   │
│  ┌──────────┐   ┌──────────────┐   ┌──────────┐ │
│  │  Latest   │   │ Sun Exposure │   │  Decay   │ │
│  │  Tests    │   │   Engine     │   │  Model   │ │
│  └─────┬────┘   └──────┬───────┘   └────┬────���┘ │
│        │               │                │        │
│        └───────┬───────┘                │        │
│                │                         │        │
│         ┌──────┴─────────────────────────┘        │
│         │       Hourly Simulation Loop            │
│         │  FC(h+1) = FC(h) × exp(-k × 1)        │
│         └──────────┬─────────────────────┘        │
│                    │                              │
│         ┌──────────┴──────────┐                   │
│         │  Dose Scheduler     │                   │
│         │  (find when FC<min, │                   │
│         │   calculate doses)  │                   │
│         └──────────┬──────────┘                   │
│                    │                              │
│         ┌──────────┴──────────┐                   │
│         │  ForecastResult     │                   │
│         └─────────────────────┘                   │
└──────────────────────────────────────────────────┘
```

### Data Models

```typescript
interface ForecastResult {
  poolId: string
  generatedAt: string                // ISO 8601
  startFc: number                    // FC at forecast start (from test or estimate)
  startTime: string                  // ISO 8601
  confidence: "high" | "moderate" | "low"  // Based on test freshness
  hourly: ForecastHour[]             // 168 entries (7 days × 24 hours)
  doseEvents: DoseEvent[]
  nextAction: NextAction
  warnings: ForecastWarning[]
}

interface ForecastHour {
  time: string                       // ISO 8601
  predictedFc: number                // ppm
  kTotal: number                     // total decay rate for this hour
  kUv: number                        // UV component
  kDemand: number                    // demand component
  effectiveGhi: number               // W/m² after tree cover
  temperatureC: number
  isDaytime: boolean
}

interface DoseEvent {
  time: string                       // ISO 8601 — when to dose
  fcBefore: number                   // predicted FC just before dosing
  fcAfter: number                    // FC after dosing (target)
  ppmToAdd: number                   // ppm of chlorine to add
  productAmount: string              // human-readable, e.g., "32 fl oz"
  productAmountMl: number            // machine-readable milliliters
  cyaIncrease: number                // ppm CYA added (0 for liquid/cal-hypo/swg)
}

interface NextAction {
  type: "dose" | "test" | "ok"
  priority: "info" | "warning" | "urgent"
  title: string                      // e.g., "Add chlorine by this evening"
  description: string                // e.g., "FC will drop below 3.0 ppm..."
  doseEvent?: DoseEvent              // if type = "dose"
}

interface ForecastWarning {
  type: "cya_high" | "cya_rising" | "ph_out_of_range" | "stale_test" | "lsi_imbalanced" | "no_cya_test"
  severity: "info" | "warning" | "urgent"
  title: string
  description: string
}
```

### UI Components

| Component | Location | Description |
|-----------|----------|-------------|
| `ForecastDashboard` | `features/forecast/` | Main container for pool detail forecast view |
| `NextActionCard` | `features/forecast/` | Prominent card showing what to do next |
| `ForecastChart` | `features/forecast/` | 7-day FC line chart with target band and dose markers |
| `DoseSchedule` | `features/forecast/` | List of upcoming dose events with amounts |
| `ChemistryStatusBar` | `features/forecast/` | Compact bar showing FC, pH, CYA status indicators |
| `WarningBanner` | `features/forecast/` | Dismissible warning for stale tests, CYA creep, etc. |
| `ParameterAlerts` | `features/forecast/` | Secondary alerts for pH, TA, CH, LSI |

### Business Logic

Core functions in `lib/chemistry/forecast.ts`:

1. `generateForecast(pool, tests, sunExposure)` → `ForecastResult`
2. `simulateHourly(startFc, hours, decayParams, sunData)` → `ForecastHour[]`
3. `findDoseEvents(hourly, minFc, targetFc, pool)` → `DoseEvent[]`
4. `determineNextAction(forecast, lastTestTime)` → `NextAction`
5. `generateWarnings(pool, tests, forecast)` → `ForecastWarning[]`

All core simulation functions MUST be pure and tested. The `generateForecast` orchestrator ties them together.

## Constraints

- **Performance:** The hourly simulation (168 iterations) MUST complete in under 50ms on a mid-range mobile device. This is simple arithmetic — should not be a problem.
- **Accuracy disclaimer:** The app SHOULD include a subtle disclaimer: "Forecasts are estimates based on weather data and chemistry models. Always verify with actual water tests."
- **Responsive design:** The forecast chart MUST be readable on mobile screens (min width 320px). The chart SHOULD be horizontally scrollable if needed.
- **No notifications:** The app MUST NOT send push notifications in v1. The "next action" is visible when the user opens the app. Push notifications MAY be added later as a PWA feature.

## Open Questions

- **Multiple dose strategies:** Should the app suggest different strategies (e.g., "dose once with 64 oz" vs "dose twice with 32 oz each")? The simpler "dose when needed" approach is better for v1.
- **Evening dosing preference:** Many pool owners prefer to dose in the evening (less UV loss, chlorine works overnight). Should the app default to recommending evening doses? Probably yes — worth implementing as a default with a "dosing time preference" setting on the pool.
- **SWG runtime calculation:** For salt water generators, the "dose" is expressed as runtime hours rather than product amount. This requires knowing the SWG's chlorine output rate, which varies by model. Deferred — SWG pools can use a simplified "adjust runtime" recommendation.

## References

- [Trouble Free Pool: Pool Math](https://www.troublefreepool.com/blog/pool-math/) — Inspiration for pool chemistry calculators
- [PoolMath App](https://www.troublefreepool.com/blog/poolmath/) — Existing pool chemistry app (dosing only, no forecasting)
- Recharts documentation for chart implementation
- Related specs: [Water Chemistry](../water-chemistry/), [Sun Exposure](../sun-exposure/), [Pool Management](../pool-management/), [Architecture](../architecture/)

## Changelog

| Date | Change | Document |
|------|--------|----------|
| 2026-04-18 | Initial spec created | — |
