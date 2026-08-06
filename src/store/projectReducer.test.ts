import { describe, expect, it } from "vitest";
import {
  DEFAULT_STARTER_TEMPLATE_ID,
  PROJECT_TEMPLATES,
} from "../models/templates";
import {
  createInitialProjectStoreState,
  type ProjectStoreState,
  projectReducer,
} from "./projectReducer";
import { getActiveProject, isProjectStoreDirty } from "./projectSelectors";

function initialState(): ProjectStoreState {
  return createInitialProjectStoreState();
}

describe("createInitialProjectStoreState", () => {
  it("seeds a single starter project as the active project", () => {
    const state = initialState();

    expect(state.projects).toHaveLength(1);
    expect(state.activeProjectId).toBe(state.projects[0].id);
    expect(state.revision).toBe(0);
    expect(state.lastPersistedRevision).toBe(0);
    expect(isProjectStoreDirty(state)).toBe(false);
  });
});

describe("project/create", () => {
  it("adds a new project from the given template and makes it active", () => {
    const state = initialState();

    const next = projectReducer(state, {
      type: "project/create",
      payload: { templateId: "empty" },
    });

    expect(next.projects).toHaveLength(2);
    const created = next.projects[1];
    expect(created.title).toBe("Empty Project");
    expect(next.activeProjectId).toBe(created.id);
    expect(next.revision).toBe(state.revision + 1);
  });

  it("defaults to the starter template when none is given", () => {
    const state = initialState();

    const next = projectReducer(state, {
      type: "project/create",
      payload: {},
    });

    expect(next.projects[1].title).toBe(
      PROJECT_TEMPLATES[DEFAULT_STARTER_TEMPLATE_ID].create().title,
    );
  });

  it("normalizes an explicit title", () => {
    const state = initialState();

    const next = projectReducer(state, {
      type: "project/create",
      payload: { templateId: "empty", title: "  My   Project  " },
    });

    expect(next.projects[1].title).toBe("My Project");
  });
});

describe("project/rename", () => {
  it("renames the target project and normalizes the title", () => {
    const state = initialState();
    const projectId = state.projects[0].id;

    const next = projectReducer(state, {
      type: "project/rename",
      payload: { projectId, title: "  Renamed  " },
    });

    expect(getActiveProject(next).title).toBe("Renamed");
    expect(next.revision).toBe(state.revision + 1);
  });

  it("is a no-op for an unknown project id", () => {
    const state = initialState();

    const next = projectReducer(state, {
      type: "project/rename",
      payload: { projectId: "does-not-exist", title: "Renamed" },
    });

    expect(next).toBe(state);
  });
});

describe("project/duplicate", () => {
  it("inserts a copy immediately after the source and activates it", () => {
    const state = initialState();
    const sourceId = state.projects[0].id;

    const next = projectReducer(state, {
      type: "project/duplicate",
      payload: { projectId: sourceId },
    });

    expect(next.projects).toHaveLength(2);
    expect(next.projects[0].id).toBe(sourceId);
    const duplicate = next.projects[1];
    expect(duplicate.title).toBe(`${state.projects[0].title} Copy`);
    expect(duplicate.id).not.toBe(sourceId);
    expect(next.activeProjectId).toBe(duplicate.id);
  });

  it("does not share mutable nested state with the source", () => {
    const state = initialState();
    const sourceId = state.projects[0].id;

    const next = projectReducer(state, {
      type: "project/duplicate",
      payload: { projectId: sourceId },
    });

    const source = next.projects[0];
    const duplicate = next.projects[1];
    expect(duplicate.source).not.toBe(source.source);
    expect(duplicate.resources).not.toBe(source.resources);
    expect(duplicate.settings).not.toBe(source.settings);
  });

  it("is a no-op for an unknown project id", () => {
    const state = initialState();

    const next = projectReducer(state, {
      type: "project/duplicate",
      payload: { projectId: "does-not-exist" },
    });

    expect(next).toBe(state);
  });
});

