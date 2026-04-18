# 0003: Geolocation & Map Display

## Summary

Add interactive map-based location picker for pool creation/editing and a static map display on the pool detail view. Integrate browser Geolocation API for "use my location" functionality.

**Spec:** [Pool Management](../specs/pool-management/)
**Status:** draft
**Depends On:** 0002

## Motivation

- Pool location (lat/lng) drives the entire sun exposure engine — it determines daylight hours, solar intensity, and weather data
- A map makes location entry intuitive vs. typing raw coordinates
- Seeing the pool on a map provides spatial context and confirms the location is correct

## Requirements

### Interactive Location Picker

The pool form MUST include a map with a draggable marker for setting location.

#### Scenario: Click to place marker

- **GIVEN** the user is on the pool creation form
- **WHEN** they click a point on the map
- **THEN** a marker is placed at that point and lat/lng fields update

#### Scenario: Drag marker

- **GIVEN** a marker is placed on the map
- **WHEN** the user drags it to a new position
- **THEN** lat/lng update in real-time

### Browser Geolocation

The app MUST support a "Use my location" button.

#### Scenario: Geolocation success

- **GIVEN** the user clicks "Use my location"
- **WHEN** the browser grants permission
- **THEN** the map centers on the user's coordinates with a marker

#### Scenario: Geolocation denied

- **GIVEN** the user denies location permission
- **WHEN** the permission is denied
- **THEN** the app shows a message: "Location access denied. Place your pool on the map or enter coordinates manually."

### Static Map on Pool Detail

The pool detail view MUST show a non-interactive map with the pool's location.

#### Scenario: Pool detail map

- **GIVEN** a pool at known coordinates
- **WHEN** the user views pool detail
- **THEN** a map renders with a marker, centered at zoom level 16

## Design

### Approach

- Use Leaflet with OpenStreetMap tiles (free, no API key)
- Create `LocationPicker` component (interactive, for forms) and `PoolMap` component (static, for detail view)
- Leaflet CSS imported in the component, not globally
- React wrapper: use `react-leaflet` or a minimal custom hook wrapping Leaflet's imperative API

### Decisions

- **Decision:** Use Leaflet over Pigeon Maps or MapLibre
  - **Why:** Leaflet is the most mature, best documented, and sufficient for our simple marker-on-map use case. Raster tiles from OSM are free with no key.
  - **Alternatives considered:** Pigeon Maps (lighter but less flexible), MapLibre GL (vector tiles, heavier, overkill for a single marker)

- **Decision:** Use `react-leaflet` wrapper
  - **Why:** Provides declarative React components (`<MapContainer>`, `<Marker>`, `<TileLayer>`) that integrate cleanly with React's lifecycle
  - **Alternatives considered:** Raw Leaflet with useRef (more control but more boilerplate)

### Non-Goals

- No address search / geocoding (would need a geocoding API with key)
- No satellite imagery (OSM raster only)
- No mini-map on pool cards (keep list view lightweight)

## Tasks

- [ ] Install `leaflet`, `react-leaflet`, `@types/leaflet`
- [ ] Create `LocationPicker` component — interactive map with draggable marker, click-to-place
- [ ] Add "Use my location" button with browser Geolocation API integration
- [ ] Handle geolocation permission denial gracefully (message + fallback to manual)
- [ ] Create `PoolMap` component — static map with marker (non-draggable, minimal controls)
- [ ] Integrate `LocationPicker` into `PoolForm` (replace raw lat/lng inputs, keep them as fallback)
- [ ] Integrate `PoolMap` into `PoolDetail` view
- [ ] Add Leaflet CSS loading (scoped to map components)
- [ ] Write tests for geolocation hook (mock navigator.geolocation)
- [ ] Write component test for LocationPicker (marker placement updates coordinates)

## Open Questions

- [ ] Default map center when no location is set — use center of US (39.8283, -98.5795) at zoom 4? Or try geolocation immediately on form load?

## References

- Spec: [Pool Management](../specs/pool-management/)
- [Leaflet Quick Start](https://leafletjs.com/examples/quick-start/)
- [react-leaflet](https://react-leaflet.js.org/)
- Related: [0002-pool-crud](./0002-pool-crud.md)
