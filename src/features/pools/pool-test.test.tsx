import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PoolTest } from "./pool-test";

describe("PoolTest", () => {
	it("renders placeholder text", () => {
		render(<PoolTest />);
		expect(screen.getByText("Log Test")).toBeInTheDocument();
	});
});
