# 0002: Pool CRUD & Persistence

## Summary

Implement pool creation, editing, deletion, and list view with localStorage persistence. This is the foundational data entity — all other features depend on pools existing.

**Spec:** [Pool Management](../specs/pool-management/)
**Status:** draft
**Depends On:** 0001

## Motivation

- Users need to create and manage pools before any chemistry tracking can happen
- The pool entity holds critical properties (volume, chlorine source, CYA-related targets) that feed into every downstream calculation
- localStorage persistence ensures data survives browser restarts

## Requirements

### Pool Creation Form

The app MUST provide a form to create a new pool with required and optional fields.

#### Scenario: Minimal pool creation

- **GIVEN** the user navigates to `/pools/new`
- **WHEN** they enter a name and volume, set a location, and submit
- **THEN** a pool is created with defaults for optional fields and persisted to localStorage

### Pool List View

The root route MUST display all pools as cards.

#### Scenario: Pool list with status

- **GIVEN** 2 pools exist
- **WHEN** the user visits `/`
- **THEN** they see 2 pool cards with names, volumes, and "No tests yet" labels

### Pool Editing

The app MUST allow editing all pool properties.

#### Scenario: Update volume

- **GIVEN** a pool with 15,000 gallons
- **WHEN** the user edits volume to 18,000 and saves
- **THEN** the updated volume is persisted

### Pool Deletion

Deleting a pool MUST remove it and all associated data.

#### Scenario: Delete with confirmation

- **GIVEN** a pool with test results
- **WHEN** the user clicks delete
- **THEN** a confirmation dialog appears; on confirm, pool and tests are removed

## Design

### Approach

- Add pool CRUD actions to the Zustand store (addPool, updatePool, deletePool)
- Build PoolForm component using @fx/ui (Input, Select, Button, Label)
- Build PoolList with PoolCard components
- Build PoolDetail as the container for the pool dashboard (content filled by later changes)
- Wire up wouter routes to real components

### Decisions

- **Decision:** Store pools as a flat array in Zustand, not a Map
  - **Why:** JSON serialization for localStorage works naturally with arrays. Pool count is small (< 100).
  - **Alternatives considered:** Record<id, Pool> (faster lookup but awkward serialization)

### Non-Goals

- No map or geolocation yet (handled in 0003)
- No chemistry or forecast features
- Location is entered as raw lat/lng coordinates for now

## Tasks

- [ ] Define `Pool` TypeScript type in `src/types/`
- [ ] Add pool CRUD actions to Zustand store (addPool, updatePool, deletePool)
- [ ] Build `PoolForm` component (name, volume, surface type, chlorine source, lat/lng inputs, tree cover slider, notes)
- [ ] Build `PoolList` component with `PoolCard` subcomponent
- [ ] Build `PoolDetail` container (shows pool info, placeholder for forecast/chemistry)
- [ ] Build `TreeCoverSlider` component with labeled presets (0%, 25%, 50%, 75%, 90%)
- [ ] Wire routes: `/` → PoolList, `/pools/new` → PoolForm, `/pools/:id` → PoolDetail
- [ ] Add delete confirmation using @fx/ui AlertDialog
- [ ] Build empty state for pool list ("Add your first pool")
- [ ] Write tests for Zustand store actions (add, update, delete, persistence)
- [ ] Write component tests for PoolForm validation (required fields, volume range)

## Open Questions

- [ ] Should pool cards show a mini-map thumbnail, or is the name + volume sufficient for the list view? Defer mini-map to 0003.

## References

- Spec: [Pool Management](../specs/pool-management/)
- Related: [0001-project-scaffolding](./0001-project-scaffolding.md)
