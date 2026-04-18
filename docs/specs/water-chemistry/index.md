# Water Chemistry

## Overview

The water chemistry feature models pool chemistry parameters, records water test results over time, calculates chlorine decay rates, and computes dosing recommendations. It provides the mathematical core of cl — translating physical pool properties, environmental conditions, and test history into actionable chemistry predictions. All models MUST run client-side as pure functions.

## Background

Pool chemistry revolves around maintaining sanitizer (chlorine) at effective levels while keeping water balanced (pH, alkalinity, calcium). The key challenge is that chlorine continuously degrades — primarily from UV exposure (see [Sun Exposure](../sun-exposure/)) and secondarily from temperature, bather load, and organic matter. CYA (cyanuric acid) dramatically slows UV decay but reduces the fraction of chlorine that is actively sanitizing.

The FC/CYA relationship is the most important concept in pool chemistry: maintaining free chlorine at ~7.5% of CYA level ensures adequate sanitation despite CYA's chlorine-binding effect.

- Related specs: [Pool Management](../pool-management/), [Sun Exposure](../sun-exposure/), [Chemistry Forecast](../chemistry-forecast/)

## Requirements

### Chemistry Parameters

The app MUST track the following water chemistry parameters:

#### Primary Parameters (MUST track)

| Parameter | Abbrev | Unit | Ideal Range | Description |
|-----------|--------|------|-------------|-------------|
| Free Chlorine | FC | ppm | CYA-dependent (see table) | Active sanitizer; the most critical parameter |
| Combined Chlorine | CC | ppm | 0 - 0.5 | Chloramines; FC that has reacted with nitrogen compounds |
| pH | pH | — | 7.2 - 7.6 | Acidity/alkalinity; affects chlorine efficacy and comfort |
| Cyanuric Acid | CYA | ppm | 30 - 50 (outdoor) | UV stabilizer; binds with chlorine to slow photolysis |
| Total Alkalinity | TA | ppm | 80 - 120 | pH buffer; prevents rapid pH swings |
| Calcium Hardness | CH | ppm | 200 - 400 | Prevents corrosion (low) or scaling (high) |

#### Secondary Parameters (SHOULD track)

| Parameter | Abbrev | Unit | Ideal Range | Description |
|-----------|--------|------|-------------|-------------|
| Water Temperature | Temp | °F | 78 - 82 | Affects reaction rates and bather comfort |
| Total Dissolved Solids | TDS | ppm | < 2000 | Indicator of water freshness; high TDS → drain/refill |
| Salt | Salt | ppm | 2700 - 3400 | SWG pools only |
| Phosphates | PO₄ | ppb | < 200 | Algae nutrient; not universally tracked |

#### Derived Parameters (MUST compute)

| Parameter | Formula | Ideal |
|-----------|---------|-------|
| Total Chlorine (TC) | FC + CC | Close to FC |
| FC/CYA Ratio | FC / CYA | ≥ 0.075 (7.5%) |
| Langelier Saturation Index (LSI) | See formula below | -0.3 to +0.3 |

#### Scenario: Parameter out of range

- **GIVEN** a water test with pH = 7.9
- **WHEN** the app displays the test result
- **THEN** pH is highlighted as out-of-range (above 7.6) with a recommendation to add acid

### FC/CYA Relationship

The app MUST enforce and display the FC/CYA minimum ratio. The minimum FC MUST be calculated as:

```
minimum_FC = max(CYA × 0.075, 1.0)
```

The full FC/CYA target table:

| CYA (ppm) | Min FC (ppm) | Target FC Range | SLAM Level |
|------------|-------------|-----------------|------------|
| 0          | 1           | 1 - 3           | 10         |
| 20         | 2           | 3 - 5           | 10         |
| 30         | 2           | 4 - 6           | 12         |
| 40         | 3           | 5 - 7           | 16         |
| 50         | 4           | 6 - 8           | 20         |
| 60         | 5           | 7 - 9           | 24         |
| 70         | 5           | 8 - 10          | 28         |
| 80         | 6           | 9 - 11          | 31         |
| 100        | 8           | 11 - 13         | 39         |

