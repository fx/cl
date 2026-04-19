import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ForecastWarning } from "../../types";
import { WarningBanner } from "./warning-banner";

const mockWarnings: ForecastWarning[] = [
	{
		type: "stale_test",
		severity: "warning",
		title: "Test data getting stale",
		description: "Last FC test was 4 days ago.",
	},
	{
		type: "cya_rising",
		severity: "info",
		title: "CYA rising",
		description: "CYA projected to reach 75 ppm.",
	},
	{
		type: "ph_out_of_range",
		severity: "urgent",
		title: "pH too high",
		description: "pH is 7.8. Add muriatic acid.",
	},
];

describe("WarningBanner", () => {
	it("renders nothing when no warnings", () => {
		const { container } = render(<WarningBanner warnings={[]} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders all warning banners", () => {
		render(<WarningBanner warnings={mockWarnings} />);
		expect(screen.getByText("Test data getting stale")).toBeInTheDocument();
		expect(screen.getByText("CYA rising")).toBeInTheDocument();
		expect(screen.getByText("pH too high")).toBeInTheDocument();
	});

	it("renders warning descriptions", () => {
		render(<WarningBanner warnings={mockWarnings} />);
		expect(
			screen.getByText("Last FC test was 4 days ago."),
		).toBeInTheDocument();
		expect(
			screen.getByText("CYA projected to reach 75 ppm."),
		).toBeInTheDocument();
	});

	it("renders dismiss buttons for each warning", () => {
		render(<WarningBanner warnings={mockWarnings} />);
		const dismissButtons = screen.getAllByRole("button", {
			name: /Dismiss/,
		});
		expect(dismissButtons).toHaveLength(3);
	});

	it("dismisses a warning when clicking dismiss button", () => {
		render(<WarningBanner warnings={mockWarnings} />);
		const dismissButton = screen.getByLabelText("Dismiss CYA rising");
		fireEvent.click(dismissButton);

		expect(screen.queryByText("CYA rising")).not.toBeInTheDocument();
		expect(screen.getByText("Test data getting stale")).toBeInTheDocument();
		expect(screen.getByText("pH too high")).toBeInTheDocument();
	});

	it("hides banner section when all warnings dismissed", () => {
		render(<WarningBanner warnings={[mockWarnings[0]]} />);
		const dismissButton = screen.getByLabelText(
			"Dismiss Test data getting stale",
		);
		fireEvent.click(dismissButton);

		expect(screen.queryByTestId("warning-banner")).not.toBeInTheDocument();
	});

	it("renders test id when warnings visible", () => {
		render(<WarningBanner warnings={mockWarnings} />);
		expect(screen.getByTestId("warning-banner")).toBeInTheDocument();
	});
});
