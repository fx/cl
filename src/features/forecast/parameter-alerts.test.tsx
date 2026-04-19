import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ChemistryStatus } from "../../types";
import { ParameterAlerts } from "./parameter-alerts";

function makeChemStatus(
	overrides: Partial<ChemistryStatus> = {},
): ChemistryStatus {
	return {
		poolId: "pool-1",
		computedAt: "2026-04-19T12:00:00Z",
		currentFc: 5,
		currentPh: 7.4,
		currentCya: 40,
		fcStatus: "ok",
		phStatus: "ok",
		lsi: 0.1,
		lsiStatus: "balanced",
		fcCyaRatio: 0.125,
		recommendations: [],
		...overrides,
	};
}

describe("ParameterAlerts", () => {
	it("renders nothing when all parameters ok", () => {
		const { container } = render(
			<ParameterAlerts chemStatus={makeChemStatus()} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders pH too high alert", () => {
		render(
			<ParameterAlerts
				chemStatus={makeChemStatus({ phStatus: "high", currentPh: 7.8 })}
			/>,
		);
		expect(screen.getByText("pH too high")).toBeInTheDocument();
		expect(screen.getByText(/pH is 7\.8/)).toBeInTheDocument();
		expect(screen.getByText(/muriatic acid/)).toBeInTheDocument();
	});

	it("renders pH too low alert", () => {
		render(
			<ParameterAlerts
				chemStatus={makeChemStatus({ phStatus: "low", currentPh: 7.0 })}
			/>,
		);
		expect(screen.getByText("pH too low")).toBeInTheDocument();
		expect(screen.getByText(/pH is 7/)).toBeInTheDocument();
		expect(screen.getByText(/soda ash/)).toBeInTheDocument();
	});

	it("renders corrosive LSI alert", () => {
		render(
			<ParameterAlerts
				chemStatus={makeChemStatus({
					lsiStatus: "corrosive",
					lsi: -0.5,
				})}
			/>,
		);
		expect(screen.getByText("Water is corrosive")).toBeInTheDocument();
		expect(screen.getByText(/LSI is -0\.5/)).toBeInTheDocument();
	});

	it("renders scaling LSI alert", () => {
		render(
			<ParameterAlerts
				chemStatus={makeChemStatus({
					lsiStatus: "scaling",
					lsi: 0.8,
				})}
			/>,
		);
		expect(screen.getByText("Water is scale-forming")).toBeInTheDocument();
		expect(screen.getByText(/LSI is 0\.8/)).toBeInTheDocument();
	});

	it("renders both pH and LSI alerts when both bad", () => {
		render(
			<ParameterAlerts
				chemStatus={makeChemStatus({
					phStatus: "high",
					currentPh: 7.9,
					lsiStatus: "scaling",
					lsi: 0.7,
				})}
			/>,
		);
		expect(screen.getByText("pH too high")).toBeInTheDocument();
		expect(screen.getByText("Water is scale-forming")).toBeInTheDocument();
	});

	it("renders test id when alerts present", () => {
		render(
			<ParameterAlerts
				chemStatus={makeChemStatus({ phStatus: "high", currentPh: 7.8 })}
			/>,
		);
		expect(screen.getByTestId("parameter-alerts")).toBeInTheDocument();
	});
});