describe("project/delete", () => {
  it("selects the following project as active when the active project is deleted", () => {
    let state = initialState();
    state = projectReducer(state, {
      type: "project/create",
      payload: { templateId: "empty" },
    });
    state = projectReducer(state, {
      type: "project/create",
      payload: { templateId: "js-interaction" },
    });
    const [first, second, third] = state.projects;
    state = { ...state, activeProjectId: second.id };

    const next = projectReducer(state, {
      type: "project/delete",
      payload: { projectId: second.id },
    });

    expect(next.projects.map((p) => p.id)).toEqual([first.id, third.id]);
    expect(next.activeProjectId).toBe(third.id);
  });

  it("falls back to the preceding project when the last project is deleted", () => {
    let state = initialState();
    state = projectReducer(state, {
      type: "project/create",
      payload: { templateId: "empty" },
    });
    const [first, second] = state.projects;
    state = { ...state, activeProjectId: second.id };

    const next = projectReducer(state, {
      type: "project/delete",
      payload: { projectId: second.id },
    });

    expect(next.projects.map((p) => p.id)).toEqual([first.id]);
    expect(next.activeProjectId).toBe(first.id);
  });

  it("creates a fresh starter project when the final project is deleted", () => {
    const state = initialState();
    const onlyId = state.projects[0].id;

    const next = projectReducer(state, {
      type: "project/delete",
      payload: { projectId: onlyId },
    });

    expect(next.projects).toHaveLength(1);
    expect(next.projects[0].id).not.toBe(onlyId);
    expect(next.activeProjectId).toBe(next.projects[0].id);
  });

  it("does not change the active project when deleting an inactive project", () => {
    let state = initialState();
    state = projectReducer(state, {
      type: "project/create",
      payload: { templateId: "empty" },
    });
    const [first, second] = state.projects;
    state = { ...state, activeProjectId: first.id };

    const next = projectReducer(state, {
      type: "project/delete",
      payload: { projectId: second.id },
    });

    expect(next.activeProjectId).toBe(first.id);
  });

  it("is a no-op for an unknown project id", () => {
    const state = initialState();

    const next = projectReducer(state, {
      type: "project/delete",
      payload: { projectId: "does-not-exist" },
    });

    expect(next).toBe(state);
  });
});

describe("project/switch", () => {
  it("changes the active project without bumping revision", () => {
    let state = initialState();
    state = projectReducer(state, {
      type: "project/create",
      payload: { templateId: "empty" },
    });
    const revisionBeforeSwitch = state.revision;
    const targetId = state.projects[0].id;

    const next = projectReducer(state, {
      type: "project/switch",
      payload: { projectId: targetId },
    });

    expect(next.activeProjectId).toBe(targetId);
    expect(next.revision).toBe(revisionBeforeSwitch);
  });

  it("is a no-op for an unknown project id", () => {
    const state = initialState();

    const next = projectReducer(state, {
      type: "project/switch",
      payload: { projectId: "does-not-exist" },
    });

    expect(next).toBe(state);
  });
});

describe("project/resetFromTemplate", () => {
  it("preserves id, createdAt, and title while replacing source/resources/settings", () => {
    let state = initialState();
    const projectId = state.projects[0].id;
    state = projectReducer(state, {
      type: "project/rename",
      payload: { projectId, title: "My Demo" },
    });
    const before = getActiveProject(state);

    const next = projectReducer(state, {
      type: "project/resetFromTemplate",
      payload: { projectId, templateId: "scss-example" },
    });

    const after = getActiveProject(next);
    expect(after.id).toBe(before.id);
    expect(after.createdAt).toBe(before.createdAt);
    expect(after.title).toBe("My Demo");
    expect(after.source.stylesheetLanguage).toBe("scss");
  });

  it("is a no-op for an unknown project id", () => {
    const state = initialState();

    const next = projectReducer(state, {
      type: "project/resetFromTemplate",
      payload: { projectId: "does-not-exist", templateId: "empty" },
    });

    expect(next).toBe(state);
  });
});

describe("project/updateSource", () => {
  it("merges a partial source update immutably", () => {
    const state = initialState();
    const projectId = state.projects[0].id;
    const originalSource = state.projects[0].source;

    const next = projectReducer(state, {
      type: "project/updateSource",
      payload: { projectId, source: { html: "<p>Updated</p>" } },
    });

    const updated = getActiveProject(next);
    expect(updated.source).not.toBe(originalSource);
    expect(updated.source.html).toBe("<p>Updated</p>");
    expect(updated.source.stylesheet).toBe(originalSource.stylesheet);
    expect(state.projects[0].source).toBe(originalSource);
  });

  it("is a no-op for an unknown project id", () => {
    const state = initialState();

    const next = projectReducer(state, {
      type: "project/updateSource",
      payload: { projectId: "does-not-exist", source: { html: "x" } },
    });

    expect(next).toBe(state);
  });
});

