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
import { ProjectStoreProvider } from "../store/ProjectStoreContext";
import styles from "./AppShell.module.css";
import PersistenceNotice from "./PersistenceNotice";
import Toolbar from "./Toolbar";
import { useEditorFocusShortcuts } from "./useEditorFocusShortcuts";
import { useEditorPreferences } from "./useEditorPreferences";

const WORKSPACE_PANEL_IDS = [
  "html-editor",
  "css-editor",
  "js-editor",
  "preview",
];

function AppShell() {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "glacier:workspace-layout:v1",
    panelIds: WORKSPACE_PANEL_IDS,
    storage: window.localStorage,
  });
  const { preferences, updatePreferences } = useEditorPreferences();
  const htmlEditorRef = useRef<CodeMirrorEditorHandle>(null);
  const cssEditorRef = useRef<CodeMirrorEditorHandle>(null);
  const jsEditorRef = useRef<CodeMirrorEditorHandle>(null);
  const previewRunHandleRef = useRef<PreviewRunHandle>(null);
  useEditorFocusShortcuts(htmlEditorRef, cssEditorRef, jsEditorRef);

  return (
    <ProjectStoreProvider>
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
              <HtmlEditorPanel preferences={preferences} ref={htmlEditorRef} />
            </Panel>
            <ResizeHandle label="Resize HTML and CSS editor panels" />
            <Panel
              id="css-editor"
              defaultSize={25}
              minSize={10}
              className={styles.panel}
            >
              <CssEditorPanel preferences={preferences} ref={cssEditorRef} />
            </Panel>
            <ResizeHandle label="Resize CSS and JavaScript editor panels" />
            <Panel
              id="js-editor"
              defaultSize={25}
              minSize={10}
              className={styles.panel}
            >
              <JsEditorPanel preferences={preferences} ref={jsEditorRef} />
            </Panel>
            <ResizeHandle label="Resize JavaScript editor and preview panels" />
            <Panel
              id="preview"
              defaultSize={25}
              minSize={10}
              className={styles.panel}
            >
              <PreviewPanel ref={previewRunHandleRef} />
            </Panel>
          </Group>
          <ConsolePanel />
        </main>
        <div id="dialog-root" />
      </div>
    </ProjectStoreProvider>
  );
}

export default AppShell;
