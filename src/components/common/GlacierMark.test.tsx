import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GlacierMark from "./GlacierMark";

describe("GlacierMark", () => {
  it("is an image named Glacier by default", () => {
    render(<GlacierMark />);
    expect(screen.getByRole("img", { name: "Glacier" })).toBeInTheDocument();
  });

  it("uses a custom accessible name when given a title", () => {
    render(<GlacierMark title="Glacier DEV Playground" />);
    expect(
      screen.getByRole("img", { name: "Glacier DEV Playground" }),
    ).toBeInTheDocument();
  });

  it("renders a square of the requested size", () => {
    render(<GlacierMark size={28} />);
    const mark = screen.getByRole("img", { name: "Glacier" });
    expect(mark).toHaveAttribute("width", "28");
    expect(mark).toHaveAttribute("height", "28");
  });

  it("keeps its own styling class alongside a passed className", () => {
    render(<GlacierMark className="extra" />);
    const mark = screen.getByRole("img", { name: "Glacier" });
    expect(mark).toHaveClass("extra");
    expect(mark.getAttribute("class")?.split(" ")).toHaveLength(2);
  });
});
