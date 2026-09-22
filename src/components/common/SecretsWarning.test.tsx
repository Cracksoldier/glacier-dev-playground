import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SecretsWarning from "./SecretsWarning";

describe("SecretsWarning", () => {
  it("renders the supplied advisory text", () => {
    render(
      <SecretsWarning>Don't put secrets in frontend code.</SecretsWarning>,
    );

    expect(
      screen.getByText("Don't put secrets in frontend code."),
    ).toBeInTheDocument();
  });

  it("does not announce itself as an alert", () => {
    render(<SecretsWarning>Standing advice, not an event.</SecretsWarning>);

    expect(screen.queryByRole("alert")).toBeNull();
  });
});
