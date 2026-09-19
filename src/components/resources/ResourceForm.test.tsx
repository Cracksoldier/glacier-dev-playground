import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ExternalResource } from "../../models/resource";
import ResourceForm from "./ResourceForm";

const EXISTING: ExternalResource = {
  id: "r1",
  name: "Lodash",
  url: "https://cdn.example.com/lodash.min.js",
  type: "script",
  enabled: true,
  order: 0,
};

describe("ResourceForm", () => {
  it("submits a new resource with the entered values", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <ResourceForm
        formId="f1"
        initial={null}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    await user.type(screen.getByLabelText("Name"), "My Script");
    await user.type(
      screen.getByLabelText("URL"),
      "https://example.com/script.js",
    );
    await user.click(screen.getByRole("button", { name: "Add resource" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "My Script",
      url: "https://example.com/script.js",
      type: "script",
      enabled: true,
      integrity: undefined,
      crossOrigin: undefined,
    });
  });

  it("falls back to the URL as the name when name is left blank", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <ResourceForm
        formId="f1"
        initial={null}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    await user.type(
      screen.getByLabelText("URL"),
      "https://example.com/script.js",
    );
    await user.click(screen.getByRole("button", { name: "Add resource" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "https://example.com/script.js" }),
    );
  });

  it("blocks submission and shows an error for an invalid URL", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <ResourceForm
        formId="f1"
        initial={null}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    await user.type(screen.getByLabelText("URL"), "lodash");
    await user.click(screen.getByRole("button", { name: "Add resource" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("pre-fills fields from the resource being edited and submits Save", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <ResourceForm
        formId="f1"
        initial={EXISTING}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Lodash");
    expect(screen.getByLabelText("URL")).toHaveValue(EXISTING.url);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Lodash", url: EXISTING.url }),
    );
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ResourceForm
        formId="f1"
        initial={null}
        onSubmit={() => {}}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalled();
  });

  it("submits optional integrity and crossOrigin values from the advanced section", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <ResourceForm
        formId="f1"
        initial={null}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    await user.type(
      screen.getByLabelText("URL"),
      "https://example.com/script.js",
    );
    await user.click(screen.getByText("Integrity / cross-origin"));
    await user.type(
      screen.getByLabelText("Integrity (optional)"),
      "sha384-abc",
    );
    await user.selectOptions(
      screen.getByLabelText("Cross-origin (optional)"),
      "anonymous",
    );
    await user.click(screen.getByRole("button", { name: "Add resource" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        integrity: "sha384-abc",
        crossOrigin: "anonymous",
      }),
    );
  });
});