- The app MUST interpolate between table values for CYA levels not listed
- If no CYA test exists, the app SHOULD assume CYA = 0 (worst-case) and prompt the user to test CYA
- SLAM level = CYA × 0.39 (rounded up), minimum 10

#### Scenario: FC below minimum for CYA

- **GIVEN** a pool with CYA = 50 and FC = 3.0
- **WHEN** the app evaluates chemistry status
- **THEN** it flags FC as below minimum (4.0 for CYA 50) and recommends immediate chlorination

#### Scenario: Auto-target FC

- **GIVEN** a pool with CYA = 40 and no manual FC target set
- **WHEN** the app computes the target
- **THEN** target FC = midpoint of range = 6.0 ppm

### Chlorine Decay Model

The app MUST model chlorine decay using **first-order kinetics**:

```
FC(t) = FC_0 × exp(-k × t)
```

Where:
- `FC(t)` = free chlorine at time `t` (ppm)
- `FC_0` = initial free chlorine (ppm)
- `k` = composite decay rate constant (h⁻¹)
- `t` = time in hours

The composite decay constant `k` MUST account for both UV and non-UV decay:

```
k = k_uv + k_demand
```

#### UV Decay Component (`k_uv`)

UV decay depends on CYA level and effective sun exposure:

```
k_uv = k_uv_base × sun_intensity_factor
```

Where:
- `k_uv_base` varies by CYA level:

| CYA (ppm) | k_uv_base (h⁻¹) | Half-Life in Sun |
|------------|-------------------|------------------|
| 0          | 1.2               | ~35 min          |
| 10         | 0.5               | ~1.4 h           |
| 30         | 0.14              | ~5 h             |
| 50         | 0.09              | ~7.7 h           |
| 80         | 0.07              | ~10 h            |

- `sun_intensity_factor` = ratio of current hour's effective GHI to a reference 1000 W/m² (from [Sun Exposure](../sun-exposure/) engine). At night, this factor is 0.

The app SHOULD interpolate `k_uv_base` linearly between table values.

#### Chemical Demand Component (`k_demand`)

Non-UV chlorine demand from temperature, organics, and bather load:

```
k_demand = k_demand_base × temperature_factor
```

Where:
- `k_demand_base` = 0.02 h⁻¹ (empirical baseline for a well-maintained residential pool)
- `temperature_factor` = Arrhenius-based scaling:

```
temperature_factor = exp((E_a / R) × (1/T_ref - 1/T))
```

Where:
- `E_a` = 76,000 J/mol (activation energy for pool water chlorine decay)
- `R` = 8.314 J/(mol·K) (gas constant)
- `T_ref` = 298.15 K (25°C / 77°F reference)
- `T` = water temperature in Kelvin

Practical approximation: decay rate roughly doubles per 10°C increase.

| Water Temp | Temp Factor | Effective k_demand |
|------------|-------------|-------------------|
| 65°F (18°C) | 0.5       | 0.010 h⁻¹         |
| 77°F (25°C) | 1.0       | 0.020 h⁻¹         |
| 85°F (29°C) | 1.6       | 0.032 h⁻¹         |
| 95°F (35°C) | 2.8       | 0.056 h⁻¹         |

#### Scenario: Daytime chlorine decay

- **GIVEN** a pool with FC = 5.0, CYA = 30, water temp = 85°F, effective GHI = 800 W/m²
- **WHEN** the decay model runs for 4 hours of sun
- **THEN** k_uv = 0.14 × (800/1000) = 0.112, k_demand = 0.02 × 1.6 = 0.032, k = 0.144, FC(4) = 5.0 × exp(-0.144 × 4) ≈ 2.8 ppm

#### Scenario: Overnight chlorine decay

