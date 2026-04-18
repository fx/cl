# 0007: Forecast Dashboard UI

## Summary

Build the pool detail dashboard UI: NextAction card, 7-day FC forecast chart, dose schedule list, chemistry status bar, and warning banners. This is the primary user-facing view that turns the forecast engine into actionable visual information.

**Spec:** [Chemistry Forecast](../specs/chemistry-forecast/)
**Status:** draft
**Depends On:** 0003, 0006

## Motivation

- The forecast engine (0006) produces data; this change makes it visible and actionable
- The NextAction card is the single most important UI element — a pool owner should be able to open the app and immediately know what to do
- The forecast chart provides context and confidence — users can see *why* the app recommends dosing at a particular time

## Requirements

### NextAction Card

The most prominent element on the pool detail page.

#### Scenario: Urgent dose needed

- **GIVEN** forecast shows FC dropping below minimum in 8 hours
- **WHEN** the dashboard renders
- **THEN** a red card says "Add 48 fl oz of liquid chlorine by this evening" with the reason underneath

#### Scenario: All good

- **GIVEN** FC stays in range for days
- **WHEN** the dashboard renders
- **THEN** a green card says "Next chlorination: Thursday evening — FC is on track"

#### Scenario: Test needed

- **GIVEN** last test was 4 days ago
- **WHEN** the dashboard renders
- **THEN** a yellow card says "Test your water — last test was 4 days ago" with a link to the test form

### Forecast Chart

A 7-day line chart showing predicted FC with dose events.

#### Scenario: Chart with dose markers

- **GIVEN** a forecast with 3 dose events
- **WHEN** the chart renders
- **THEN** it shows an FC line in sawtooth pattern, green target band, red minimum line, vertical dose markers, and a "now" indicator

### Dose Schedule List

A simple list of upcoming dose events.

#### Scenario: Dose list

- **GIVEN** 3 upcoming dose events
- **WHEN** the schedule section renders
- **THEN** it shows: date/time, product amount, projected FC before and after

### Chemistry Status Bar

A compact summary of current chemistry state.

#### Scenario: Status indicators

- **GIVEN** FC = 4.5 (ok), pH = 7.8 (high), CYA = 45 (ok)
- **WHEN** the status bar renders
- **THEN** FC shows green, pH shows yellow with "7.8 — high", CYA shows green

### Warning Banners

Dismissible warnings for conditions requiring attention.

#### Scenario: CYA warning

- **GIVEN** CYA projected to hit 80 ppm in 3 weeks
- **WHEN** the dashboard renders
- **THEN** a warning banner says "CYA rising — consider switching to liquid chlorine"

### Stale Data Indicator

The UI MUST indicate when forecast data is based on old tests or stale weather.

#### Scenario: Stale weather data

- **GIVEN** weather data is 18 hours old
- **WHEN** the dashboard renders
- **THEN** a subtle indicator shows "Weather data last updated 18 hours ago"

### Responsive Design

The dashboard MUST work on mobile screens (320px+).

#### Scenario: Mobile layout

- **GIVEN** a 375px wide screen
- **WHEN** the dashboard renders
- **THEN** NextAction card is full-width, chart is horizontally scrollable or compressed, all content is readable

## Design

### Approach

- Build `ForecastDashboard` as the main container in `features/forecast/`
- Compose: NextActionCard → ForecastChart → DoseSchedule → ChemistryStatusBar → WarningBanners → ParameterAlerts
- Use @fx/ui components: Card, Alert, Badge for status indicators
- Use @fx/ui Chart (Recharts) for the FC line chart
- The ForecastChart needs custom Recharts config: Area for target band, Line for FC, ReferenceLine for minimum, ReferenceArea for day/night, custom dot for dose events
- Integrate into PoolDetail view (from 0002), replacing the placeholder content

### Decisions

- **Decision:** Chart first, then summary cards below
  - **Why:** The chart gives the most information density. NextAction card goes above it as the hero element, then chart, then details below.
  - **Alternatives considered:** Cards-only layout (loses the visual forecast), chart fullscreen (loses quick-glance info)

- **Decision:** Use Recharts ResponsiveContainer for mobile
  - **Why:** Recharts' ResponsiveContainer auto-resizes to parent width. For 7-day data, the chart width works at 320px — 168 data points are dense but readable as a line.
  - **Alternatives considered:** Horizontal scroll on mobile (workable but less elegant)

### Non-Goals

- No dark mode (can be added later via Tailwind)
- No push notifications
- No print/export view
- No comparison between pools

## Tasks

- [ ] Build `NextActionCard` component — renders dose/test/ok states with appropriate colors (red/yellow/green), icons, and CTA buttons
- [ ] Build `ForecastChart` component — Recharts line chart with:
  - [ ] FC prediction line (primary)
  - [ ] Target range as shaded green Area
  - [ ] Minimum FC as red dashed ReferenceLine
  - [ ] Dose events as custom dot markers with tooltips
  - [ ] "Now" vertical line indicator
  - [ ] Day labels on x-axis
  - [ ] ResponsiveContainer for mobile
- [ ] Build `DoseSchedule` component — list of upcoming DoseEvents with date, amount, FC before/after
- [ ] Build `ChemistryStatusBar` component — compact FC/pH/CYA indicators with color coding
- [ ] Build `WarningBanner` component — dismissible Alert for CYA, stale test, pH warnings
- [ ] Build `ParameterAlerts` component — secondary cards for pH, TA, CH, LSI issues
- [ ] Build `ForecastDashboard` container — composes all above components, calls useForecast hook
- [ ] Integrate ForecastDashboard into PoolDetail view (replace placeholder)
- [ ] Add "Log test" and "Calculate dose" quick-action buttons to dashboard
- [ ] Ensure responsive layout works at 320px, 375px, 768px, 1024px breakpoints
- [ ] Write component tests for NextActionCard (all 3 states render correctly)
- [ ] Write component tests for ForecastChart (renders with mock forecast data)
- [ ] Write visual/snapshot tests for dashboard layout

## Open Questions

- [ ] Should the dose schedule have a "Mark as done" button that opens the test form pre-filled with the expected post-dose FC? Good UX but adds complexity. Recommend yes for v1.
- [ ] Should the chart support tap-to-inspect on mobile (show tooltip for tapped hour)? Recharts supports this via activeDot — include it.

## References

- Spec: [Chemistry Forecast](../specs/chemistry-forecast/)
- [Recharts API](https://recharts.org/en-US/api)
- [@fx/ui Chart component](https://github.com/fx/ui)
- Related: [0003-geolocation-and-map](./0003-geolocation-and-map.md), [0006-chemistry-forecast](./0006-chemistry-forecast.md)
