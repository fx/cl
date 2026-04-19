import { fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { LocationPicker } from "./location-picker";

vi.mock("leaflet/dist/leaflet.css", () => ({}));
vi.mock("./leaflet-setup", () => ({
	TILE_URL: "https://tile.test/{z}/{x}/{y}.png",
	ATTRIBUTION: "Test Attribution",
	DEFAULT_CENTER: [39.8283, -98.5795] as [number, number],
	DEFAULT_ZOOM: 4,
}));

let capturedClickHandler:
	| ((e: { latlng: { lat: number; lng: number } }) => void)
	| null = null;

vi.mock("react-leaflet", () => ({
	MapContainer: ({
		children,
		center,
		zoom,
	}: {
		children: React.ReactNode;
		center: [number, number];
		zoom: number;
		className?: string;
		scrollWheelZoom?: boolean;
	}) => (
		<div
			data-testid="map-container"
			data-center={JSON.stringify(center)}
			data-zoom={zoom}
		>
			{children}
		</div>
	),
	TileLayer: ({ url }: { url: string; attribution?: string }) => (
		<div data-testid="tile-layer" data-url={url} />
	),
	Marker: ({
		position,
		draggable,
		eventHandlers,
	}: {
		position: [number, number];
		draggable?: boolean;
		eventHandlers?: {
			dragend: (e: {
				target: { getLatLng: () => { lat: number; lng: number } };
			}) => void;
		};
	}) => (
		<button
			type="button"
			data-testid="marker"
			data-position={JSON.stringify(position)}
			data-draggable={String(!!draggable)}
			onClick={() =>
				eventHandlers?.dragend?.({
					target: {
						getLatLng: () => ({
							lat: position[0] + 1,
							lng: position[1] + 1,
						}),
					},
				})
			}
		/>
	),
	useMapEvents: (handlers: {
		click: (e: { latlng: { lat: number; lng: number } }) => void;
	}) => {
		capturedClickHandler = handlers.click;
		return null;
	},
	useMap: () => ({ flyTo: vi.fn(), getZoom: () => 4 }),
}));

describe("LocationPicker", () => {
	it("renders map with default center when no coordinates", () => {
		render(
			<LocationPicker
				latitude={null}
				longitude={null}
				onLocationChange={vi.fn()}
			/>,
		);
		const map = screen.getByTestId("map-container");
		expect(map.dataset.center).toBe(JSON.stringify([39.8283, -98.5795]));
		expect(map.dataset.zoom).toBe("4");
		expect(screen.queryByTestId("marker")).not.toBeInTheDocument();
	});

	it("renders map centered on provided coordinates", () => {
		render(
			<LocationPicker
				latitude={33.4484}
				longitude={-112.074}
				onLocationChange={vi.fn()}
			/>,
		);
		const map = screen.getByTestId("map-container");
		expect(map.dataset.center).toBe(JSON.stringify([33.4484, -112.074]));
		expect(map.dataset.zoom).toBe("13");
		const marker = screen.getByTestId("marker");
		expect(marker.dataset.position).toBe(JSON.stringify([33.4484, -112.074]));
		expect(marker.dataset.draggable).toBe("true");
	});

	it("calls onLocationChange when map is clicked", () => {
		const onChange = vi.fn();
		render(
			<LocationPicker
				latitude={null}
				longitude={null}
				onLocationChange={onChange}
			/>,
		);
		capturedClickHandler?.({ latlng: { lat: 40, lng: -100 } });
		expect(onChange).toHaveBeenCalledWith(40, -100);
	});

	it("calls onLocationChange when marker is dragged", () => {
		const onChange = vi.fn();
		render(
			<LocationPicker
				latitude={33.4484}
				longitude={-112.074}
				onLocationChange={onChange}
			/>,
		);
		const marker = screen.getByTestId("marker");
		fireEvent.click(marker);
		expect(onChange).toHaveBeenCalledWith(34.4484, -111.074);
	});

	it("renders tile layer with correct URL", () => {
		render(
			<LocationPicker
				latitude={null}
				longitude={null}
				onLocationChange={vi.fn()}
			/>,
		);
		const tile = screen.getByTestId("tile-layer");
		expect(tile.dataset.url).toBe("https://tile.test/{z}/{x}/{y}.png");
	});
});
