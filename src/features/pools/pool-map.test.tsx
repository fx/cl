import { render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { PoolMap } from "./pool-map";

vi.mock("leaflet/dist/leaflet.css", () => ({}));
vi.mock("./leaflet-setup", () => ({
	TILE_URL: "https://tile.test/{z}/{x}/{y}.png",
	ATTRIBUTION: "Test Attribution",
}));

vi.mock("react-leaflet", () => ({
	MapContainer: ({
		children,
		center,
		zoom,
		dragging,
		scrollWheelZoom,
		zoomControl,
	}: {
		children: React.ReactNode;
		center: [number, number];
		zoom: number;
		dragging?: boolean;
		scrollWheelZoom?: boolean;
		className?: string;
		zoomControl?: boolean;
	}) => (
		<div
			data-testid="map-container"
			data-center={JSON.stringify(center)}
			data-zoom={zoom}
			data-dragging={String(!!dragging)}
			data-scroll-wheel-zoom={String(!!scrollWheelZoom)}
			data-zoom-control={String(!!zoomControl)}
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
	}: {
		position: [number, number];
		draggable?: boolean;
	}) => (
		<div
			data-testid="marker"
			data-position={JSON.stringify(position)}
			data-draggable={String(!!draggable)}
		/>
	),
}));

describe("PoolMap", () => {
	it("renders map centered at pool coordinates with zoom 16", () => {
		render(<PoolMap latitude={33.4484} longitude={-112.074} />);
		const map = screen.getByTestId("map-container");
		expect(map.dataset.center).toBe(JSON.stringify([33.4484, -112.074]));
		expect(map.dataset.zoom).toBe("16");
	});

	it("renders non-draggable marker at pool coordinates", () => {
		render(<PoolMap latitude={33.4484} longitude={-112.074} />);
		const marker = screen.getByTestId("marker");
		expect(marker.dataset.position).toBe(JSON.stringify([33.4484, -112.074]));
		expect(marker.dataset.draggable).toBe("false");
	});

	it("disables scroll wheel zoom, dragging, and zoom control", () => {
		render(<PoolMap latitude={33.4484} longitude={-112.074} />);
		const map = screen.getByTestId("map-container");
		expect(map.dataset.dragging).toBe("false");
		expect(map.dataset.scrollWheelZoom).toBe("false");
		expect(map.dataset.zoomControl).toBe("false");
	});

	it("renders tile layer", () => {
		render(<PoolMap latitude={33.4484} longitude={-112.074} />);
		expect(screen.getByTestId("tile-layer")).toBeInTheDocument();
	});

	it("renders container with pool-map testid", () => {
		render(<PoolMap latitude={33.4484} longitude={-112.074} />);
		expect(screen.getByTestId("pool-map")).toBeInTheDocument();
	});
});
