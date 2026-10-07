import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppFooter from "./AppFooter";

afterEach(() => {
  vi.useRealTimers();
});

describe("AppFooter", () => {
  it("shows the copyright notice for the current year", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2031-05-01T12:00:00Z"));
    render(<AppFooter />);
    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "© 2031 Cracksoldier",
    );
  });

  it("links to the source repository in a new tab", () => {
    render(<AppFooter />);
    const link = screen.getByRole("link", { name: "GitHub repository" });
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/Cracksoldier/glacier-dev-playground",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
