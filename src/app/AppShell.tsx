import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Group, Panel, useDefaultLayout } from "react-resizable-panels";
import ResizeHandle from "../components/common/ResizeHandle";
import ConsoleBody from "../components/console/ConsoleBody";
import ConsolePanel from "../components/console/ConsolePanel";
import type { CodeMirrorEditorHandle } from "../components/editors/CodeMirrorEditor";
import CssEditorPanel from "../components/editors/CssEditorPanel";
import HtmlEditorPanel from "../components/editors/HtmlEditorPanel";
import JsEditorPanel from "../components/editors/JsEditorPanel";
import type { PreviewRunHandle } from "../components/preview/PreviewFrame";
import PreviewPanel, {
  type PreviewPresentation,
} from "../components/preview/PreviewPanel";
import type { ActiveTab } from "../preferences/layoutPreferences";
import { workspaceLayoutStorage } from "../preferences/layoutStorage";
import type { MappedSourceLocation } from "../preview/mapErrorToSource";
import {
  ProjectStoreProvider,
  useProjectStore,
} from "../store/ProjectStoreContext";
import { useRunShortcut } from "../store/useRunShortcut";
import styles from "./AppShell.module.css";
import PersistenceNotice from "./PersistenceNotice";
import Toolbar from "./Toolbar";
import { useActiveTab } from "./useActiveTab";
import { useConsoleEntries } from "./useConsoleEntries";
import { useEditorFocusShortcuts } from "./useEditorFocusShortcuts";
import { useEditorPreferences } from "./useEditorPreferences";
import { useNarrowLayout } from "./useNarrowLayout";
import { useScssCompileStatus } from "./useScssCompileStatus";
import { useTsCompileStatus } from "./useTsCompileStatus";
import WorkspaceTabs, { tabId, tabPanelId } from "./WorkspaceTabs";

const WORKSPACE_PANEL_IDS = [
  "html-editor",
  "css-editor",
  "js-editor",
  "preview",
];

/**
 * Wrapper the narrow-layout CSS shows/hides. It is deliberately a plain div
 * nested inside `Panel` rather than `Panel` itself: react-resizable-panels
 * sets `display` inline on the elements it renders, so external CSS can't
 * override it. Tab roles are applied only on narrow layouts, where the tab
 * bar that labels them is actually rendered.
 */
function TabPanel({
  tab,
  isNarrow,
  className,
  children,
}: {
  tab: ActiveTab;
  isNarrow: boolean;
  className: string;
  children: ReactNode;
}) {
  const tabRoleProps = isNarrow
    ? { role: "tabpanel", "aria-labelledby": tabId(tab) }
    : {};
  return (
    <div
      className={className}
      data-tab-panel={tab}
      id={tabPanelId(tab)}
      {...tabRoleProps}
    >
      {children}
    </div>
  );
}

function AppShell() {
  return (
    <ProjectStoreProvider>
      <AppShellContent />
    </ProjectStoreProvider>
  );
}

/**
 * Split out from `AppShell` because `useScssCompileStatus`'s reset key needs
 * `activeProject.id`/`stylesheetLanguage` via `useProjectStore()`, which
 * requires being a descendant of the `ProjectStoreProvider` `AppShell`
 * itself renders — `AppShell` can't call the hook directly.
 */