- **GIVEN** a pool with FC = 4.0, CYA = 50, water temp = 80°F at 8 PM
- **WHEN** the decay model runs for 10 hours overnight (no sun)
- **THEN** k_uv = 0 (nighttime), k_demand ≈ 0.025, FC(10) = 4.0 × exp(-0.025 × 10) ≈ 3.1 ppm

### Learned Decay Rate

The app SHOULD learn a pool's actual decay rate from test history, improving predictions over time.

- Given two FC tests separated by time `Δt`, the observed decay constant is:

```
k_observed = -ln(FC_2 / FC_1) / Δt
```

- The app SHOULD compute a rolling average of the last 5-10 observed decay constants
- The learned rate SHOULD be blended with the theoretical model:

```
k_effective = α × k_observed_avg + (1 - α) × k_model
```

Where `α` starts at 0 (pure model) and increases toward 0.7 as more test data accumulates (after ~5 paired tests).

#### Scenario: Learning from tests

- **GIVEN** a pool with 6 FC tests over 2 weeks showing consistent k_observed ≈ 0.10
- **WHEN** the model predicts decay
- **THEN** it blends: k = 0.7 × 0.10 + 0.3 × k_model, weighting observed data

### Water Test Logging

The app MUST allow users to log water test results.

- Each test MUST record a timestamp (defaults to now, user MAY backdate)
- Each test MUST record at least one parameter (typically FC and pH at minimum)
- All parameters are OPTIONAL — users test different things at different times
- Tests MUST be associated with a specific pool
- Tests MUST be persisted to localStorage

```typescript
interface WaterTest {
  id: string                    // crypto.randomUUID()
  poolId: string
  testedAt: string              // ISO 8601
  createdAt: string             // ISO 8601

  // Primary (all optional — user logs what they test)
  fc?: number                   // Free chlorine (ppm)
  cc?: number                   // Combined chlorine (ppm)
  ph?: number                   // pH
  cya?: number                  // Cyanuric acid (ppm)
  ta?: number                   // Total alkalinity (ppm)
  ch?: number                   // Calcium hardness (ppm)

  // Secondary
  tempF?: number                // Water temperature (°F)
  tds?: number                  // Total dissolved solids (ppm)
  salt?: number                 // Salt (ppm)
  phosphates?: number           // Phosphates (ppb)

  // Context
  notes?: string                // Free-text notes
}
```

#### Scenario: Quick FC/pH test

- **GIVEN** the user just tested their pool with a test strip
- **WHEN** they log FC = 3.5 and pH = 7.4
- **THEN** a test result is created with those two values, all other fields null, timestamp = now

#### Scenario: Comprehensive test

- **GIVEN** the user took a sample to a pool store for full analysis
- **WHEN** they log FC = 4.0, CC = 0.2, pH = 7.3, CYA = 45, TA = 90, CH = 280
- **THEN** all values are stored, TC is derived as 4.2, FC/CYA ratio is computed as 8.9%

### Test History View

The app MUST display test history for each pool.

- Tests MUST be listed in reverse chronological order
- Each test MUST show the date and all logged parameters
- Out-of-range values MUST be visually highlighted (color-coded)
- The app SHOULD show a simple trend chart for FC and pH over time (using @fx/ui Chart / Recharts)

#### Scenario: Trend display

- **GIVEN** a pool with 10 FC tests over 3 weeks
- **WHEN** the user views test history
- **THEN** they see a line chart showing FC values over time with the target range shaded

### Dosing Calculator

The app MUST calculate how much chlorine product to add to reach a target FC level.

**Core formula:**

```
product_oz = (volume_gal × ppm_increase) / (strength_factor × 10)
```

**Dosing constants by chlorine source** (amount per +1 ppm per 10,000 gallons):

