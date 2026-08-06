import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ProjectRepository } from "../persistence/projectRepository";
import { createUnavailableProjectRepository } from "../persistence/projectRepository";
import { ProjectStoreProvider } from "../store/ProjectStoreContext";
import PersistenceNotice from "./PersistenceNotice";

function createRecoveringRepository(recoveredCount: number): ProjectRepository {
  return {
    async load() {
      return { snapshot: null, recoveredCount, rejectedNewerAppVersion: false };
    },
    async saveSnapshot() {},
    async resetAllData() {},
  };
}

beforeEach(() => {
  const root = document.createElement("div");
  root.id = "dialog-root";
  document.body.appendChild(root);
});

afterEach(() => {
  document.getElementById("dialog-root")?.remove();
});

describe("PersistenceNotice", () => {
  it("renders nothing when there is no notice", async () => {
    await act(async () => {
      render(
        <ProjectStoreProvider repository={createRecoveringRepository(0)}>
          <PersistenceNotice />
        </ProjectStoreProvider>,
      );
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a persistent notice when storage is unavailable", async () => {
    await act(async () => {
      render(
        <ProjectStoreProvider repository={createUnavailableProjectRepository()}>
          <PersistenceNotice />
        </ProjectStoreProvider>,
      );
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Local storage is unavailable",
    );
    expect(
      screen.queryByRole("button", { name: "Dismiss" }),
    ).not.toBeInTheDocument();
  });

  it("shows a dismissible notice with a reset action when records were recovered", async () => {
    await act(async () => {
      render(
        <ProjectStoreProvider repository={createRecoveringRepository(2)}>
          <PersistenceNotice />
        </ProjectStoreProvider>,
      );
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "2 saved projects could not be read",
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("resets local data after confirming", async () => {
    await act(async () => {
      render(
        <ProjectStoreProvider repository={createRecoveringRepository(1)}>
          <PersistenceNotice />
        </ProjectStoreProvider>,
      );
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Reset local data" }));

    const dialog = screen.getByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Reset local data" }),
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
