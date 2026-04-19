import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../../stores/app-store";
import type { Pool } from "../../types";
import { PoolEdit } from "./pool-edit";

vi.mock("wouter", () => ({
	useParams: () => ({ id: "pool-1" }),
	useLocation: () => ["/pools/pool-1/edit", vi.fn()],
	Link: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		className?: string;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
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
		act(() => {
			useAppStore.getState().reset();
		});
	});

	it("shows not found when pool does not exist", () => {
		render(<PoolEdit />);
		expect(screen.getByText("Pool not found")).toBeInTheDocument();
		expect(screen.getByText("Back to pools")).toBeInTheDocument();
	});

	it("renders edit form when pool exists", () => {
		act(() => {
			useAppStore.getState().addPool(testPool);
		});
		render(<PoolEdit />);
		expect(screen.getByText("Edit Pool")).toBeInTheDocument();
	});
});
