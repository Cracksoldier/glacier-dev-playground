import {
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { PlaygroundProject, ProjectSource } from "../../models/project";
import { createDebouncer } from "../../persistence/debounce";
import { createPreviewBuildCoordinator } from "../../preview/buildCoordinator";
import {
  isPreviewMessage,
  type PreviewMessage,
} from "../../preview/previewMessage";
import {
  PREVIEW_IFRAME_ALLOW,
  PREVIEW_IFRAME_REFERRER_POLICY,
  PREVIEW_IFRAME_SANDBOX,
} from "../../preview/previewSandbox";
import { createScssCompilerClient } from "../../preview/scssCompilerClient";
import type { ScssCompileError } from "../../preview/scssWorkerProtocol";
import styles from "./PreviewFrame.module.css";

export interface PreviewRunHandle {
  runNow: () => void;
}

interface PreviewFrameProps {
  project: PlaygroundProject;
  /** Fires synchronously once a build's iframe candidate starts loading. */
  onBuildStart?: (executionId: string) => void;
  /**
   * Fires for every message accepted from the current (non-stale) preview
   * iframe, alongside the resolved source (compiled CSS already substituted
   * in for SCSS-mode projects) that was used to build the emitting iframe —
   * callers need this, not the raw project source, to correctly map a
   * `runtime-error` line back to a source panel/line.
   */
  onMessage?: (message: PreviewMessage, resolvedSource: ProjectSource) => void;
  /** Fires when an SCSS compile fails; no candidate iframe is built for that build, so the previously-visible preview stays up. */
  onScssCompileError?: (error: ScssCompileError, compilationId: string) => void;
  /** Fires when an SCSS compile succeeds, with the compiled CSS. */
  onScssCompileSuccess?: (css: string, compilationId: string) => void;
  ref?: Ref<PreviewRunHandle>;
}

function createPreviewIframe(): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.className = styles.frame;
  iframe.title = "Preview";
  iframe.setAttribute("sandbox", PREVIEW_IFRAME_SANDBOX);
  iframe.setAttribute("allow", PREVIEW_IFRAME_ALLOW);
  iframe.setAttribute("referrerpolicy", PREVIEW_IFRAME_REFERRER_POLICY);
  return iframe;
}

/**
 * Owns the sandboxed preview iframe's lifecycle via direct DOM management
 * (mirroring `CodeMirrorEditor.tsx`'s precedent), rather than declarative
 * JSX iframes, so each run gets a guaranteed-fresh browsing context and a
 * discarded candidate's timers/execution context are reliably torn down by
 * removing its element from the DOM.
 *
 * The parent is expected to `key` this component on project id so switching
 * projects remounts it (fresh coordinator, debouncer, and iframes) rather
 * than this component trying to detect and react to project switches
 * itself — see `CodeMirrorEditor.tsx` for the same convention.
 */
