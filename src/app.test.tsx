import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./app";

describe("App", () => {
	it("renders without crashing", () => {
		render(<App />);
		expect(screen.getByText("cl")).toBeInTheDocument();
	});

	it("renders the pool list on the root route", () => {
		render(<App />);
		expect(screen.getByText("Pool List")).toBeInTheDocument();
	});
});
