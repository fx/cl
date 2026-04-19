import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "../../stores/app-store";
import type { Pool } from "../../types";
import { PoolList } from "./pool-list";

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

describe("PoolList", () => {
	beforeEach(() => {
		act(() => {
			useAppStore.getState().reset();
		});
	});

	it("renders empty state when no pools exist", () => {
		render(<PoolList />);
		expect(screen.getByText("Add your first pool")).toBeInTheDocument();
		expect(screen.getByText("Add Pool")).toBeInTheDocument();
	});

	it("renders pool cards when pools exist", () => {
		act(() => {
			useAppStore.getState().addPool(testPool);
		});
		render(<PoolList />);
		expect(screen.getByText("Main Pool")).toBeInTheDocument();
		expect(screen.getByText("15,000 gallons")).toBeInTheDocument();
	});

	it("renders multiple pools", () => {
		const secondPool: Pool = {
			...testPool,
			id: "pool-2",
			name: "Hot Tub",
			volumeGallons: 500,
			updatedAt: "2026-01-02T00:00:00Z",
		};
		act(() => {
			useAppStore.getState().addPool(testPool);
			useAppStore.getState().addPool(secondPool);
		});
		render(<PoolList />);
		expect(screen.getByText("Main Pool")).toBeInTheDocument();
		expect(screen.getByText("Hot Tub")).toBeInTheDocument();
	});

	it("shows 'Your Pools' heading when pools exist", () => {
		act(() => {
			useAppStore.getState().addPool(testPool);
		});
		render(<PoolList />);
		expect(screen.getByText("Your Pools")).toBeInTheDocument();
	});

	it("shows 'No tests yet' on pool cards", () => {
		act(() => {
			useAppStore.getState().addPool(testPool);
		});
		render(<PoolList />);
		expect(screen.getByText("No tests yet")).toBeInTheDocument();
	});
});
