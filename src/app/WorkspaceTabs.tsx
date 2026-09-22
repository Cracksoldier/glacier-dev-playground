import type { KeyboardEvent } from "react";
import { useRef } from "react";
import type { ActiveTab } from "../preferences/layoutPreferences";
import styles from "./WorkspaceTabs.module.css";

export interface WorkspaceTab {
  id: ActiveTab;
  label: string;
}

export const WORKSPACE_TABS: readonly WorkspaceTab[] = [
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS/SCSS" },
  { id: "js", label: "JS/TS" },
  { id: "preview", label: "Preview" },
  { id: "console", label: "Console" },
];

export function tabId(tab: ActiveTab): string {
  return `workspace-tab-${tab}`;
}

export function tabPanelId(tab: ActiveTab): string {
  return `workspace-tabpanel-${tab}`;
}

interface WorkspaceTabsProps {
  activeTab: ActiveTab;
  onSelect: (tab: ActiveTab) => void;
}

/**
 * Narrow-layout tab bar for the HTML/CSS/JS/Preview/Console panels. Always
 * rendered — CSS hides it (and shows it) purely via the `AppShell.module.css`
 * narrow-width media query, so there's no JS viewport branching here and it
 * naturally drops out of the wide-layout tab order.
 */
function WorkspaceTabs({ activeTab, onSelect }: WorkspaceTabsProps) {
  const tabRefs = useRef<Map<ActiveTab, HTMLButtonElement>>(new Map());

  function focusAndSelect(tab: ActiveTab) {
    onSelect(tab);
    tabRefs.current.get(tab)?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = WORKSPACE_TABS.findIndex(
      (tab) => tab.id === activeTab,
    );
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const next = WORKSPACE_TABS[(currentIndex + 1) % WORKSPACE_TABS.length];
      focusAndSelect(next.id);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      const previous =
        WORKSPACE_TABS[
          (currentIndex - 1 + WORKSPACE_TABS.length) % WORKSPACE_TABS.length
        ];
      focusAndSelect(previous.id);
    }
  }

  return (
    <div
      className={styles.tablist}
      role="tablist"
      aria-label="Workspace panels"
    >
      {WORKSPACE_TABS.map((tab) => {
        const isSelected = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              if (element) tabRefs.current.set(tab.id, element);
              else tabRefs.current.delete(tab.id);
            }}
            type="button"
            role="tab"
            id={tabId(tab.id)}
            aria-selected={isSelected}
            aria-controls={tabPanelId(tab.id)}
            tabIndex={isSelected ? 0 : -1}
            className={
              isSelected ? `${styles.tab} ${styles.tabSelected}` : styles.tab
            }
            onClick={() => onSelect(tab.id)}
            onKeyDown={handleKeyDown}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default WorkspaceTabs;
