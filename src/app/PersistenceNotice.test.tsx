import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PROJECT_TEMPLATES } from "../models/templates";
import type {
  LoadResult,
  ProjectRepository,
} from "../persistence/projectRepository";
import { createUnavailableProjectRepository } from "../persistence/projectRepository";
import { ProjectStoreProvider } from "../store/ProjectStoreContext";
import PersistenceNotice from "./PersistenceNotice";

function createRepository(result: LoadResult): ProjectRepository {
  return {
    async load() {
      return result;
    },
    async saveSnapshot() {},
    async resetAllData() {},
  };
}

/** Some records were unreadable, but at least one valid project loaded. */
function createRecoveringRepository(recoveredCount: number): ProjectRepository {
  const project = PROJECT_TEMPLATES.empty.create();
  return createRepository({
    snapshot: { projects: [project], activeProjectId: project.id },
    recoveredCount,
    rejectedNewerAppVersion: false,
  });
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

  it("shows a non-dismissible notice when every record was unreadable, since saving is blocked", async () => {
    await act(async () => {
      render(
        <ProjectStoreProvider
          repository={createRepository({
            snapshot: null,
            recoveredCount: 2,
            rejectedNewerAppVersion: false,
          })}
        >
          <PersistenceNotice />
        </ProjectStoreProvider>,
      );
    });

    const notice = screen.getByRole("alert");
    expect(notice).toHaveTextContent("2 saved projects could not be read");
    expect(notice).toHaveTextContent("won't be saved until you reset");
    expect(
      screen.queryByRole("button", { name: "Dismiss" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reset local data" }),
    ).toBeInTheDocument();
  });

  it("shows a non-dismissible notice for data from a newer app version", async () => {
    await act(async () => {
      render(
        <ProjectStoreProvider
          repository={createRepository({
            snapshot: null,
            recoveredCount: 0,
            rejectedNewerAppVersion: true,
          })}
        >
          <PersistenceNotice />
        </ProjectStoreProvider>,
      );
    });

    const notice = screen.getByRole("alert");
    expect(notice).toHaveTextContent("newer version of this app");
    expect(notice).toHaveTextContent("won't be saved until you reset");
    expect(
      screen.queryByRole("button", { name: "Dismiss" }),
    ).not.toBeInTheDocument();
  });

  it("resets local data after confirming", async () => {
    await act(async () => {
      render(
        <ProjectStoreProvider
          repository={createRepository({
            snapshot: null,
            recoveredCount: 1,
            rejectedNewerAppVersion: false,
          })}
        >
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