| Source | Available Cl | Fl oz / +1 ppm / 10K gal | CYA added / 10 ppm Cl |
|--------|-------------|--------------------------|----------------------|
| Liquid 12.5% | 12.5% | 10.7 fl oz | 0 ppm |
| Liquid 8.25% | 8.25% | 16.2 fl oz | 0 ppm |
| Liquid 6% | 6.0% | 22.3 fl oz | 0 ppm |
| Cal-hypo | 65% | 2.0 oz (weight) | 0 ppm |
| Dichlor | 56% | 2.4 oz (weight) | ~9 ppm |
| Trichlor | 90% | 1.5 oz (weight) | ~6 ppm |
| SWG | varies | N/A (runtime hours) | 0 ppm |

- The app MUST use the pool's configured `chlorineSource` for calculations
- The app MUST display amounts in user-friendly units (fluid ounces for liquid, ounces by weight for granular, gallons for large amounts)
- The app MUST convert to larger units when appropriate (e.g., display "1.2 gallons" not "153.6 fl oz")
- When using dichlor or trichlor, the app MUST warn about CYA accumulation and show the projected CYA increase

#### Scenario: Liquid chlorine dosing

- **GIVEN** a 15,000 gallon pool using 12.5% liquid chlorine with current FC = 2.0 and target FC = 5.0
- **WHEN** the dosing calculator runs
- **THEN** ppm_increase = 3.0, product = (15000 × 3.0) / (12.5 × 10) = 360 fl oz = 2.8 gallons... Actually:
  - Per 10K gal for +1 ppm = 10.7 fl oz
  - For 15K gal and +3 ppm = 10.7 × 1.5 × 3 = 48.2 fl oz ≈ 3 pints

#### Scenario: Trichlor with CYA warning

- **GIVEN** a pool with CYA = 60 using trichlor tablets
- **WHEN** the user doses to add 5 ppm FC
- **THEN** the app shows the dosing amount AND warns: "This will add ~3 ppm CYA (projected CYA: 63 ppm). Consider switching to liquid chlorine to avoid CYA buildup."

### Langelier Saturation Index

The app MUST compute the LSI to assess water balance:

```
LSI = pH - pH_s
```

Where:

```
pH_s = (9.3 + A + B) - (C + D)
A = (log10(TDS) - 1) / 10        // Use 1000 if TDS unknown
B = -13.12 × log10(T_K) + 34.55  // T_K = temperature in Kelvin
C = log10(CH) - 0.4              // CH = Calcium Hardness as CaCO3
D = log10(TA)                     // TA = Total Alkalinity as CaCO3
```

| LSI | Interpretation | UI Indicator |
|-----|----------------|-------------|
| < -0.3 | Corrosive | Red (low) |
| -0.3 to +0.3 | Balanced | Green |
| > +0.3 | Scale-forming | Red (high) |

- The app MUST display LSI when pH, TA, CH, and temperature are all available
- The app SHOULD show which direction to adjust (e.g., "Raise pH" or "Lower calcium") when out of balance

#### Scenario: LSI calculation

- **GIVEN** pH = 7.4, TA = 100, CH = 300, Temp = 82°F, TDS = 1000
- **WHEN** LSI is computed
- **THEN** a value near 0.0 is returned (balanced), displayed with green indicator

### Breakpoint Chlorination

The app MUST calculate shock dosing when combined chlorine is elevated:

```
shock_dose_ppm = CC × 10
```

- The app MUST recommend shock when CC > 0.5 ppm
- The shock target MUST be at least the SLAM level for the current CYA
- The app SHOULD explain the purpose: "Combined chlorine (chloramines) is elevated. Shock to break point to eliminate."

#### Scenario: Shock recommendation

- **GIVEN** FC = 3.0, CC = 1.0, CYA = 40
- **WHEN** the app evaluates chemistry
- **THEN** it recommends shocking: target FC = max(CC × 10, SLAM for CYA 40) = max(10, 16) = 16 ppm. Dose to add: 16 - 3 = 13 ppm.

## Design

### Data Models

See `WaterTest` interface above and [Pool Management](../pool-management/) for `Pool` type.

