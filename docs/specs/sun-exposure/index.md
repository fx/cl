# Sun Exposure

## Overview

The sun exposure engine calculates effective solar radiation for a pool's location, combining astronomical sun position data (via SunCalc), weather forecasts and solar irradiance data (via Open-Meteo), and user-provided tree cover estimates. The output — **effective sun hours per day** — is the primary environmental input to the chlorine decay model. All calculations MUST run client-side with no backend.

## Background

UV radiation is the dominant factor in outdoor chlorine degradation. Unstabilized chlorine has a half-life of ~35 minutes in direct sunlight, while CYA-stabilized chlorine lasts 5-8 hours. Accurately estimating sun exposure is critical for predicting when chlorine levels will drop below target and when the pool owner needs to dose.

The engine must account for:
- **Latitude/season:** Determines daylight hours and sun angle (a pool in Phoenix gets dramatically more UV than one in Seattle)
- **Cloud cover:** Overcast skies reduce UV by 40-75%
- **Tree canopy:** Shade from nearby trees can reduce UV by 15-95% depending on density
- **Forecast vs historical:** Use forecasts for the upcoming week, fall back to seasonal averages when forecasts are unavailable

Related specs: [Architecture](../architecture/), [Pool Management](../pool-management/), [Water Chemistry](../water-chemistry/), [Chemistry Forecast](../chemistry-forecast/)

## Requirements

### Sun Position Calculation

The app MUST calculate sun position using the **SunCalc** library (`suncalc` npm package, ~3KB).

- The app MUST compute sunrise and sunset times for each day in the forecast window
- The app MUST compute solar noon and total daylight hours
- The app SHOULD compute sun altitude at hourly intervals for UV intensity weighting
- All times MUST be in the pool's local timezone (derived from coordinates)

#### Scenario: Daylight hours calculation

- **GIVEN** a pool at (33.4484, -112.0740) on June 21, 2026
- **WHEN** the sun exposure engine runs
- **THEN** it calculates ~14.3 hours of daylight (sunrise ~5:20, sunset ~19:44 local)

#### Scenario: Winter vs summer

- **GIVEN** a pool at (47.6062, -122.3321) — Seattle
- **WHEN** comparing June 21 vs December 21
- **THEN** daylight hours differ dramatically (~16h vs ~8.5h), and the forecast reflects this

### Solar Radiation Data

The app MUST fetch solar radiation data from the **Open-Meteo API**.

**Endpoint:** `https://api.open-meteo.com/v1/forecast`

**Required parameters:**
- `latitude`, `longitude` — pool coordinates
- `hourly=shortwave_radiation,direct_radiation,diffuse_radiation,cloud_cover,uv_index,uv_index_clear_sky,temperature_2m`
- `forecast_days=7` — one week lookahead
- `timezone=auto` — use server-detected timezone for the coordinates

**Response fields used:**

| Field | Unit | Purpose |
|-------|------|---------|
| `shortwave_radiation` | W/m² | Global Horizontal Irradiance (GHI) |
| `direct_radiation` | W/m² | Direct Normal Irradiance component |
| `diffuse_radiation` | W/m² | Diffuse irradiance (scattered by atmosphere) |
| `cloud_cover` | % | Cloud coverage for UV reduction |
| `uv_index` | 0-11+ | UV index (already accounts for clouds) |
| `uv_index_clear_sky` | 0-11+ | Theoretical max UV without clouds |
| `temperature_2m` | °C | Air temperature (feeds into decay model) |

- The app MUST fetch data for the full 7-day forecast window
- The app MUST cache API responses in memory (Zustand store, non-persisted)
- The app SHOULD refresh data no more than once per hour per pool
- The app MUST handle API errors gracefully (see fallback requirements)

#### Scenario: Fetch solar data

- **GIVEN** a pool at (33.4484, -112.0740)
- **WHEN** the sun exposure engine initializes
- **THEN** it calls Open-Meteo with the correct parameters and receives hourly data for 7 days

#### Scenario: Rate limiting

- **GIVEN** solar data was fetched 30 minutes ago
- **WHEN** the user navigates back to the pool detail
- **THEN** the cached data is used without making a new API call

### Peak Sun Hours Calculation

The app MUST convert raw solar radiation into **Peak Sun Hours (PSH)** — the equivalent hours of 1000 W/m² solar intensity.

```
daily_PSH = sum(hourly_shortwave_radiation) / 1000
```

Where `hourly_shortwave_radiation` is in W/m² and each reading covers one hour.

- PSH MUST be calculated per day for the 7-day forecast
- Typical values: 3-4 PSH (northern US winter) to 7-8 PSH (southern US summer)

