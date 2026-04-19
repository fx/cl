import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DoseEvent } from "../../types";
import { DoseSchedule } from "./dose-schedule";

const mockDoseEvents: DoseEvent[] = [
	{
		time: "2026-04-21T18:00:00Z",
		fcBefore: 2.5,
		fcAfter: 6.0,
		ppmToAdd: 3.5,
		productAmount: "32 fl oz",
		productAmountMl: 946,
		cyaIncrease: 0,
	},
	{
		time: "2026-04-24T18:00:00Z",
		fcBefore: 2.8,
		fcAfter: 6.0,
		ppmToAdd: 3.2,
		productAmount: "28 fl oz",
		productAmountMl: 828,
		cyaIncrease: 4,
	},
];

describe("DoseSchedule", () => {
	it("renders nothing when no dose events", () => {
		const { container } = render(<DoseSchedule doseEvents={[]} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders dose events with schedule title", () => {
		render(<DoseSchedule doseEvents={mockDoseEvents} />);
		expect(screen.getByText("Dose Schedule")).toBeInTheDocument();
		expect(screen.getByTestId("dose-schedule")).toBeInTheDocument();
	});

	it("renders product amounts", () => {
		render(<DoseSchedule doseEvents={mockDoseEvents} />);
		expect(screen.getByText("32 fl oz")).toBeInTheDocument();
		expect(screen.getByText("28 fl oz")).toBeInTheDocument();
	});

	it("renders FC before and after values", () => {
		render(<DoseSchedule doseEvents={mockDoseEvents} />);
		expect(screen.getByText(/2\.5 → 6\.0/)).toBeInTheDocument();
		expect(screen.getByText(/2\.8 → 6\.0/)).toBeInTheDocument();
	});

	it("renders CYA increase when present", () => {
		render(<DoseSchedule doseEvents={mockDoseEvents} />);
		expect(screen.getByText("+4 ppm CYA")).toBeInTheDocument();
	});

	it("does not show CYA increase when zero", () => {
		render(<DoseSchedule doseEvents={[mockDoseEvents[0]]} />);
		expect(screen.queryByText(/ppm CYA/)).not.toBeInTheDocument();
	});
});
