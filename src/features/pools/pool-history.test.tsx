import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Router } from "wouter";
import { PoolHistory } from "./pool-history";

describe("PoolHistory", () => {
	it("renders pool not found when no pool exists", () => {
		render(
			<Router ssrPath="/pools/fake-id/history">
				<PoolHistory />
			</Router>,
		);
		expect(screen.getByText("Pool not found")).toBeInTheDocument();
	});
});
