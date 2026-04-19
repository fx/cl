import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../../stores/app-store";
import type { Pool } from "../../types";
import { PoolEdit } from "./pool-edit";

const mockNavigate = vi.fn();

vi.mock("wouter", () => ({
	useParams: () => ({ id: "pool-1" }),
	useLocation: () => ["/pools/pool-1/edit", mockNavigate],
}));

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

describe("PoolEdit", () => {
	beforeEach(() => {
		mockNavigate.mockClear();
		act(() => {
			useAppStore.getState().reset();
		});
	});

	it("redirects when pool is not found", () => {
		render(<PoolEdit />);
		expect(mockNavigate).toHaveBeenCalledWith("/");
	});

	it("renders edit form when pool exists", () => {
		act(() => {
			useAppStore.getState().addPool(testPool);
		});
		render(<PoolEdit />);
		expect(screen.getByText("Edit Pool")).toBeInTheDocument();
	});
});
