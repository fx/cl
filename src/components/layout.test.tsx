import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Layout } from "./layout";

describe("Layout", () => {
	it("renders the header with app name", () => {
		render(<Layout>content</Layout>);
		expect(screen.getByText("cl")).toBeInTheDocument();
	});

	it("renders children", () => {
		render(<Layout>test content</Layout>);
		expect(screen.getByText("test content")).toBeInTheDocument();
	});
});
