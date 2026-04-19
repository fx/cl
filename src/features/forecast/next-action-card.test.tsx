import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { NextAction } from "../../types";
import { NextActionCard } from "./next-action-card";

vi.mock("wouter", () => ({
	Link: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

const doseAction: NextAction = {
	type: "dose",
	priority: "urgent",
	title: "Add chlorine today",
	description: "FC will drop below 3.0 ppm by tomorrow afternoon.",
	doseEvent: {
		time: "2026-04-20T18:00:00Z",
		fcBefore: 2.1,
		fcAfter: 6.0,
		ppmToAdd: 3.9,
		productAmount: "32 fl oz",
		productAmountMl: 946,
		cyaIncrease: 0,
	},
};

const testAction: NextAction = {
	type: "test",
	priority: "warning",
	title: "Test your water",
	description: "Last test was 4 days ago. Test to update your forecast.",
};

const okAction: NextAction = {
	type: "ok",
	priority: "info",
	title: "Chlorine levels look good",
	description: "FC stays in range for the full 7-day forecast.",
};

describe("NextActionCard", () => {
	it("renders dose state with red styling and product amount", () => {
		render(<NextActionCard nextAction={doseAction} poolId="pool-1" />);
		expect(screen.getByText("Add chlorine today")).toBeInTheDocument();
		expect(screen.getByText(/FC will drop below 3.0 ppm/)).toBeInTheDocument();
		expect(screen.getByText("Add 32 fl oz")).toBeInTheDocument();

		const card = screen.getByTestId("next-action-card");
		expect(card.className).toContain("red");
	});

	it("renders test state with yellow styling and log test button", () => {
		render(<NextActionCard nextAction={testAction} poolId="pool-1" />);
		expect(screen.getByText("Test your water")).toBeInTheDocument();
		expect(screen.getByText(/Last test was 4 days ago/)).toBeInTheDocument();

		const card = screen.getByTestId("next-action-card");
		expect(card.className).toContain("yellow");

		expect(screen.getByText("Log Test")).toBeInTheDocument();
	});

	it("renders ok state with green styling and no CTA buttons", () => {
		render(<NextActionCard nextAction={okAction} poolId="pool-1" />);
		expect(screen.getByText("Chlorine levels look good")).toBeInTheDocument();
		expect(
			screen.getByText(/FC stays in range for the full 7-day forecast/),
		).toBeInTheDocument();

		const card = screen.getByTestId("next-action-card");
		expect(card.className).toContain("green");

		expect(screen.queryByText("Log Test")).not.toBeInTheDocument();
	});

	it("renders dose state with log test button", () => {
		render(<NextActionCard nextAction={doseAction} poolId="pool-1" />);
		const link = screen.getByText("Log Test");
		expect(link).toBeInTheDocument();
		expect(link.closest("a")).toHaveAttribute("href", "/pools/pool-1/test");
	});

	it("renders correct icon for each action type", () => {
		const { unmount } = render(
			<NextActionCard nextAction={doseAction} poolId="pool-1" />,
		);
		expect(screen.getByRole("img", { name: "dose" })).toBeInTheDocument();
		unmount();

		const { unmount: unmount2 } = render(
			<NextActionCard nextAction={testAction} poolId="pool-1" />,
		);
		expect(screen.getByRole("img", { name: "test" })).toBeInTheDocument();
		unmount2();

		render(<NextActionCard nextAction={okAction} poolId="pool-1" />);
		expect(screen.getByRole("img", { name: "ok" })).toBeInTheDocument();
	});
});
