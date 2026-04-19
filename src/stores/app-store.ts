import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateId } from "../lib/id";
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
			version: 3,
			partialize: (state) => ({
				pools: state.pools,
				testResults: state.testResults,
				preferences: state.preferences,
			}),
			migrate: (persisted, version) => {
				// biome-ignore lint/suspicious/noExplicitAny: migration handles unknown persisted shapes
				let state = persisted as any;
				if (version < 2) {
					state = {
						...state,
						pools: (state.pools ?? []).map((p: Record<string, unknown>) => ({
							...p,
							surfaceType: p.surfaceType ?? "plaster",
							chlorineSource: p.chlorineSource ?? "liquid",
							treeCoverPercent: p.treeCoverPercent ?? 0,
							isIndoor: p.isIndoor ?? false,
							targetFc: p.targetFc ?? null,
							targetPh: p.targetPh ?? 7.4,
							notes: p.notes ?? "",
							updatedAt: p.updatedAt ?? p.createdAt,
						})),
					};
				}
				if (version < 3) {
					const oldTests = state.testResults ?? {};
					const migratedTests: Record<string, WaterTest[]> = {};
					for (const [poolId, tests] of Object.entries(oldTests)) {
						migratedTests[poolId] = (tests as Record<string, unknown>[]).map(
							(t) =>
								({
									id: t.id ?? generateId(),
									poolId: t.poolId ?? poolId,
									testedAt:
										t.testedAt ?? t.timestamp ?? new Date().toISOString(),
									createdAt:
										t.createdAt ?? t.timestamp ?? new Date().toISOString(),
									fc: t.fc ?? t.freeChlorine,
									cc:
										t.cc ??
										(typeof t.totalChlorine === "number" &&
										typeof t.freeChlorine === "number"
											? (t.totalChlorine as number) - (t.freeChlorine as number)
											: undefined),
									ph: t.ph,
									cya: t.cya ?? t.cyanuricAcid,
									ta: t.ta ?? t.totalAlkalinity,
									ch: t.ch ?? t.calciumHardness,
									tempF: t.tempF ?? t.temperature,
									tds: t.tds,
									salt: t.salt,
									phosphates: t.phosphates,
									notes: t.notes,
								}) as WaterTest,
						);
					}
					state = { ...state, testResults: migratedTests };
				}
				return state as AppState & AppActions;
			},
		},
	),
);

export function getTestsForPool(poolId: PoolId): WaterTest[] {
	return useAppStore.getState().testResults[poolId] ?? [];
}