#### Scenario: PSH calculation

- **GIVEN** hourly GHI data for a sunny June day in Phoenix totaling 7,200 Wh/m²
- **WHEN** PSH is calculated
- **THEN** the result is 7.2 PSH

### Cloud Cover Adjustment

Open-Meteo's `shortwave_radiation` already incorporates cloud cover, so explicit cloud adjustment is NOT needed when using GHI directly. However, the app MUST store and display cloud cover percentage for user context.

- When GHI data is available, the app MUST use it directly (already cloud-adjusted)
- When falling back to clear-sky estimates, the app MUST apply a cloud modification factor:

```
CMF = 1 - 0.6 × (cloud_cover / 100)
```

Where `cloud_cover` is the average daily cloud cover percentage (0-100).

#### Scenario: Overcast day

- **GIVEN** a day with average 80% cloud cover and no GHI data available
- **WHEN** the fallback model estimates solar exposure
- **THEN** CMF = 1 - 0.6 × 0.8 = 0.52 (48% reduction from clear sky)

### Tree Cover Reduction

The app MUST apply a tree canopy reduction factor to the effective solar exposure.

```
tree_factor = 1 - (canopy_percent / 100) ^ 0.7
```

This power-law model reflects that sparse canopy transmits proportionally more light than dense canopy blocks:

| Canopy % | Tree Factor | Effective Reduction |
|----------|-------------|---------------------|
| 0%       | 1.00        | None                |
| 10%      | 0.80        | 20%                 |
| 25%      | 0.63        | 37%                 |
| 50%      | 0.39        | 61%                 |
| 75%      | 0.21        | 79%                 |
| 90%      | 0.10        | 90%                 |
| 100%     | 0.00        | 100%                |

- The `canopy_percent` MUST come from the pool's `treeCoverPercent` property
- Indoor pools (`isIndoor = true`) MUST have tree factor set to 0 AND sun exposure set to 0 (no UV degradation)

#### Scenario: Partial shade

- **GIVEN** a pool with 40% tree cover and 6.5 raw PSH
- **WHEN** effective sun hours are calculated
- **THEN** tree_factor = 1 - (0.4)^0.7 ≈ 0.48, effective PSH = 6.5 × 0.48 ≈ 3.1

#### Scenario: Indoor pool

- **GIVEN** a pool marked as indoor
- **WHEN** the sun exposure engine runs
- **THEN** effective sun hours = 0 for all days, and the chlorine decay model uses only chemical demand (no UV component)

### Effective Sun Hours Output

The final output of the sun exposure engine is **effective sun hours per day** for each day in the forecast window.

```
effective_sun_hours = PSH × tree_factor
```

This value MUST be:
- Computed for each of the 7 forecast days
- Available as both hourly breakdown and daily summary
- Passed to the chlorine decay model in the [Chemistry Forecast](../chemistry-forecast/) spec
- Displayed to the user in the pool detail view

#### Scenario: Full pipeline

- **GIVEN** a pool at (33.4484, -112.0740) with 25% tree cover on a clear June day
- **WHEN** the engine computes:
  - SunCalc: sunrise 5:20, sunset 19:44 (14.4h daylight)
  - Open-Meteo: 7,500 Wh/m² GHI → 7.5 PSH
  - Tree factor: 1 - (0.25)^0.7 = 0.63
- **THEN** effective sun hours = 7.5 × 0.63 = 4.7 hours

### Fallback and Degradation

The app MUST remain functional when external APIs are unavailable.

**Fallback chain:**
1. **Fresh API data** (< 1 hour old) — use directly
2. **Stale API data** (> 1 hour, < 24 hours) — use with a staleness indicator in the UI
3. **No API data** — fall back to latitude-based seasonal estimates:

```
estimated_PSH = 12 × sin(max_sun_altitude) × day_length_fraction × 0.75
```

Where `max_sun_altitude` comes from SunCalc (always available, no API needed) and `0.75` is an average cloud factor.

- The UI MUST indicate when using fallback data (e.g., "Using estimated solar data — weather data unavailable")

#### Scenario: Offline operation

- **GIVEN** the user is offline
- **WHEN** they view a pool's forecast
- **THEN** the app uses SunCalc (works offline) for daylight hours and the latitude-based estimate for PSH, with a clear indicator that weather data is unavailable

## Design

### Architecture

