# Documentation

## Specs

| Spec | Description | Status |
|------|-------------|--------|
| [Architecture](specs/architecture/) | Tech stack, project structure, data persistence, PWA configuration | active |
| [Chemistry Forecast](specs/chemistry-forecast/) | 7-day chlorine prediction engine, dose scheduling, and dashboard | active |
| [Pool Management](specs/pool-management/) | Pool CRUD, geolocation, map display, and pool properties | active |
| [Sun Exposure](specs/sun-exposure/) | Solar radiation engine using SunCalc and Open-Meteo for UV estimation | active |
| [Water Chemistry](specs/water-chemistry/) | Chemistry model, test logging, chlorine decay, dosing calculations | active |

## Changes

| # | Change | Spec | Status | Depends On |
|---|--------|------|--------|------------|
| 0001 | [Project Scaffolding](changes/0001-project-scaffolding.md) | [Architecture](specs/architecture/) | draft | — |
| 0002 | [Pool CRUD](changes/0002-pool-crud.md) | [Pool Management](specs/pool-management/) | draft | 0001 |
| 0003 | [Geolocation & Map](changes/0003-geolocation-and-map.md) | [Pool Management](specs/pool-management/) | draft | 0002 |
| 0004 | [Sun Exposure Engine](changes/0004-sun-exposure-engine.md) | [Sun Exposure](specs/sun-exposure/) | draft | 0002 |
| 0005 | [Water Chemistry Model](changes/0005-water-chemistry-model.md) | [Water Chemistry](specs/water-chemistry/) | draft | 0002 |
| 0006 | [Chemistry Forecast](changes/0006-chemistry-forecast.md) | [Chemistry Forecast](specs/chemistry-forecast/) | draft | 0004, 0005 |
| 0007 | [Forecast Dashboard UI](changes/0007-forecast-dashboard-ui.md) | [Chemistry Forecast](specs/chemistry-forecast/) | draft | 0003, 0006 |
