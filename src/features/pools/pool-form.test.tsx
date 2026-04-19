import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../../stores/app-store";
import { PoolForm } from "./pool-form";

vi.mock("wouter", () => ({
	useLocation: () => ["/pools/new", vi.fn()],
	useParams: () => ({}),
}));

const mockGetLocation = vi.fn();
let mockGeoLoading = false;
let mockGeoError: string | null = null;
let mockGeoPosition: { latitude: number; longitude: number } | null = null;

vi.mock("../../hooks/use-geolocation", () => ({
	useGeolocation: () => ({
		getLocation: mockGetLocation,
		loading: mockGeoLoading,
		error: mockGeoError,
		position: mockGeoPosition,
	}),
}));

let mockOnLocationChange: ((lat: number, lng: number) => void) | null = null;

vi.mock("./location-picker", () => ({
	LocationPicker: ({
		onLocationChange,
		latitude,
		longitude,
	}: {
		onLocationChange: (lat: number, lng: number) => void;
		latitude: number | null;
		longitude: number | null;
	}) => {
		mockOnLocationChange = onLocationChange;
		return (
			<div
				data-testid="location-picker"
				data-lat={latitude}
				data-lng={longitude}
			/>
		);
	},
}));

describe("PoolForm", () => {
	beforeEach(() => {
		mockGeoLoading = false;
		mockGeoError = null;
		mockGeoPosition = null;
		mockGetLocation.mockClear();
		mockOnLocationChange = null;
		act(() => {
			useAppStore.getState().reset();
		});
	});

	it("renders the add pool form", () => {
		render(<PoolForm />);
		const title = document.querySelector('[data-slot="card-title"]');
		expect(title).toHaveTextContent("Add Pool");
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

	it("renders Use my location button", () => {
		render(<PoolForm />);
		expect(screen.getByText("Use my location")).toBeInTheDocument();
	});

	it("calls getLocation when Use my location is clicked", () => {
		render(<PoolForm />);
		fireEvent.click(screen.getByText("Use my location"));
		expect(mockGetLocation).toHaveBeenCalled();
	});

	it("shows loading state on Use my location button", () => {
		mockGeoLoading = true;
		render(<PoolForm />);
		expect(screen.getByText("Getting location...")).toBeInTheDocument();
	});

	it("shows geolocation error message", () => {
		mockGeoError =
			"Location access denied. Place your pool on the map or enter coordinates manually.";
		render(<PoolForm />);
		expect(screen.getByText(/Location access denied/)).toBeInTheDocument();
	});

	it("renders location picker", () => {
		render(<PoolForm />);
		expect(screen.getByTestId("location-picker")).toBeInTheDocument();
	});

	it("updates lat/lng when location picker changes", () => {
		render(<PoolForm />);
		act(() => {
			mockOnLocationChange?.(40.123, -100.456);
		});
		expect(screen.getByLabelText("Latitude *")).toHaveValue(40.123);
		expect(screen.getByLabelText("Longitude *")).toHaveValue(-100.456);
	});

	it("updates lat/lng from geolocation position", () => {
		mockGeoPosition = { latitude: 35.0, longitude: -110.0 };
		render(<PoolForm />);
		expect(screen.getByLabelText("Latitude *")).toHaveValue(35);
		expect(screen.getByLabelText("Longitude *")).toHaveValue(-110);
	});
});
