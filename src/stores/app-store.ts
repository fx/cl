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
		updates: Partial<Omit<Pool, "id" | "createdAt">>,
	) => void;
	deletePool: (id: PoolId) => void;
	addTestResult: (poolId: PoolId, test: WaterTest) => void;
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
			setPreferences: (prefs) =>
				set((state) => ({
					preferences: { ...state.preferences, ...prefs },
				})),
			reset: () => set(initialState),
		}),
		{
			name: "cl-storage",
			version: 1,
			partialize: (state) => ({
				pools: state.pools,
				testResults: state.testResults,
				preferences: state.preferences,
			}),
		},
	),
);
