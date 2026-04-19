import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../../stores/app-store";
import type { Pool } from "../../types";
import { PoolDetail } from "./pool-detail";

const mockNavigate = vi.fn();

vi.mock("wouter", () => ({
	useParams: () => ({ id: "pool-1" }),
	useLocation: () => ["/pools/pool-1", mockNavigate],
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

vi.mock("./pool-map", () => ({
	PoolMap: ({
		latitude,
		longitude,
	}: { latitude: number; longitude: number }) => (
		<div
			data-testid="pool-map"
			data-lat={latitude}
			data-lng={longitude}
		/>
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
	treeCoverPercent: 25,
	isIndoor: false,
	targetFc: null,
	targetPh: 7.4,
	notes: "Test notes",
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
};

describe("PoolDetail", () => {
	beforeEach(() => {
		mockNavigate.mockClear();
		act(() => {
			useAppStore.getState().reset();
		});
	});

	it("renders pool not found when pool does not exist", () => {
		render(<PoolDetail />);
		expect(screen.getByText("Pool not found")).toBeInTheDocument();
	});

	it("renders pool details", () => {
		act(() => {
			useAppStore.getState().addPool(testPool);
		});
		render(<PoolDetail />);
		expect(screen.getByText("Main Pool")).toBeInTheDocument();
		expect(screen.getByText("15,000 gallons")).toBeInTheDocument();
		expect(screen.getByText("Plaster")).toBeInTheDocument();
		expect(screen.getByText("Liquid Chlorine (12.5%)")).toBeInTheDocument();
		expect(screen.getByText("25%")).toBeInTheDocument();
		expect(screen.getByText("Test notes")).toBeInTheDocument();
	});

	it("renders edit button", () => {
		act(() => {
			useAppStore.getState().addPool(testPool);
		});
		render(<PoolDetail />);
		expect(screen.getByText("Edit")).toBeInTheDocument();
	});

	it("renders delete button", () => {
		act(() => {
			useAppStore.getState().addPool(testPool);
		});
		render(<PoolDetail />);
		expect(screen.getByText("Delete")).toBeInTheDocument();
	});

	it("renders chemistry and forecast placeholders", () => {
		act(() => {
			useAppStore.getState().addPool(testPool);
		});
		render(<PoolDetail />);
		expect(screen.getByText("Water Chemistry")).toBeInTheDocument();
		expect(screen.getByText("Forecast")).toBeInTheDocument();
	});

	it("renders location coordinates", () => {
		act(() => {
			useAppStore.getState().addPool(testPool);
		});
		render(<PoolDetail />);
		expect(screen.getByText("33.4484, -112.074")).toBeInTheDocument();
	});

	it("renders back to pools link", () => {
		act(() => {
			useAppStore.getState().addPool(testPool);
		});
		render(<PoolDetail />);
		expect(screen.getByText("Back to pools")).toBeInTheDocument();
	});

	it("deletes pool when delete is confirmed", () => {
		act(() => {
			useAppStore.getState().addPool(testPool);
		});
		render(<PoolDetail />);
		// Click the trigger to open dialog
		const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
		fireEvent.click(deleteButtons[0]);
		// After dialog opens, a second Delete button appears as the confirm action
		const allDeleteButtons = screen.getAllByRole("button", { name: "Delete" });
		const confirmButton = allDeleteButtons[allDeleteButtons.length - 1];
		fireEvent.click(confirmButton);
		expect(useAppStore.getState().pools).toHaveLength(0);
	});

	it("does not show notes section when notes are empty", () => {
		const poolWithoutNotes = { ...testPool, notes: "" };
		act(() => {
			useAppStore.getState().addPool(poolWithoutNotes);
		});
		render(<PoolDetail />);
		expect(screen.queryByText("Notes")).not.toBeInTheDocument();
	});

	it("renders location map", () => {
		act(() => {
			useAppStore.getState().addPool(testPool);
		});
		render(<PoolDetail />);
		const map = screen.getByTestId("pool-map");
		expect(map.dataset.lat).toBe("33.4484");
		expect(map.dataset.lng).toBe("-112.074");
	});
});
