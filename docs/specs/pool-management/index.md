# Pool Management

## Overview

The pool management feature provides CRUD operations for swimming pools, each associated with a geographic location, physical properties (volume, surface type), and chlorination configuration. Pools are the primary entity in cl — all other features (chemistry, forecasting, sun exposure) operate within the context of a specific pool. The app MUST display a minimalistic map for each pool's location and MUST persist all pool data to localStorage.

## Background

A pool owner may manage one or more pools (main pool, hot tub, neighbor's pool they help maintain). Each pool has unique physical characteristics that affect chemistry: volume determines dosing amounts, location determines sun exposure, surface type affects chemical demand, and chlorination method determines which products to dose with.

- Related specs: [Architecture](../architecture/), [Sun Exposure](../sun-exposure/), [Water Chemistry](../water-chemistry/)

## Requirements

### Pool CRUD

The app MUST support creating, reading, updating, and deleting pools.

- Each pool MUST have a unique auto-generated ID (e.g., `crypto.randomUUID()`)
- Each pool MUST have a user-provided name
- Each pool MUST have a geographic location (latitude/longitude)
- Each pool MUST have a volume in gallons
- Each pool SHOULD have optional metadata (surface type, chlorination method, notes)
- Deleting a pool MUST also delete all associated test results and cached forecasts
- Deleting a pool MUST require confirmation

#### Scenario: Create a pool

- **GIVEN** the user is on the "Add Pool" form
- **WHEN** they enter "Backyard Pool", set location via map/geolocation, enter 15000 gallons, and submit
- **THEN** a new pool is created, persisted to localStorage, and the user is navigated to the pool detail view

#### Scenario: Delete a pool

- **GIVEN** a pool "Hot Tub" exists with 3 test results
- **WHEN** the user clicks delete and confirms
- **THEN** the pool and all 3 test results are removed from localStorage

#### Scenario: Edit pool properties

- **GIVEN** a pool with volume 15000 gallons
- **WHEN** the user updates the volume to 18000 gallons
- **THEN** the new volume is persisted and all future dosing calculations use 18000 gallons

### Pool Properties

Each pool MUST store the following required properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string (UUID) | MUST | Auto-generated unique identifier |
| `name` | string | MUST | User-provided display name |
| `latitude` | number | MUST | Decimal degrees (-90 to 90) |
| `longitude` | number | MUST | Decimal degrees (-180 to 180) |
| `volumeGallons` | number | MUST | Pool volume in US gallons |
| `createdAt` | string (ISO 8601) | MUST | Creation timestamp |
| `updatedAt` | string (ISO 8601) | MUST | Last modification timestamp |

Each pool MAY store these optional properties:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `surfaceType` | enum | `"plaster"` | Pool surface material |
| `chlorineSource` | enum | `"liquid"` | Primary chlorination method |
| `treeCoverPercent` | number (0-100) | `0` | Estimated tree canopy shade over pool |
| `isIndoor` | boolean | `false` | Whether pool is indoors (disables sun exposure) |
| `targetFc` | number (ppm) | computed | Target free chlorine; defaults based on CYA |
| `targetPh` | number | `7.4` | Target pH level |
| `notes` | string | `""` | Free-text notes |

#### Surface Types

```typescript
type SurfaceType = "plaster" | "vinyl" | "fiberglass" | "pebble" | "tile"
```

Surface type MAY influence chemical demand estimates in future versions but is primarily informational for now.

#### Chlorine Sources

```typescript
type ChlorineSource =
  | "liquid"       // Sodium hypochlorite (bleach) — 12.5% or 8.25%
  | "liquid_6"     // Sodium hypochlorite 6% (household bleach)
  | "cal_hypo"     // Calcium hypochlorite (granular, 65-73%)
  | "dichlor"      // Sodium dichloro-s-triazinetrione (56%)
  | "trichlor"     // Trichloroisocyanuric acid (tablets, 90%)
  | "swg"          // Salt water generator
```

The chlorine source MUST be used by the dosing calculator to determine:
- Amount of product needed per ppm of chlorine
- CYA contribution (trichlor and dichlor add CYA)
- Calcium contribution (cal-hypo adds calcium hardness)

### Geolocation

The app MUST support setting pool location via:

1. **Browser geolocation API** — MUST request permission and use device GPS/location
2. **Map click/drag** — MUST allow placing a pin on a map
3. **Manual coordinate entry** — SHOULD allow typing latitude/longitude directly

#### Scenario: Use device location

- **GIVEN** the user is creating a new pool
- **WHEN** they click "Use my location"
- **THEN** the browser requests geolocation permission, and on approval, the map centers on their coordinates with a marker

#### Scenario: Geolocation denied

- **GIVEN** the user denies geolocation permission
- **WHEN** the location field is required
- **THEN** the app falls back to map click or manual entry, showing a helpful message

#### Scenario: Drag marker

- **GIVEN** a marker is placed on the map
- **WHEN** the user drags the marker to a new position
- **THEN** latitude and longitude update in real-time

### Map Display

Each pool MUST display a minimalistic map showing the pool's location. The map implementation MUST be lightweight and free.

- The map MUST use **Leaflet** with OpenStreetMap raster tiles
- The map MUST show a single marker at the pool's coordinates
- The map MUST display attribution (`© OpenStreetMap contributors`)
- The map SHOULD default to zoom level 16 (neighborhood level)
- The map SHOULD NOT include excessive controls — zoom buttons are sufficient
- On the pool creation form, the map MUST be interactive (clickable, draggable marker)
- On the pool detail view, the map MAY be static (non-interactive) to save resources

#### Scenario: Pool detail map

- **GIVEN** a pool at coordinates (33.4484, -112.0740) — Phoenix, AZ
- **WHEN** the user views the pool detail page
- **THEN** a small map renders with a marker at those coordinates, centered at zoom 16

### Tree Cover Input

Since no browser-queryable tree canopy API exists, the app MUST provide a user-input mechanism for estimating tree cover.

- The app MUST display a slider (0-100%) with labeled presets
- Presets SHOULD include: 0% (full sun), 25% (sparse shade), 50% (partial shade), 75% (mostly shaded), 90%+ (dense canopy)
- The app SHOULD provide a brief tooltip explaining what tree cover means for chlorine consumption
- The value MUST be stored on the pool and passed to the [Sun Exposure](../sun-exposure/) engine

#### Scenario: Set tree cover

- **GIVEN** a pool surrounded by mature oak trees
- **WHEN** the user moves the tree cover slider to 60%
- **THEN** the sun exposure calculations reduce effective solar hours by the tree reduction factor for 60% canopy

### Pool List View

The root route (`/`) MUST display all pools as a list or card grid.

- Each pool card MUST show: name, volume, and last test date (or "No tests yet")
- Each pool card SHOULD show: current estimated FC level (from forecast), a color-coded status indicator (green/yellow/red)
- The list MUST be sorted by most recently updated
- If no pools exist, the app MUST show an empty state prompting the user to add their first pool

#### Scenario: Empty state

- **GIVEN** the user has no pools
- **WHEN** they open the app
- **THEN** they see a friendly empty state with a prominent "Add Pool" button

#### Scenario: Pool card status

- **GIVEN** a pool with last FC test of 4.0 ppm taken 2 days ago and a forecast predicting current FC of 1.2 ppm (below target)
- **WHEN** the user views the pool list
- **THEN** the pool card shows a yellow/red indicator with "FC low — chlorinate soon"

## Design

### Data Models

```typescript
interface Pool {
  id: string                    // crypto.randomUUID()
  name: string
  latitude: number
  longitude: number
  volumeGallons: number
  surfaceType: SurfaceType
  chlorineSource: ChlorineSource
  treeCoverPercent: number      // 0-100
  isIndoor: boolean
  targetFc: number | null       // null = auto from CYA
  targetPh: number
  notes: string
  createdAt: string             // ISO 8601
  updatedAt: string             // ISO 8601
}
```

### UI Components

| Component | Location | Description |
|-----------|----------|-------------|
| `PoolList` | `features/pools/` | Card grid of all pools |
| `PoolCard` | `features/pools/` | Summary card for one pool |
| `PoolForm` | `features/pools/` | Create/edit form with map |
| `PoolDetail` | `features/pools/` | Detail view with map, chemistry, forecast |
| `LocationPicker` | `features/pools/` | Map with draggable marker |
| `TreeCoverSlider` | `features/pools/` | Labeled slider with presets |

### Business Logic

Pool management is primarily CRUD with no complex business logic. The `volumeGallons` and `chlorineSource` feed into dosing calculations (see [Water Chemistry](../water-chemistry/)). The `latitude`, `longitude`, and `treeCoverPercent` feed into solar calculations (see [Sun Exposure](../sun-exposure/)).

## Constraints

- **Map tiles:** MUST use free tile providers with proper attribution. MUST NOT use providers requiring API keys for core functionality
- **Geolocation:** MUST handle permission denial gracefully. MUST NOT block pool creation if geolocation is unavailable (allow manual entry)
- **Volume validation:** MUST accept values between 100 and 1,000,000 gallons. SHOULD warn on values outside typical residential range (5,000-50,000)

## Open Questions

- **Hot tub support:** Should hot tubs have a separate `poolType` field? Hot tubs have different chemistry dynamics (higher temp, smaller volume, higher bather-to-volume ratio). For now, they can be modeled as small pools with adjusted parameters.
- **Multiple chlorine sources:** Some pool owners use liquid chlorine for maintenance and cal-hypo for shocking. Should the model support a primary + secondary source? Deferred — start with single source.

## References

- [Leaflet](https://leafletjs.com/) — Lightweight mapping library
- [OpenStreetMap](https://www.openstreetmap.org/) — Free map tiles
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) — Browser location API
- Related specs: [Architecture](../architecture/), [Sun Exposure](../sun-exposure/), [Water Chemistry](../water-chemistry/)

## Changelog

| Date | Change | Document |
|------|--------|----------|
| 2026-04-18 | Initial spec created | — |
