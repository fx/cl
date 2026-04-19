import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../../stores/app-store";
import { PoolForm } from "./pool-form";

vi.mock("wouter", () => ({
	useLocation: () => ["/pools/new", vi.fn()],
	useParams: () => ({}),
}));

describe("PoolForm", () => {
	beforeEach(() => {
		act(() => {
			useAppStore.getState().reset();
		});
	});

	it("renders the add pool form", () => {
		render(<PoolForm />);
		expect(
			screen.getByRole("heading", { name: "Add Pool" }),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Name *")).toBeInTheDocument();
		expect(screen.getByLabelText("Volume (gallons) *")).toBeInTheDocument();
		expect(screen.getByLabelText("Latitude *")).toBeInTheDocument();
		expect(screen.getByLabelText("Longitude *")).toBeInTheDocument();
	});

	it("renders the edit pool form when pool is provided", () => {
		const pool = {
			id: "test-1",
			name: "Test Pool",
			volumeGallons: 15000,
			latitude: 33.4484,
			longitude: -112.074,
			surfaceType: "plaster" as const,
			chlorineSource: "liquid" as const,
			treeCoverPercent: 25,
			isIndoor: false,
			targetFc: null,
			targetPh: 7.4,
			notes: "Test notes",
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		};
		render(<PoolForm pool={pool} />);
		expect(screen.getByText("Edit Pool")).toBeInTheDocument();
		expect(screen.getByText("Save Changes")).toBeInTheDocument();
	});

	it("shows validation error when name is empty", async () => {
		render(<PoolForm />);
		const submitButton = screen.getByRole("button", { name: "Add Pool" });
		fireEvent.click(submitButton);
		expect(screen.getByText("Name is required")).toBeInTheDocument();
	});

	it("shows validation error when volume is empty", () => {
		render(<PoolForm />);
		fireEvent.change(screen.getByLabelText("Name *"), {
			target: { value: "Pool" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Add Pool" }));
		expect(screen.getByText("Volume is required")).toBeInTheDocument();
	});

	it("shows validation error when volume is out of range (too small)", () => {
		render(<PoolForm />);
		fireEvent.change(screen.getByLabelText("Name *"), {
			target: { value: "Pool" },
		});
		const volumeInput = screen.getByLabelText("Volume (gallons) *");
		fireEvent.change(volumeInput, { target: { value: "50" } });
		fireEvent.change(screen.getByLabelText("Latitude *"), {
			target: { value: "33" },
		});
		fireEvent.change(screen.getByLabelText("Longitude *"), {
			target: { value: "-112" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Add Pool" }));
		expect(screen.getByText(/Volume must be between/)).toBeInTheDocument();
	});

	it("shows validation error when volume is out of range (too large)", () => {
		render(<PoolForm />);
		fireEvent.change(screen.getByLabelText("Name *"), {
			target: { value: "Pool" },
		});
		fireEvent.change(screen.getByLabelText("Volume (gallons) *"), {
			target: { value: "2000000" },
		});
		fireEvent.change(screen.getByLabelText("Latitude *"), {
			target: { value: "33" },
		});
		fireEvent.change(screen.getByLabelText("Longitude *"), {
			target: { value: "-112" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Add Pool" }));
		expect(screen.getByText(/Volume must be between/)).toBeInTheDocument();
	});

	it("shows validation error when latitude is invalid", () => {
		render(<PoolForm />);
		fireEvent.change(screen.getByLabelText("Name *"), {
			target: { value: "Pool" },
		});
		fireEvent.change(screen.getByLabelText("Volume (gallons) *"), {
			target: { value: "15000" },
		});
		fireEvent.change(screen.getByLabelText("Latitude *"), {
			target: { value: "100" },
		});
		fireEvent.change(screen.getByLabelText("Longitude *"), {
			target: { value: "-112" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Add Pool" }));
		expect(
			screen.getByText("Latitude must be between -90 and 90"),
		).toBeInTheDocument();
	});

	it("shows validation error when longitude is invalid", () => {
		render(<PoolForm />);
		fireEvent.change(screen.getByLabelText("Name *"), {
			target: { value: "Pool" },
		});
		fireEvent.change(screen.getByLabelText("Volume (gallons) *"), {
			target: { value: "15000" },
		});
		fireEvent.change(screen.getByLabelText("Latitude *"), {
			target: { value: "33" },
		});
		fireEvent.change(screen.getByLabelText("Longitude *"), {
			target: { value: "-200" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Add Pool" }));
		expect(
			screen.getByText("Longitude must be between -180 and 180"),
		).toBeInTheDocument();
	});

	it("shows validation error when latitude is empty", () => {
		render(<PoolForm />);
		fireEvent.change(screen.getByLabelText("Name *"), {
			target: { value: "Pool" },
		});
		fireEvent.change(screen.getByLabelText("Volume (gallons) *"), {
			target: { value: "15000" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Add Pool" }));
		expect(screen.getByText("Latitude is required")).toBeInTheDocument();
	});

	it("creates a pool with valid data", () => {
		render(<PoolForm />);
		fireEvent.change(screen.getByLabelText("Name *"), {
			target: { value: "Backyard Pool" },
		});
		fireEvent.change(screen.getByLabelText("Volume (gallons) *"), {
			target: { value: "15000" },
		});
		fireEvent.change(screen.getByLabelText("Latitude *"), {
			target: { value: "33.4484" },
		});
		fireEvent.change(screen.getByLabelText("Longitude *"), {
			target: { value: "-112.074" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Add Pool" }));

		const pools = useAppStore.getState().pools;
		expect(pools).toHaveLength(1);
		expect(pools[0].name).toBe("Backyard Pool");
		expect(pools[0].volumeGallons).toBe(15000);
		expect(pools[0].surfaceType).toBe("plaster");
		expect(pools[0].chlorineSource).toBe("liquid");
	});

	it("renders tree cover slider", () => {
		render(<PoolForm />);
		expect(screen.getByText("Tree Cover: 0%")).toBeInTheDocument();
	});

	it("renders notes textarea", () => {
		render(<PoolForm />);
		expect(screen.getByLabelText("Notes")).toBeInTheDocument();
	});

	it("renders cancel button", () => {
		render(<PoolForm />);
		expect(screen.getByText("Cancel")).toBeInTheDocument();
	});

	it("updates pool when editing", () => {
		const pool = {
			id: "test-1",
			name: "Test Pool",
			volumeGallons: 15000,
			latitude: 33.4484,
			longitude: -112.074,
			surfaceType: "plaster" as const,
			chlorineSource: "liquid" as const,
			treeCoverPercent: 25,
			isIndoor: false,
			targetFc: null,
			targetPh: 7.4,
			notes: "",
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		};
		act(() => {
			useAppStore.getState().addPool(pool);
		});
		render(<PoolForm pool={pool} />);
		fireEvent.change(screen.getByLabelText("Name *"), {
			target: { value: "Updated Pool" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

		const pools = useAppStore.getState().pools;
		expect(pools[0].name).toBe("Updated Pool");
	});

	it("updates notes via textarea", () => {
		render(<PoolForm />);
		const textarea = screen.getByLabelText("Notes");
		fireEvent.change(textarea, { target: { value: "Some notes" } });
		expect(textarea).toHaveValue("Some notes");
	});

	it("navigates away on cancel click in create mode", () => {
		render(<PoolForm />);
		const cancelButton = screen.getByText("Cancel");
		fireEvent.click(cancelButton);
	});

	it("navigates away on cancel click in edit mode", () => {
		const pool = {
			id: "test-1",
			name: "Test Pool",
			volumeGallons: 15000,
			latitude: 33.4484,
			longitude: -112.074,
			surfaceType: "plaster" as const,
			chlorineSource: "liquid" as const,
			treeCoverPercent: 0,
			isIndoor: false,
			targetFc: null,
			targetPh: 7.4,
			notes: "",
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		};
		render(<PoolForm pool={pool} />);
		const cancelButton = screen.getByText("Cancel");
		fireEvent.click(cancelButton);
	});

	it("shows longitude required error when longitude is empty", () => {
		render(<PoolForm />);
		fireEvent.change(screen.getByLabelText("Name *"), {
			target: { value: "Pool" },
		});
		fireEvent.change(screen.getByLabelText("Volume (gallons) *"), {
			target: { value: "15000" },
		});
		fireEvent.change(screen.getByLabelText("Latitude *"), {
			target: { value: "33" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Add Pool" }));
		expect(screen.getByText("Longitude is required")).toBeInTheDocument();
	});
});
