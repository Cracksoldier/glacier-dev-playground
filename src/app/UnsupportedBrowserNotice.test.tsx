import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UnsupportedBrowserNotice from "./UnsupportedBrowserNotice";

describe("UnsupportedBrowserNotice", () => {
  it("announces itself and explains what to do", () => {
    render(<UnsupportedBrowserNotice missingFeatures={["Web Workers"]} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This browser can't run the playground",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Try a current version of Chrome, Edge, Firefox, or Safari.",
    );
  });

  it("lists every missing feature it was given", () => {
    render(
      <UnsupportedBrowserNotice
        missingFeatures={["Web Workers", "Sandboxed iframes"]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Web Workers",
      "Sandboxed iframes",
    ]);
  });
});
