import { useCallback, useState } from "react";
import {
  loadShellPreferences,
  saveShellPreferences,
} from "../preferences/shellPreferences";

export interface UseConsoleVisibilityResult {
  isConsoleVisible: boolean;
  toggleConsoleVisible: () => void;
}

export function useConsoleVisibility(): UseConsoleVisibilityResult {
  const [isConsoleVisible, setIsConsoleVisible] = useState(
    () => loadShellPreferences().consoleVisible,
  );

  const toggleConsoleVisible = useCallback(() => {
    setIsConsoleVisible((current) => {
      const next = !current;
      saveShellPreferences({ consoleVisible: next });
      return next;
    });
  }, []);

  return { isConsoleVisible, toggleConsoleVisible };
}