function PreviewFrame({
  project,
  onBuildStart,
  onMessage,
  onScssCompileError,
  onScssCompileSuccess,
  ref,
}: PreviewFrameProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const visibleFrameRef = useRef<HTMLIFrameElement | null>(null);
  const visibleResolvedSourceRef = useRef<ProjectSource | null>(null);
  const pendingCandidateRef = useRef<{
    executionId: string;
    iframe: HTMLIFrameElement;
    resolvedSource: ProjectSource;
  } | null>(null);
  const disposedRef = useRef(false);

  const projectRef = useRef(project);
  useEffect(() => {
    projectRef.current = project;
  });

  const onBuildStartRef = useRef(onBuildStart);
  onBuildStartRef.current = onBuildStart;
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onScssCompileErrorRef = useRef(onScssCompileError);
  onScssCompileErrorRef.current = onScssCompileError;
  const onScssCompileSuccessRef = useRef(onScssCompileSuccess);
  onScssCompileSuccessRef.current = onScssCompileSuccess;

  const coordinatorRef = useRef<ReturnType<
    typeof createPreviewBuildCoordinator
  > | null>(null);
  if (coordinatorRef.current === null) {
    coordinatorRef.current = createPreviewBuildCoordinator();
  }

  // Created lazily on the first SCSS-mode build (avoids spawning a Worker
  // for CSS-mode projects, which never need it) and reused for this
  // component instance's lifetime; torn down in the unmount cleanup effect
  // below.
  const scssClientRef = useRef<ReturnType<
    typeof createScssCompilerClient
  > | null>(null);

  const runBuild = useCallback(async () => {
    const host = hostRef.current;
    const coordinator = coordinatorRef.current;
    if (!host || !coordinator || disposedRef.current) return;

    const { compilationId, executionId, source } = coordinator.beginBuild(
      projectRef.current,
    );
    onBuildStartRef.current?.(executionId);

    let resolvedStylesheet = source.stylesheet;
    if (source.stylesheetLanguage === "scss") {
      if (!scssClientRef.current) {
        scssClientRef.current = createScssCompilerClient();
      }
      const result = await scssClientRef.current.compile(
        source.stylesheet,
        compilationId,
      );
      // Re-check after the await: a newer build may have started (or this
      // instance may have unmounted) while the compile was in flight.
      if (disposedRef.current || coordinator.isStale(executionId)) return;

      if (result.type === "failure") {
        onScssCompileErrorRef.current?.(result.error, compilationId);
        return;
      }
      onScssCompileSuccessRef.current?.(result.css, compilationId);
      resolvedStylesheet = result.css;
    }

    const resolvedSource: ProjectSource = {
      ...source,
      stylesheet: resolvedStylesheet,
    };
    const documentHtml = coordinator.buildDocument(resolvedSource, executionId);

    const iframe = createPreviewIframe();
    iframe.style.visibility = "hidden";

    function handleLoad() {
      iframe.removeEventListener("load", handleLoad);
      if (disposedRef.current) return;

      const currentCoordinator = coordinatorRef.current;
      if (!currentCoordinator || currentCoordinator.isStale(executionId)) {
        iframe.remove();
        if (pendingCandidateRef.current?.iframe === iframe) {
          pendingCandidateRef.current = null;
        }
        return;
      }

      iframe.style.visibility = "visible";
      const previous = visibleFrameRef.current;
      visibleFrameRef.current = iframe;
      visibleResolvedSourceRef.current = resolvedSource;
      pendingCandidateRef.current = null;
      previous?.remove();
    }

    iframe.addEventListener("load", handleLoad);
    pendingCandidateRef.current = { executionId, iframe, resolvedSource };
    host.appendChild(iframe);
    iframe.srcdoc = documentHtml;
  }, []);

  const debouncerRef = useRef<ReturnType<typeof createDebouncer<void>> | null>(
    null,
  );
  if (debouncerRef.current === null) {
    debouncerRef.current = createDebouncer(
      project.settings.previewDebounceMs,
      () => runBuild(),
    );
  }

  useImperativeHandle(
    ref,
    () => ({
      runNow: () => {
        debouncerRef.current?.cancel();
        runBuild();
      },
    }),
    [runBuild],
  );

  const isFirstRunRef = useRef(true);
  // Reads autoRun via projectRef (fresh, non-reactive) rather than depending
  // on it directly, so toggling auto-run alone never itself triggers a run —
  // only the next source edit or a manual Run does. project.source stays in
  // the dependency list purely as the reactive trigger for that edit.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see comment above.
  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      if (projectRef.current.settings.autoRun) runBuild();
      return;
    }
    if (!projectRef.current.settings.autoRun) return;
    debouncerRef.current?.schedule();
  }, [project.source, runBuild]);

  useEffect(() => {
    // React StrictMode double-invokes effects in development (mount ->
    // cleanup -> mount again on the same instance), so disposedRef must be
    // un-set here, not just set in the cleanup below — otherwise the second
    // mount permanently sees itself as disposed and every runBuild() call
    // becomes a silent no-op (only surfaces in dev; production builds only
    // run effects once).
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      debouncerRef.current?.cancel();
      visibleFrameRef.current?.remove();
      visibleFrameRef.current = null;
      visibleResolvedSourceRef.current = null;
      pendingCandidateRef.current?.iframe.remove();
      pendingCandidateRef.current = null;
      scssClientRef.current?.dispose();
      scssClientRef.current = null;
    };
  }, []);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const source = event.source;
      const isFromVisibleFrame =
        source === visibleFrameRef.current?.contentWindow;
      const isFromPendingCandidate =
        source === pendingCandidateRef.current?.iframe.contentWindow;
      if (!isFromVisibleFrame && !isFromPendingCandidate) return;

      if (!isPreviewMessage(event.data)) return;

      const coordinator = coordinatorRef.current;
      if (!coordinator || coordinator.isStale(event.data.executionId)) return;

      const resolvedSource = isFromVisibleFrame
        ? visibleResolvedSourceRef.current
        : pendingCandidateRef.current?.resolvedSource;
      if (!resolvedSource) return;

      onMessageRef.current?.(event.data, resolvedSource);
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return <div ref={hostRef} className={styles.host} />;
}

export default PreviewFrame;
