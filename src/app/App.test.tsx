import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the Glacier brand lockup inside the header landmark", () => {
    render(<App />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "GLACIER" }),
    ).toBeInTheDocument();
    expect(screen.getByText("DEV PLAYGROUND")).toBeInTheDocument();
  });
});
