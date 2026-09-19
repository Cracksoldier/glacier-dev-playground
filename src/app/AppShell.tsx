import { useRef } from "react";
import { Group, Panel, useDefaultLayout } from "react-resizable-panels";
import ResizeHandle from "../components/common/ResizeHandle";
import ConsolePanel from "../components/console/ConsolePanel";
import type { CodeMirrorEditorHandle } from "../components/editors/CodeMirrorEditor";
import CssEditorPanel from "../components/editors/CssEditorPanel";
import HtmlEditorPanel from "../components/editors/HtmlEditorPanel";
import JsEditorPanel from "../components/editors/JsEditorPanel";
import type { PreviewRunHandle } from "../components/preview/PreviewFrame";
import PreviewPanel from "../components/preview/PreviewPanel";
import type { MappedSourceLocation } from "../preview/mapErrorToSource";
import {
  ProjectStoreProvider,
  useProjectStore,
} from "../store/ProjectStoreContext";
import styles from "./AppShell.module.css";
import PersistenceNotice from "./PersistenceNotice";
import Toolbar from "./Toolbar";
import { useConsoleEntries } from "./useConsoleEntries";
import { useEditorFocusShortcuts } from "./useEditorFocusShortcuts";
import { useEditorPreferences } from "./useEditorPreferences";
import { useScssCompileStatus } from "./useScssCompileStatus";
import { useTsCompileStatus } from "./useTsCompileStatus";

const WORKSPACE_PANEL_IDS = [
  "html-editor",
  "css-editor",
  "js-editor",
  "preview",
];

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
    storage: window.localStorage,
  });
  const { preferences, updatePreferences } = useEditorPreferences();
  const { activeProject } = useProjectStore();
  const htmlEditorRef = useRef<CodeMirrorEditorHandle>(null);
  const cssEditorRef = useRef<CodeMirrorEditorHandle>(null);
  const jsEditorRef = useRef<CodeMirrorEditorHandle>(null);
  const previewRunHandleRef = useRef<PreviewRunHandle>(null);
  useEditorFocusShortcuts(htmlEditorRef, cssEditorRef, jsEditorRef);

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
      <main className={styles.main}>
        <Group
          orientation="horizontal"
          className={styles.group}
          defaultLayout={defaultLayout}
          onLayoutChanged={onLayoutChanged}
        >
          <Panel
            id="html-editor"
            defaultSize={25}
            minSize={10}
            className={styles.panel}
          >
            <HtmlEditorPanel
              preferences={preferences}
              hasError={hasHtmlError}
              ref={htmlEditorRef}
            />
          </Panel>
          <ResizeHandle label="Resize HTML and CSS editor panels" />
          <Panel
            id="css-editor"
            defaultSize={25}
            minSize={10}
            className={styles.panel}
          >
            <CssEditorPanel
              preferences={preferences}
              hasError={hasCssError}
              diagnosticError={scssStatus.lastError}
              compiledCss={scssStatus.compiledCss}
              isStale={scssStatus.isStale}
              ref={cssEditorRef}
            />
          </Panel>
          <ResizeHandle label="Resize CSS and JavaScript editor panels" />
          <Panel
            id="js-editor"
            defaultSize={25}
            minSize={10}
            className={styles.panel}
          >
            <JsEditorPanel
              preferences={preferences}
              hasError={hasJsError}
              diagnosticErrors={jsDiagnosticErrors}
              isStale={tsStatus.isStale}
              ref={jsEditorRef}
            />
          </Panel>
          <ResizeHandle label="Resize JavaScript editor and preview panels" />
          <Panel
            id="preview"
            defaultSize={25}
            minSize={10}
            className={styles.panel}
          >
            <PreviewPanel
              ref={previewRunHandleRef}
              consoleEntries={consoleEntries}
              isScssStale={scssStatus.isStale}
              isScriptStale={tsStatus.isStale}
              onScssCompileError={(error) => scssStatus.recordFailure(error)}
              onScssCompileSuccess={(css) => scssStatus.recordSuccess(css)}
              onScriptDiagnostics={(diagnostics) =>
                tsStatus.recordResult(diagnostics)
              }
            />
          </Panel>
        </Group>
        <ConsolePanel
          entries={consoleEntries.entries}
          onClear={consoleEntries.clear}
          onFocusSource={handleFocusSource}
        />
      </main>
      <div id="dialog-root" />
    </div>
  );
}

export default AppShell;