Additional computed types:

```typescript
interface ChemistryStatus {
  poolId: string
  computedAt: string
  currentFc: number | null           // Most recent or estimated
  currentPh: number | null
  currentCya: number | null
  fcStatus: "ok" | "low" | "critical" | "high"
  phStatus: "ok" | "low" | "high"
  lsi: number | null
  lsiStatus: "corrosive" | "balanced" | "scaling" | null
  fcCyaRatio: number | null
  recommendations: Recommendation[]
}

interface Recommendation {
  type: "dose" | "shock" | "test" | "warning"
  priority: "info" | "warning" | "urgent"
  title: string
  description: string
  productAmount?: string             // e.g., "48 fl oz of 12.5% liquid chlorine"
}

interface DecayParameters {
  kUvBase: number                    // h⁻¹, from CYA level
  kDemand: number                    // h⁻¹, from temperature
  kObservedAvg: number | null        // h⁻¹, learned from test pairs
  kEffective: number                 // h⁻¹, blended
  alpha: number                      // blend weight (0 to 0.7)
}
```

### Business Logic

Core functions in `lib/chemistry/`:

1. `calculateFcTarget(cya: number)` → `{ min, target, max, slamLevel }`
2. `calculateDecayRate(cya, tempF, effectiveGhi)` → `DecayParameters`
3. `predictFc(fc0, k, hours)` → predicted FC at time t
4. `calculateDose(volumeGal, currentFc, targetFc, source)` → product amount + units
5. `calculateLsi(ph, ta, ch, tempF, tds)` → LSI value
6. `calculateShockDose(fc, cc, cya, volumeGal, source)` → shock product amount
7. `learnDecayRate(tests: WaterTest[], modelK: number)` → blended k
8. `evaluateChemistry(pool, latestTests, sunExposure)` → `ChemistryStatus`

All functions MUST be pure (no side effects) and MUST have comprehensive unit tests.

## Constraints

- **All math client-side:** No backend computation. All formulas run in the browser
- **Units:** Internal storage in metric (ppm, Celsius for calculations). Display in user-friendly units (°F for US users, fl oz / gallons for liquid chlorine). The app MAY add unit preferences later
- **Precision:** Display FC to 1 decimal place, pH to 1 decimal, CYA/TA/CH as integers
- **Test history limits:** SHOULD retain up to 365 days of tests per pool. Older tests MAY be archived or summarized to save localStorage space

## Open Questions

- **Bather load factor:** Should the app allow users to log swim sessions (number of swimmers, duration) to adjust the demand component? This would improve accuracy but adds UX complexity. Deferred — start with the temperature-based model.
- **Rain event tracking:** Rain dilutes CYA, shifts pH/TA, and introduces contaminants. Should the app use Open-Meteo precipitation data to flag "post-rain retest" reminders? Valuable but deferred to keep v1 focused.
- **Unit preferences:** Should the app support metric (liters, °C) from the start? Deferred — start with US units (gallons, °F), add metric later.

## References

- [Trouble Free Pool: FC/CYA Relationship](https://www.troublefreepool.com/blog/2019/01/18/free-chlorine-and-cyanuric-acid-relationship-explained/) — Industry-standard FC/CYA table
- [PMC7506937: Swimming Pool Water Kinetics](https://pmc.ncbi.nlm.nih.gov/articles/PMC7506937/) — Experimental decay rate constants and Arrhenius parameters
- [Orenda Tech: CYA and Chlorine](https://blog.orendatech.com/understanding-cyanuric-acid) — CYA binding mechanics
- [Orenda Tech: LSI Explained](https://blog.orendatech.com/langelier-saturation-index) — Saturation index formulas
- Related specs: [Pool Management](../pool-management/), [Sun Exposure](../sun-exposure/), [Chemistry Forecast](../chemistry-forecast/)

## Changelog

| Date | Change | Document |
|------|--------|----------|
| 2026-04-18 | Initial spec created | — |
