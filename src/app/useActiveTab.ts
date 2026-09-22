import { useCallback, useState } from "react";
import {
  type ActiveTab,
  loadLayoutPreferences,
  saveLayoutPreferences,
} from "../preferences/layoutPreferences";

export interface UseActiveTabResult {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export function useActiveTab(): UseActiveTabResult {
  const [activeTab, setActiveTabState] = useState<ActiveTab>(
    () => loadLayoutPreferences().activeTab,
  );

  const setActiveTab = useCallback((tab: ActiveTab) => {
    setActiveTabState(tab);
    saveLayoutPreferences({ activeTab: tab });
  }, []);

  return { activeTab, setActiveTab };
}