```
┌─────────────────────────────────────────┐
│           Sun Exposure Engine            │
│                                          │
│  ┌──────────┐  ┌────────────────────┐   │
│  │ SunCalc  │  │  Open-Meteo Client │   │
│  │(sunrise, │  │  (GHI, UV, cloud,  │   │
│  │ sunset,  │  │   temperature)     │   │
│  │ altitude)│  └─────────┬──────────┘   │
│  └────┬─────┘            │              │
│       │            ┌─────┴──────┐       │
│       └────────┐   │ API Cache  │       │
│                │   └─────┬──────┘       │
│          ┌─────┴─────────┴──────┐       │
│          │   Exposure Calculator │       │
│          │  PSH × tree_factor   │       │
│          └──────────┬───────────┘       │
│                     │                    │
│          ┌──────────┴───────────┐       │
│          │  SunExposureResult   │       │
│          │  (per-day, per-hour) │       │
│          └──────────────────────┘       │
└─────────────────────────────────────────┘
```

### Data Models

```typescript
interface SunExposureResult {
  poolId: string
  fetchedAt: string                    // ISO 8601
  dataSource: "api" | "cached" | "fallback"
  daily: DailySunExposure[]
}

interface DailySunExposure {
  date: string                         // YYYY-MM-DD
  sunrise: string                      // ISO 8601 datetime
  sunset: string                       // ISO 8601 datetime
  daylightHours: number                // decimal hours
  peakSunHours: number                 // PSH before tree adjustment
  effectiveSunHours: number            // PSH after tree adjustment
  avgCloudCover: number                // 0-100 %
  maxUvIndex: number                   // 0-11+
  avgTemperatureC: number              // degrees Celsius
  hourly: HourlySunData[]
}

interface HourlySunData {
  hour: number                         // 0-23
  ghiWm2: number                       // W/m² (shortwave radiation)
  uvIndex: number
  cloudCover: number                   // 0-100 %
  temperatureC: number
  sunAltitudeDeg: number               // degrees above horizon
}
```

### API Surface

**Open-Meteo request builder:**

```typescript
function buildOpenMeteoUrl(lat: number, lng: number): string {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    hourly: [
      "shortwave_radiation",
      "direct_radiation",
      "diffuse_radiation",
      "cloud_cover",
      "uv_index",
      "uv_index_clear_sky",
      "temperature_2m",
    ].join(","),
    forecast_days: "7",
    timezone: "auto",
  })
  return `https://api.open-meteo.com/v1/forecast?${params}`
}
```

### Business Logic

**Core calculation pipeline** (pure functions in `lib/solar/`):

1. `getSunTimes(date, lat, lng)` → sunrise, sunset, daylight hours (SunCalc wrapper)
2. `fetchSolarData(lat, lng)` → raw Open-Meteo response
3. `calculatePSH(hourlyGhi: number[])` → Peak Sun Hours for one day
4. `calculateTreeFactor(canopyPercent: number)` → reduction multiplier
5. `calculateEffectiveSunHours(psh: number, treeFactor: number)` → final value
6. `computeSunExposure(pool: Pool)` → full `SunExposureResult` (orchestrator)

All functions except `fetchSolarData` MUST be pure and synchronous for easy testing.

## Constraints

- **No API keys:** Open-Meteo MUST be the primary solar/weather data source (free, no key, CORS-enabled)
- **Rate limiting:** The app MUST NOT call Open-Meteo more than once per pool per hour
- **Offline math:** SunCalc calculations MUST work with zero network connectivity
- **Accuracy:** The effective sun hours model is an approximation. The app SHOULD note this in the UI (e.g., "Estimated based on weather forecast and shade settings")
- **Timezone handling:** All displayed times MUST be in the pool's local timezone. The `timezone=auto` parameter in Open-Meteo handles this

## Open Questions

- **Hourly vs daily granularity for decay model:** Should the chemistry forecast use hourly effective radiation (more accurate but complex) or daily effective sun hours (simpler)? Recommend starting with daily, adding hourly later if precision matters.
- **Historical solar averages:** Should the app fetch NASA POWER climatology data as a baseline for locations? This would improve the offline fallback but adds API complexity. Deferred.

## References

- [SunCalc](https://github.com/mourner/suncalc) — Sun position library by Vladimir Agafonkin
- [Open-Meteo API Docs](https://open-meteo.com/en/docs) — Weather and solar radiation API
- [NASA POWER](https://power.larc.nasa.gov/) — Solar climatology (potential future data source)
- [Peak Sun Hours Explained](https://www.solar.com/learn/peak-sun-hours/) — PSH methodology
- Related specs: [Pool Management](../pool-management/), [Water Chemistry](../water-chemistry/), [Chemistry Forecast](../chemistry-forecast/)

## Changelog

| Date | Change | Document |
|------|--------|----------|
| 2026-04-18 | Initial spec created | — |
