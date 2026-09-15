import { useCallback, useState } from "react";
import {
  type EditorPreferences,
  loadEditorPreferences,
  saveEditorPreferences,
} from "../preferences/editorPreferences";

export interface UseEditorPreferencesResult {
  preferences: EditorPreferences;
  updatePreferences: (partial: Partial<EditorPreferences>) => void;
}

export function useEditorPreferences(): UseEditorPreferencesResult {
  const [preferences, setPreferences] = useState(() => loadEditorPreferences());

  const updatePreferences = useCallback(
    (partial: Partial<EditorPreferences>) => {
      setPreferences((current) => {
        const next = { ...current, ...partial };
        saveEditorPreferences(next);
        return next;
      });
    },
    [],
  );

  return { preferences, updatePreferences };
}
