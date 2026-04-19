import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Pool, WaterTest } from "../types";
import { type AppState, getTestsForPool, useAppStore } from "./app-store";

const testPool: Pool = {
	id: "pool-1",
	name: "Main Pool",
	volumeGallons: 15000,
	latitude: 33.4484,
	longitude: -112.074,
	surfaceType: "plaster",
	chlorineSource: "liquid",
	treeCoverPercent: 0,
	isIndoor: false,
	targetFc: null,
	targetPh: 7.4,
	notes: "",
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
};

const testResult: WaterTest = {
	id: "test-1",
	poolId: "pool-1",
	testedAt: "2026-01-02T00:00:00Z",
	createdAt: "2026-01-02T00:00:00Z",
	fc: 3.0,
	cc: 0.5,
	ph: 7.4,
	ta: 100,
	cya: 40,
};

describe("useAppStore", () => {
	beforeEach(() => {
		act(() => {
			useAppStore.getState().reset();
		});
	});

	it("has correct initial state", () => {
		const state = useAppStore.getState();
		expect(state.pools).toEqual([]);
		expect(state.testResults).toEqual({});
		expect(state.preferences).toEqual({ units: "imperial" });
	});

	it("adds a pool", () => {
		act(() => {
			useAppStore.getState().addPool(testPool);
		});
		expect(useAppStore.getState().pools).toEqual([testPool]);
	});

	it("updates a pool", () => {
		act(() => {
			useAppStore.getState().addPool(testPool);
			useAppStore
				.getState()
				.updatePool("pool-1", { name: "Updated Pool", volumeGallons: 20000 });
		});
		const pool = useAppStore.getState().pools[0];
		expect(pool.name).toBe("Updated Pool");
		expect(pool.volumeGallons).toBe(20000);
		expect(pool.updatedAt).not.toBe(testPool.updatedAt);
	});

	it("does not modify other pools when updating", () => {
		const secondPool: Pool = { ...testPool, id: "pool-2", name: "Second Pool" };
		act(() => {
			useAppStore.getState().addPool(testPool);
			useAppStore.getState().addPool(secondPool);
			useAppStore.getState().updatePool("pool-1", { name: "Updated" });
		});
		const pools = useAppStore.getState().pools;
		expect(pools[0].name).toBe("Updated");
		expect(pools[1].name).toBe("Second Pool");
	});

	it("deletes a pool and its test results", () => {
		act(() => {
			useAppStore.getState().addPool(testPool);
			useAppStore.getState().addTestResult("pool-1", testResult);
			useAppStore.getState().deletePool("pool-1");
		});
		expect(useAppStore.getState().pools).toEqual([]);
		expect(useAppStore.getState().testResults["pool-1"]).toBeUndefined();
	});

	it("adds a test result", () => {
		act(() => {
			useAppStore.getState().addTestResult("pool-1", testResult);
		});
		expect(useAppStore.getState().testResults["pool-1"]).toEqual([testResult]);
	});

	it("appends test results to existing pool results", () => {
		const secondResult: WaterTest = { ...testResult, id: "test-2" };
		act(() => {
			useAppStore.getState().addTestResult("pool-1", testResult);
			useAppStore.getState().addTestResult("pool-1", secondResult);
		});
		expect(useAppStore.getState().testResults["pool-1"]).toEqual([
			testResult,
			secondResult,
		]);
	});

	it("deletes a test result", () => {
		const secondResult: WaterTest = { ...testResult, id: "test-2" };
		act(() => {
			useAppStore.getState().addTestResult("pool-1", testResult);
			useAppStore.getState().addTestResult("pool-1", secondResult);
			useAppStore.getState().deleteTestResult("pool-1", "test-1");
		});
		expect(useAppStore.getState().testResults["pool-1"]).toEqual([
			secondResult,
		]);
	});

	it("handles deleteTestResult for non-existent pool", () => {
		act(() => {
			useAppStore.getState().deleteTestResult("no-pool", "test-1");
		});
		expect(useAppStore.getState().testResults["no-pool"]).toEqual([]);
	});

	it("gets tests for pool", () => {
		act(() => {
			useAppStore.getState().addTestResult("pool-1", testResult);
		});
		expect(getTestsForPool("pool-1")).toEqual([testResult]);
	});

	it("returns empty array for pool with no tests", () => {
		expect(getTestsForPool("no-pool")).toEqual([]);
	});

	it("updates preferences", () => {
		act(() => {
			useAppStore.getState().setPreferences({ units: "metric" });
		});
		expect(useAppStore.getState().preferences.units).toBe("metric");
	});

	it("partially updates preferences", () => {
		act(() => {
			useAppStore.getState().setPreferences({ units: "metric" });
			useAppStore.getState().setPreferences({});
		});
		expect(useAppStore.getState().preferences.units).toBe("metric");
	});

	it("resets to initial state", () => {
		act(() => {
			useAppStore.getState().addPool(testPool);
			useAppStore.getState().addTestResult("pool-1", testResult);
			useAppStore.getState().setPreferences({ units: "metric" });
			useAppStore.getState().reset();
		});
		const state = useAppStore.getState();
		expect(state.pools).toEqual([]);
		expect(state.testResults).toEqual({});
		expect(state.preferences.units).toBe("imperial");
	});

	it("persists pool data through the store configuration", () => {
		const store = useAppStore;
		expect(store.persist).toBeDefined();
		expect(store.persist.getOptions().name).toBe("cl-storage");
	});

	describe("persist migration", () => {
		// biome-ignore lint/style/noNonNullAssertion: migrate is always defined in our config
		const migrate = useAppStore.persist.getOptions().migrate!;

		it("migrates v1 state by adding default pool fields", () => {
			const v1State = {
				pools: [
					{
						id: "p1",
						name: "Old Pool",
						volumeGallons: 10000,
						latitude: 33,
						longitude: -112,
						createdAt: "2025-06-01T00:00:00Z",
					},
				],
				testResults: {},
				preferences: { units: "imperial" },
			};
			const result = migrate(v1State, 1) as AppState;
			const pool = result.pools[0];
			expect(pool.surfaceType).toBe("plaster");
			expect(pool.chlorineSource).toBe("liquid");
			expect(pool.treeCoverPercent).toBe(0);
			expect(pool.isIndoor).toBe(false);
			expect(pool.targetFc).toBeNull();
			expect(pool.targetPh).toBe(7.4);
			expect(pool.notes).toBe("");
			expect(pool.updatedAt).toBe("2025-06-01T00:00:00Z");
		});

		it("preserves existing fields during v1 migration", () => {
			const v1State = {
				pools: [
					{
						id: "p1",
						name: "Pool",
						volumeGallons: 10000,
						latitude: 33,
						longitude: -112,
						surfaceType: "vinyl",
						chlorineSource: "swg",
						treeCoverPercent: 50,
						isIndoor: true,
						targetFc: 5,
						targetPh: 7.2,
						notes: "existing",
						createdAt: "2025-06-01T00:00:00Z",
						updatedAt: "2025-07-01T00:00:00Z",
					},
				],
				testResults: {},
				preferences: { units: "imperial" },
			};
			const result = migrate(v1State, 1) as AppState;
			const pool = result.pools[0];
			expect(pool.surfaceType).toBe("vinyl");
			expect(pool.chlorineSource).toBe("swg");
			expect(pool.treeCoverPercent).toBe(50);
			expect(pool.isIndoor).toBe(true);
			expect(pool.targetFc).toBe(5);
			expect(pool.targetPh).toBe(7.2);
			expect(pool.notes).toBe("existing");
			expect(pool.updatedAt).toBe("2025-07-01T00:00:00Z");
		});

		it("handles empty pools array in v1 migration", () => {
			const v1State = {
				pools: [],
				testResults: {},
				preferences: { units: "imperial" },
			};
			const result = migrate(v1State, 1) as AppState;
			expect(result.pools).toEqual([]);
		});

		it("handles missing pools in v1 migration", () => {
			const v1State = {
				testResults: {},
				preferences: { units: "imperial" },
			};
			const result = migrate(v1State, 0) as AppState;
			expect(result.pools).toEqual([]);
		});

		it("migrates v2 test results to v3 schema", () => {
			const v2State = {
				pools: [testPool],
				testResults: {
					"pool-1": [
						{
							id: "t1",
							poolId: "pool-1",
							timestamp: "2026-01-01T00:00:00Z",
							freeChlorine: 5,
							totalChlorine: 5.5,
							ph: 7.4,
							cyanuricAcid: 40,
							totalAlkalinity: 100,
						},
					],
				},
				preferences: { units: "imperial" },
			};
			const result = migrate(v2State, 2) as AppState;
			const tests = result.testResults["pool-1"];
			expect(tests).toHaveLength(1);
			expect(tests[0].fc).toBe(5);
			expect(tests[0].cc).toBeCloseTo(0.5);
			expect(tests[0].testedAt).toBe("2026-01-01T00:00:00Z");
			expect(tests[0].cya).toBe(40);
			expect(tests[0].ta).toBe(100);
		});

		it("returns state as-is for version 3", () => {
			const v3State = {
				pools: [testPool],
				testResults: {},
				preferences: { units: "imperial" },
			};
			const result = migrate(v3State, 3);
			expect(result).toBe(v3State);
		});
	});
});
