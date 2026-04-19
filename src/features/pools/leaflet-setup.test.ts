import { describe, expect, it, vi } from "vitest";

vi.mock("leaflet", () => {
	const proto: Record<string, unknown> = { _getIconUrl: "old" };
	return {
		default: {
			Icon: {
				Default: {
					prototype: proto,
					mergeOptions: vi.fn(),
				},
			},
		},
	};
});
vi.mock("leaflet/dist/images/marker-icon-2x.png", () => ({
	default: "marker-icon-2x.png",
}));
vi.mock("leaflet/dist/images/marker-icon.png", () => ({
	default: "marker-icon.png",
}));
vi.mock("leaflet/dist/images/marker-shadow.png", () => ({
	default: "marker-shadow.png",
}));

describe("leaflet-setup", () => {
	it("exports map constants", async () => {
		const setup = await import("./leaflet-setup");
		expect(setup.TILE_URL).toContain("openstreetmap.org");
		expect(setup.ATTRIBUTION).toContain("OpenStreetMap");
		expect(setup.DEFAULT_CENTER).toEqual([39.8283, -98.5795]);
		expect(setup.DEFAULT_ZOOM).toBe(4);
	});

	it("configures leaflet default icon", async () => {
		const L = await import("leaflet");
		expect(L.default.Icon.Default.mergeOptions).toHaveBeenCalledWith({
			iconUrl: "marker-icon.png",
			iconRetinaUrl: "marker-icon-2x.png",
			shadowUrl: "marker-shadow.png",
		});
	});
});
