import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Pool, PoolId, UserPreferences, WaterTest } from "../types";

export interface AppState {
	pools: Pool[];
	testResults: Record<PoolId, WaterTest[]>;
	preferences: UserPreferences;
}

export interface AppActions {
	addPool: (pool: Pool) => void;
	updatePool: (
		id: PoolId,
		updates: Partial<Omit<Pool, "id" | "createdAt" | "updatedAt">>,
	) => void;
	deletePool: (id: PoolId) => void;
	addTestResult: (poolId: PoolId, test: WaterTest) => void;
	deleteTestResult: (poolId: PoolId, testId: string) => void;
	setPreferences: (prefs: Partial<UserPreferences>) => void;
	reset: () => void;
}

const initialState: AppState = {
	pools: [],
	testResults: {},
	preferences: {
		units: "imperial",
	},
};

export const useAppStore = create<AppState & AppActions>()(
	persist(
		(set) => ({
			...initialState,
			addPool: (pool) =>
				set((state) => ({
					pools: [...state.pools, pool],
				})),
			updatePool: (id, updates) =>
				set((state) => ({
					pools: state.pools.map((p) =>
						p.id === id
							? { ...p, ...updates, updatedAt: new Date().toISOString() }
							: p,
					),
				})),
			deletePool: (id) =>
				set((state) => ({
					pools: state.pools.filter((p) => p.id !== id),
					testResults: Object.fromEntries(
						Object.entries(state.testResults).filter(([k]) => k !== id),
					),
				})),
			addTestResult: (poolId, test) =>
				set((state) => ({
					testResults: {
						...state.testResults,
						[poolId]: [...(state.testResults[poolId] ?? []), test],
					},
				})),
			deleteTestResult: (poolId, testId) =>
				set((state) => ({
					testResults: {
						...state.testResults,
						[poolId]: (state.testResults[poolId] ?? []).filter(
							(t) => t.id !== testId,
						),
					},
				})),
			setPreferences: (prefs) =>
				set((state) => ({
					preferences: { ...state.preferences, ...prefs },
				})),
			reset: () => set(initialState),
		}),
		{
			name: "cl-storage",
			version: 2,
			partialize: (state) => ({
				pools: state.pools,
				testResults: state.testResults,
				preferences: state.preferences,
			}),
			migrate: (persisted, version) => {
				if (version < 2) {
					const state = persisted as AppState;
					return {
						...state,
						pools: (state.pools ?? []).map((p) => {
							const partial = p as Partial<Pool> & { createdAt: string };
							return {
								...p,
								surfaceType: partial.surfaceType ?? ("plaster" as const),
								chlorineSource: partial.chlorineSource ?? ("liquid" as const),
								treeCoverPercent: partial.treeCoverPercent ?? 0,
								isIndoor: partial.isIndoor ?? false,
								targetFc: partial.targetFc ?? null,
								targetPh: partial.targetPh ?? 7.4,
								notes: partial.notes ?? "",
								updatedAt: partial.updatedAt ?? partial.createdAt,
							};
						}),
					};
				}
				return persisted as AppState & AppActions;
			},
		},
	),
);

export function getTestsForPool(poolId: PoolId): WaterTest[] {
	return useAppStore.getState().testResults[poolId] ?? [];
}
