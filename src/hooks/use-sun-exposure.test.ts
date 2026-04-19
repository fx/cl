import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Pool } from "../types";
import { useSunExposure } from "./use-sun-exposure";

vi.mock("../lib/solar", () => ({
	computeSunExposure: vi.fn().mockResolvedValue({
		poolId: "pool-1",
		fetchedAt: "2026-04-19T12:00:00Z",
		dataSource: "fallback",
		daily: [],
	}),
}));

const testPool: Pool = {
	id: "pool-1",
	name: "Test Pool",
	latitude: 33.4484,
	longitude: -112.074,
	volumeGallons: 15000,
	surfaceType: "plaster",
	chlorineSource: "liquid",
	treeCoverPercent: 10,
	isIndoor: false,
	targetFc: null,
	targetPh: 7.4,
	notes: "",
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
};

describe("useSunExposure", () => {
	it("returns null initially", () => {
		const { result } = renderHook(() => useSunExposure(testPool));
		// Before async resolution, data is null
		expect(result.current).toBeNull();
	});

	it("returns null when pool is null", () => {
		const { result } = renderHook(() => useSunExposure(null));
		expect(result.current).toBeNull();
	});

	it("resolves sun exposure data", async () => {
		const { result } = renderHook(() => useSunExposure(testPool));

		await waitFor(() => {
			expect(result.current).not.toBeNull();
		});

		expect(result.current?.poolId).toBe("pool-1");
		expect(result.current?.dataSource).toBe("fallback");
	});

	it("resets data when pool changes to null", async () => {
		const { result, rerender } = renderHook(
			({ pool }: { pool: Pool | null }) => useSunExposure(pool),
			{ initialProps: { pool: testPool } as { pool: Pool | null } },
		);

		await waitFor(() => {
			expect(result.current).not.toBeNull();
		});

		rerender({ pool: null });
		expect(result.current).toBeNull();
	});
});