describe("project/updateSettings", () => {
  it("merges a partial settings update immutably", () => {
    const state = initialState();
    const projectId = state.projects[0].id;
    const originalSettings = state.projects[0].settings;

    const next = projectReducer(state, {
      type: "project/updateSettings",
      payload: { projectId, settings: { autoRun: false } },
    });

    const updated = getActiveProject(next);
    expect(updated.settings).not.toBe(originalSettings);
    expect(updated.settings.autoRun).toBe(false);
    expect(updated.settings.previewDebounceMs).toBe(
      originalSettings.previewDebounceMs,
    );
  });

  it("is a no-op for an unknown project id", () => {
    const state = initialState();

    const next = projectReducer(state, {
      type: "project/updateSettings",
      payload: { projectId: "does-not-exist", settings: { autoRun: false } },
    });

    expect(next).toBe(state);
  });
});

describe("project/hydrate", () => {
  it("replaces the project list and zeroes the revision counters", () => {
    let state = initialState();
    state = projectReducer(state, {
      type: "project/rename",
      payload: { projectId: state.projects[0].id, title: "Dirty" },
    });
    expect(state.revision).toBeGreaterThan(0);

    const hydrated = [
      PROJECT_TEMPLATES.empty.create(),
      PROJECT_TEMPLATES["js-interaction"].create(),
    ];

    const next = projectReducer(state, {
      type: "project/hydrate",
      payload: { projects: hydrated, activeProjectId: hydrated[1].id },
    });

    expect(next.projects).toEqual(hydrated);
    expect(next.activeProjectId).toBe(hydrated[1].id);
    expect(next.revision).toBe(0);
    expect(next.lastPersistedRevision).toBe(0);
  });

  it("seeds a fresh starter project when given an empty payload", () => {
    const state = initialState();

    const next = projectReducer(state, {
      type: "project/hydrate",
      payload: { projects: [], activeProjectId: "irrelevant" },
    });

    expect(next.projects).toHaveLength(1);
    expect(next.activeProjectId).toBe(next.projects[0].id);
    expect(next.revision).toBe(0);
    expect(next.lastPersistedRevision).toBe(0);
  });

  it("falls back to the first project when the given active id is not present", () => {
    const state = initialState();
    const hydrated = [
      PROJECT_TEMPLATES.empty.create(),
      PROJECT_TEMPLATES["js-interaction"].create(),
    ];

    const next = projectReducer(state, {
      type: "project/hydrate",
      payload: { projects: hydrated, activeProjectId: "does-not-exist" },
    });

    expect(next.activeProjectId).toBe(hydrated[0].id);
  });
});

describe("project/markSaved", () => {
  it("advances lastPersistedRevision to the given revision", () => {
    let state = initialState();
    state = projectReducer(state, {
      type: "project/rename",
      payload: { projectId: state.projects[0].id, title: "Renamed" },
    });
    expect(state.revision).toBe(1);

    const next = projectReducer(state, {
      type: "project/markSaved",
      payload: { revision: 1 },
    });

    expect(next.lastPersistedRevision).toBe(1);
    expect(isProjectStoreDirty(next)).toBe(false);
  });

  it("never regresses lastPersistedRevision (guards against out-of-order resolution)", () => {
    let state = initialState();
    state = projectReducer(state, {
      type: "project/rename",
      payload: { projectId: state.projects[0].id, title: "Renamed" },
    });
    state = projectReducer(state, {
      type: "project/markSaved",
      payload: { revision: 1 },
    });

    const next = projectReducer(state, {
      type: "project/markSaved",
      payload: { revision: 0 },
    });

    expect(next.lastPersistedRevision).toBe(1);
  });
});

describe("dirty-state derivation", () => {
  it("is dirty after a mutating action and clean before any mutation", () => {
    const state = initialState();
    expect(isProjectStoreDirty(state)).toBe(false);

    const next = projectReducer(state, {
      type: "project/rename",
      payload: { projectId: state.projects[0].id, title: "Renamed" },
    });

    expect(isProjectStoreDirty(next)).toBe(true);
  });
});
