import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Pool } from "../../types";
import { PoolCard } from "./pool-card";

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

describe("PoolCard", () => {
	it("renders pool name", () => {
		render(<PoolCard pool={testPool} />);
		expect(screen.getByText("Main Pool")).toBeInTheDocument();
	});

	it("renders pool volume", () => {
		render(<PoolCard pool={testPool} />);
		expect(screen.getByText("15,000 gallons")).toBeInTheDocument();
	});

	it("renders 'No tests yet' label", () => {
		render(<PoolCard pool={testPool} />);
		expect(screen.getByText("No tests yet")).toBeInTheDocument();
	});

	it("links to pool detail page", () => {
		render(<PoolCard pool={testPool} />);
		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", "/pools/pool-1");
	});
});
