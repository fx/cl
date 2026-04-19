import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./app";
import { useAppStore } from "./stores/app-store";

describe("App", () => {
	beforeEach(() => {
		act(() => {
			useAppStore.getState().reset();
		});
	});

	it("renders without crashing", () => {
		render(<App />);
		expect(screen.getByText("cl")).toBeInTheDocument();
	});

	it("renders the pool list empty state on the root route", () => {
		render(<App />);
		expect(screen.getByText("Add your first pool")).toBeInTheDocument();
	});
});
