import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChemistryStatusBar } from "./chemistry-status-bar";

describe("ChemistryStatusBar", () => {
	it("renders FC, pH, CYA badges with ok status", () => {
		render(
			<ChemistryStatusBar
				fc={4.5}
				ph={7.4}
				cya={45}
				fcStatus="ok"
				phStatus="ok"
			/>,
		);
		expect(screen.getByText(/FC 4\.5 — ok/)).toBeInTheDocument();
		expect(screen.getByText(/pH 7\.4 — ok/)).toBeInTheDocument();
		expect(screen.getByText(/CYA 45 — ok/)).toBeInTheDocument();
	});

	it("renders yellow badge for high pH", () => {
		render(
			<ChemistryStatusBar
				fc={5}
				ph={7.8}
				cya={40}
				fcStatus="ok"
				phStatus="high"
			/>,
		);
		const phBadge = screen.getByText(/pH 7\.8 — high/);
		expect(phBadge.className).toContain("yellow");
	});

	it("renders red badge for critical FC", () => {
		render(
			<ChemistryStatusBar
				fc={1.0}
				ph={7.4}
				cya={40}
				fcStatus="critical"
				phStatus="ok"
			/>,
		);
		const fcBadge = screen.getByText(/FC 1 — critical/);
		expect(fcBadge.className).toContain("red");
	});

	it("renders high CYA as critical", () => {
		render(
			<ChemistryStatusBar
				fc={5}
				ph={7.4}
				cya={90}
				fcStatus="ok"
				phStatus="ok"
			/>,
		);
		const cyaBadge = screen.getByText(/CYA 90 — high/);
		expect(cyaBadge.className).toContain("red");
	});

	it("renders watch status for CYA between 60-80", () => {
		render(
			<ChemistryStatusBar
				fc={5}
				ph={7.4}
				cya={65}
				fcStatus="ok"
				phStatus="ok"
			/>,
		);
		expect(screen.getByText(/CYA 65 — watch/)).toBeInTheDocument();
	});

	it("omits badges for null values", () => {
		render(
			<ChemistryStatusBar
				fc={null}
				ph={null}
				cya={null}
				fcStatus="ok"
				phStatus="ok"
			/>,
		);
		expect(screen.queryByText(/FC/)).not.toBeInTheDocument();
		expect(screen.queryByText(/pH/)).not.toBeInTheDocument();
		expect(screen.queryByText(/CYA/)).not.toBeInTheDocument();
	});

	it("renders test id", () => {
		render(
			<ChemistryStatusBar
				fc={5}
				ph={7.4}
				cya={40}
				fcStatus="ok"
				phStatus="ok"
			/>,
		);
		expect(screen.getByTestId("chemistry-status-bar")).toBeInTheDocument();
	});
});