function AppShellContent() {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "glacier:workspace-layout:v1",
    panelIds: WORKSPACE_PANEL_IDS,
    storage: workspaceLayoutStorage,
  });
  const { preferences, updatePreferences } = useEditorPreferences();
  const { activeTab, setActiveTab } = useActiveTab();
  const isNarrow = useNarrowLayout();
  const [previewPresentation, setPreviewPresentation] =
    useState<PreviewPresentation>("default");
  const { activeProject } = useProjectStore();
  const htmlEditorRef = useRef<CodeMirrorEditorHandle>(null);
  const cssEditorRef = useRef<CodeMirrorEditorHandle>(null);
  const jsEditorRef = useRef<CodeMirrorEditorHandle>(null);
  const previewRunHandleRef = useRef<PreviewRunHandle>(null);
  useEditorFocusShortcuts(
    htmlEditorRef,
    cssEditorRef,
    jsEditorRef,
    previewRunHandleRef,
    { isNarrow, setActiveTab },
  );
  useRunShortcut(() => previewRunHandleRef.current?.runNow());

  const consoleEntries = useConsoleEntries();
  const scssStatus = useScssCompileStatus(
    `${activeProject.id}:${activeProject.source.stylesheetLanguage}`,
  );
  const tsStatus = useTsCompileStatus(
    `${activeProject.id}:${activeProject.source.scriptLanguage}:${activeProject.source.executionMode}`,
  );

  function handleFocusSource(location: MappedSourceLocation) {
    const editorRef = {
      html: htmlEditorRef,
      style: cssEditorRef,
      script: jsEditorRef,
    }[location.panel];
    editorRef.current?.focusLine(location.line);
  }

  const hasHtmlError = consoleEntries.entries.some(
    (entry) =>
      entry.type === "runtime-error" && entry.mappedLocation?.panel === "html",
  );
  const hasCssError =
    consoleEntries.entries.some(
      (entry) =>
        entry.type === "runtime-error" &&
        entry.mappedLocation?.panel === "style",
    ) || scssStatus.lastError !== null;
  const hasJsError =
    consoleEntries.entries.some(
      (entry) =>
        entry.type === "runtime-error" &&
        entry.mappedLocation?.panel === "script",
    ) || tsStatus.isStale;
  const jsDiagnosticErrors = tsStatus.diagnostics.map((diagnostic) => ({
    message: diagnostic.message,
    line: diagnostic.line,
    column: diagnostic.column,
    severity: diagnostic.category,
  }));

  return (
    <div className={styles.shell}>
      <header>
        <Toolbar
          editorPreferences={preferences}
          onUpdateEditorPreferences={updatePreferences}
          onRun={() => previewRunHandleRef.current?.runNow()}
        />
      </header>
      <PersistenceNotice />
      <main className={styles.main} data-active-tab={activeTab}>
        <div
          className={styles.workspace}
          data-preview-presentation={previewPresentation}
        >
          <Group
            orientation="horizontal"
            className={styles.group}
            defaultLayout={defaultLayout}
            onLayoutChanged={onLayoutChanged}
          >
            <Panel
              id="html-editor"
              defaultSize="25%"
              minSize="10%"
              className={styles.panel}
            >
              <TabPanel
                tab="html"
                isNarrow={isNarrow}
                className={styles.tabPanel}
              >
                <HtmlEditorPanel
                  preferences={preferences}
                  hasError={hasHtmlError}
                  ref={htmlEditorRef}
                />
              </TabPanel>
            </Panel>
            <ResizeHandle label="Resize HTML and CSS editor panels" />
            <Panel
              id="css-editor"
              defaultSize="25%"
              minSize="10%"
              className={styles.panel}
            >
              <TabPanel
                tab="css"
                isNarrow={isNarrow}
                className={styles.tabPanel}
              >
                <CssEditorPanel
                  preferences={preferences}
                  hasError={hasCssError}
                  diagnosticError={scssStatus.lastError}
                  compiledCss={scssStatus.compiledCss}
                  isStale={scssStatus.isStale}
                  ref={cssEditorRef}
                />
              </TabPanel>
            </Panel>
            <ResizeHandle label="Resize CSS and JavaScript editor panels" />
            <Panel
              id="js-editor"
              defaultSize="25%"
              minSize="10%"
              className={styles.panel}
            >
              <TabPanel
                tab="js"
                isNarrow={isNarrow}
                className={styles.tabPanel}
              >
                <JsEditorPanel
                  preferences={preferences}
                  hasError={hasJsError}
                  diagnosticErrors={jsDiagnosticErrors}
                  isStale={tsStatus.isStale}
                  ref={jsEditorRef}
                />
              </TabPanel>
            </Panel>
            <ResizeHandle label="Resize JavaScript editor and preview panels" />
            <Panel
              id="preview"
              defaultSize="25%"
              minSize="10%"
              className={`${styles.panel} ${styles.previewPanel}`}
            >
              <TabPanel
                tab="preview"
                isNarrow={isNarrow}
                className={styles.tabPanel}
              >
                <PreviewPanel
                  ref={previewRunHandleRef}
                  consoleEntries={consoleEntries}
                  presentation={previewPresentation}
                  onPresentationChange={setPreviewPresentation}
                  isScssStale={scssStatus.isStale}
                  isScriptStale={tsStatus.isStale}
                  onScssCompileError={(error) =>
                    scssStatus.recordFailure(error)
                  }
                  onScssCompileSuccess={(css) => scssStatus.recordSuccess(css)}
                  onScriptDiagnostics={(diagnostics) =>
                    tsStatus.recordResult(diagnostics)
                  }
                />
              </TabPanel>
            </Panel>
          </Group>
          {isNarrow ? (
            /* The narrow console is a tab, so it needs no collapse affordance
               — and rendering both it and the accordion would duplicate the
               entry list and its controls. */
            <TabPanel
              tab="console"
              isNarrow={isNarrow}
              className={styles.consoleTabPanel}
            >
              <h2 className={styles.consoleTabPanelHeading}>Console</h2>
              <div className={styles.consoleTabPanelBody}>
                <ConsoleBody
                  entries={consoleEntries.entries}
                  onClear={consoleEntries.clear}
                  onFocusSource={handleFocusSource}
                />
              </div>
            </TabPanel>
          ) : (
            <ConsolePanel
              entries={consoleEntries.entries}
              onClear={consoleEntries.clear}
              onFocusSource={handleFocusSource}
            />
          )}
        </div>
        <WorkspaceTabs activeTab={activeTab} onSelect={setActiveTab} />
      </main>
      <div id="dialog-root" />
    </div>
  );
}

export default AppShell;
