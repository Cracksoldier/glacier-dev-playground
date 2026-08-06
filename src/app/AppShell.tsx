import { useState } from "react";
import { Group, type Layout, Panel } from "react-resizable-panels";
import ResizeHandle from "../components/common/ResizeHandle";
import ConsolePanel from "../components/console/ConsolePanel";
import EditorPanelPlaceholder from "../components/editors/EditorPanelPlaceholder";
import PreviewPanelPlaceholder from "../components/preview/PreviewPanelPlaceholder";
import { ProjectStoreProvider } from "../store/ProjectStoreContext";
import styles from "./AppShell.module.css";
import Toolbar from "./Toolbar";

function AppShell() {
  const [, setLayout] = useState<Layout | undefined>(undefined);

  return (
    <ProjectStoreProvider>
      <div className={styles.shell}>
        <header>
          <Toolbar />
        </header>
        <main className={styles.main}>
          <Group
            orientation="horizontal"
            className={styles.group}
            onLayoutChanged={setLayout}
          >
            <Panel
              id="html-editor"
              defaultSize={25}
              minSize={10}
              className={styles.panel}
            >
              <EditorPanelPlaceholder language="html" />
            </Panel>
            <ResizeHandle label="Resize HTML and CSS editor panels" />
            <Panel
              id="css-editor"
              defaultSize={25}
              minSize={10}
              className={styles.panel}
            >
              <EditorPanelPlaceholder language="css" />
            </Panel>
            <ResizeHandle label="Resize CSS and JavaScript editor panels" />
            <Panel
              id="js-editor"
              defaultSize={25}
              minSize={10}
              className={styles.panel}
            >
              <EditorPanelPlaceholder language="javascript" />
            </Panel>
            <ResizeHandle label="Resize JavaScript editor and preview panels" />
            <Panel
              id="preview"
              defaultSize={25}
              minSize={10}
              className={styles.panel}
            >
              <PreviewPanelPlaceholder />
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
