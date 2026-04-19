import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Pool, WaterTest } from "../types";
import { useAppStore } from "./app-store";

const testPool: Pool = {
	id: "pool-1",
	name: "Main Pool",
	volumeGallons: 15000,
	latitude: 33.4484,
	longitude: -112.074,
	createdAt: "2026-01-01T00:00:00Z",
};

const testResult: WaterTest = {
	id: "test-1",
	poolId: "pool-1",
	timestamp: "2026-01-02T00:00:00Z",
	freeChlorine: 3.0,
	totalChlorine: 3.5,
	ph: 7.4,
	alkalinity: 100,
	cyanuricAcid: 40,
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

	it("removes a pool and its test results", () => {
		act(() => {
			useAppStore.getState().addPool(testPool);
			useAppStore.getState().addTestResult("pool-1", testResult);
			useAppStore.getState().removePool("pool-1");
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
});
