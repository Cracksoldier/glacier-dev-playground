import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

// jsdom has no Worker; PreviewFrame's build pipeline unconditionally runs a
// TS/JS compile, so this always-real-preview-tree test must stub it out.
vi.mock("../preview/tsCompilerClient", () => ({
  createTsCompilerClient: () => ({
    compile: async (source: string) => ({
      diagnostics: [],
      emittedJs: source,
      lineMap: null,
    }),
    dispose: () => {},
  }),
}));

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
