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
import { createTsCompilerClient } from "../../preview/tsCompilerClient";
import type { TsDiagnostic } from "../../preview/tsWorkerProtocol";
import styles from "./PreviewFrame.module.css";

export interface PreviewRunHandle {
  runNow: () => void;
}

/**
 * The resolved source (compiled CSS/JS already substituted in) an emitted
 * message's build actually used, plus the TS-mode source-line map (`null`
 * for JS-mode or a failed emit) needed to translate a `runtime-error`
 * line back through the emitted JS to its authored TypeScript source line.
 */
export interface ResolvedPreviewBuild {
  resolvedSource: ProjectSource;
  scriptLineMap: (number | undefined)[] | null;
}

interface PreviewFrameProps {
  project: PlaygroundProject;
  /** Fires synchronously once a build's iframe candidate starts loading. */
  onBuildStart?: (executionId: string) => void;
  /**
   * Fires for every message accepted from the current (non-stale) preview
   * iframe, alongside the resolved build info that produced the emitting
   * iframe — callers need this, not the raw project source, to correctly map
   * a `runtime-error` line back to a source panel/line.
   */
  onMessage?: (
    message: PreviewMessage,
    resolvedBuild: ResolvedPreviewBuild,
  ) => void;
  /** Fires when an SCSS compile fails; no candidate iframe is built for that build, so the previously-visible preview stays up. */
  onScssCompileError?: (error: ScssCompileError, compilationId: string) => void;
  /** Fires when an SCSS compile succeeds, with the compiled CSS. */
  onScssCompileSuccess?: (css: string, compilationId: string) => void;
  /**
   * Fires with every diagnostic from a script (TS/JS) compile, in order —
   * both non-blocking warnings and blocking errors. If any diagnostic in the
   * batch is a `category: "error"`, no candidate iframe is built for that
   * build and the previously-visible preview stays up (same "stale" pattern
   * as `onScssCompileError`).
   */
  onScriptDiagnostics?: (
    diagnostics: TsDiagnostic[],
    compilationId: string,
  ) => void;
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
  onScriptDiagnostics,
  ref,
}: PreviewFrameProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const visibleFrameRef = useRef<HTMLIFrameElement | null>(null);
  const visibleResolvedBuildRef = useRef<ResolvedPreviewBuild | null>(null);
  const pendingCandidateRef = useRef<{
    executionId: string;
    iframe: HTMLIFrameElement;
    resolvedBuild: ResolvedPreviewBuild;
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
  const onScriptDiagnosticsRef = useRef(onScriptDiagnostics);
  onScriptDiagnosticsRef.current = onScriptDiagnostics;

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

  // Created lazily on the first build (every project, JS or TS, compiles
  // through this worker — see `tsCompiler.ts`'s doc comment on why there's
  // no lighter JS-only path) and reused for this component instance's
  // lifetime; torn down in the unmount cleanup effect below.
  const tsClientRef = useRef<ReturnType<typeof createTsCompilerClient> | null>(
    null,
  );

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

    if (!tsClientRef.current) {
      tsClientRef.current = createTsCompilerClient();
    }
    const scriptResult = await tsClientRef.current.compile(
      source.script,
      source.scriptLanguage,
      source.executionMode,
      compilationId,
    );
    if (disposedRef.current || coordinator.isStale(executionId)) return;

    onScriptDiagnosticsRef.current?.(scriptResult.diagnostics, compilationId);
    if (scriptResult.diagnostics.some((d) => d.category === "error")) return;

    // JS-mode keeps the authored source as the executed payload — the
    // worker's JS emit is diagnostic-only, never trusted as the executed
    // code (see `tsCompiler.ts`).
    const resolvedScript =
      source.scriptLanguage === "typescript" && scriptResult.emittedJs !== null
        ? scriptResult.emittedJs
        : source.script;
    const scriptLineMap =
      source.scriptLanguage === "typescript" ? scriptResult.lineMap : null;

    const resolvedSource: ProjectSource = {
      ...source,
      stylesheet: resolvedStylesheet,
      script: resolvedScript,
    };
    const resolvedBuild: ResolvedPreviewBuild = {
      resolvedSource,
      scriptLineMap,
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
      visibleResolvedBuildRef.current = resolvedBuild;
      pendingCandidateRef.current = null;
      previous?.remove();
    }

    iframe.addEventListener("load", handleLoad);
    pendingCandidateRef.current = { executionId, iframe, resolvedBuild };
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
      visibleResolvedBuildRef.current = null;
      pendingCandidateRef.current?.iframe.remove();
      pendingCandidateRef.current = null;
      scssClientRef.current?.dispose();
      scssClientRef.current = null;
      tsClientRef.current?.dispose();
      tsClientRef.current = null;
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

      const resolvedBuild = isFromVisibleFrame
        ? visibleResolvedBuildRef.current
        : pendingCandidateRef.current?.resolvedBuild;
      if (!resolvedBuild) return;

      onMessageRef.current?.(event.data, resolvedBuild);
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return <div ref={hostRef} className={styles.host} />;
}

export default PreviewFrame;
