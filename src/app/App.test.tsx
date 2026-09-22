import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

// jsdom has no Worker at all, which `App`'s browser-support gate treats as an
// unsupported browser — so the supported-browser tests need it present.
class WorkerStub {
  postMessage() {}
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
}

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal("Worker", WorkerStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the Glacier brand lockup inside the header landmark", () => {
    render(<App />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "GLACIER" }),
    ).toBeInTheDocument();
    expect(screen.getByText("DEV PLAYGROUND")).toBeInTheDocument();
  });

  it("replaces the whole shell with the unsupported-browser notice", () => {
    vi.stubGlobal("Worker", undefined);
    render(<App />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This browser can't run the playground",
    );
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  });
});
