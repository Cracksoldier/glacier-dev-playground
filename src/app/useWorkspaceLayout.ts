import { useCallback, useState } from "react";
import {
  loadWorkspaceLayoutPreferences,
  saveWorkspaceLayoutPreferences,
  type WorkspaceLayout,
} from "../preferences/workspaceLayoutPreferences";

/** The editor arrangement a layout shows — or, for `preview`, keeps hidden. */
export type WorkspaceArrangement = Exclude<WorkspaceLayout, "preview">;

export interface UseWorkspaceLayoutResult {
  layout: WorkspaceLayout;
  /**
   * The layout itself, except in preview-only mode, where it is the last
   * editing layout: the hidden editors keep that arrangement so leaving
   * preview-only restores it without resizing anything.
   */
  arrangement: WorkspaceArrangement;
  setLayout: (layout: WorkspaceLayout) => void;
}

function toArrangement(layout: WorkspaceLayout): WorkspaceArrangement {
  return layout === "preview" ? "default" : layout;
}

export function useWorkspaceLayout(): UseWorkspaceLayoutResult {
  const [layout, setLayoutState] = useState<WorkspaceLayout>(
    () => loadWorkspaceLayoutPreferences().layout,
  );
  const [arrangement, setArrangement] = useState<WorkspaceArrangement>(() =>
    toArrangement(layout),
  );

  const setLayout = useCallback((next: WorkspaceLayout) => {
    setLayoutState(next);
    if (next !== "preview") setArrangement(next);
    saveWorkspaceLayoutPreferences({ layout: next });
  }, []);

  return { layout, arrangement, setLayout };
}
