import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Router } from "wouter";
import { PoolTest } from "./pool-test";

describe("PoolTest", () => {
	it("renders pool not found when no pool exists", () => {
		render(
			<Router ssrPath="/pools/fake-id/test">
				<PoolTest />
			</Router>,
		);
		expect(screen.getByText("Pool not found")).toBeInTheDocument();
	});
});
