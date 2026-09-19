import {
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { PlaygroundProject, ProjectSource } from "../../models/project";
import type { ExternalResource } from "../../models/resource";
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
  resources: ExternalResource[];
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
  /**
   * Fires when a still-pending candidate's `resource-error` is fatal (a
   * `"script"`/`"module"` resource, classified by cross-referencing the
   * failed URL against that candidate's own resource list) — the candidate
   * is discarded immediately and the previously-visible preview stays up
   * (same "stale" pattern as `onScssCompileError`/`onScriptDiagnostics`). A
   * `"stylesheet"`/`"font-stylesheet"` resource failure is non-fatal and
   * never fires this — it's still surfaced to `onMessage` for console
   * logging.
   */
  onResourceLoadError?: (
    payload: { url: string; message: string; timestampMs: number },
    executionId: string,
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
interface PendingCandidate {
  executionId: string;
  iframe: HTMLIFrameElement;
  resolvedBuild: ResolvedPreviewBuild;
  /** Set by the candidate iframe's native `load` event. */
  loaded: boolean;
  /** Set once the candidate's `"resources-ready"` message arrives. */
  resourcesReady: boolean;
}

function PreviewFrame({
  project,
  onBuildStart,
  onMessage,
  onScssCompileError,
  onScssCompileSuccess,
  onScriptDiagnostics,
  onResourceLoadError,
  ref,
}: PreviewFrameProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const visibleFrameRef = useRef<HTMLIFrameElement | null>(null);
  const visibleResolvedBuildRef = useRef<ResolvedPreviewBuild | null>(null);
  const pendingCandidateRef = useRef<PendingCandidate | null>(null);
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
  const onResourceLoadErrorRef = useRef(onResourceLoadError);
  onResourceLoadErrorRef.current = onResourceLoadError;

  /**
   * The AND-gate: a candidate is only promoted once both its native `load`
   * (parser-discovered static resources — the stylesheet `<link>` tags —
   * finishing) and its `"resources-ready"` message (the JS-created
   * script/module resources and the user script itself finishing) have
   * landed. The two signals are not orderable relative to each other — a
   * zero-script-resource build's `"resources-ready"` can post before `load`
   * fires — so both call sites just flip their own flag and call this,
   * order-independent.
   */
  const tryPromote = useCallback((candidate: PendingCandidate) => {
    if (pendingCandidateRef.current !== candidate) return;
    if (!candidate.loaded || !candidate.resourcesReady) return;

    const currentCoordinator = coordinatorRef.current;
    if (
      !currentCoordinator ||
      currentCoordinator.isStale(candidate.executionId)
    ) {
      candidate.iframe.remove();
      pendingCandidateRef.current = null;
      return;
    }

    candidate.iframe.style.visibility = "visible";
    const previous = visibleFrameRef.current;
    visibleFrameRef.current = candidate.iframe;
    visibleResolvedBuildRef.current = candidate.resolvedBuild;
    pendingCandidateRef.current = null;
    previous?.remove();
  }, []);

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

    const { compilationId, executionId, source, resources } =
      coordinator.beginBuild(projectRef.current);
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
      resources,
    };
    const documentHtml = coordinator.buildDocument(
      resolvedSource,
      executionId,
      resources,
    );

    const iframe = createPreviewIframe();
    iframe.style.visibility = "hidden";

    function handleLoad() {
      iframe.removeEventListener("load", handleLoad);
      if (disposedRef.current) return;

      const candidate = pendingCandidateRef.current;
      if (!candidate || candidate.iframe !== iframe) {
        // A newer build superseded this candidate (or it was already
        // rejected by a fatal resource error) before it finished loading.
        iframe.remove();
        return;
      }

      candidate.loaded = true;
      tryPromote(candidate);
    }

    iframe.addEventListener("load", handleLoad);
    pendingCandidateRef.current = {
      executionId,
      iframe,
      resolvedBuild,
      loaded: false,
      resourcesReady: false,
    };
    host.appendChild(iframe);
    iframe.srcdoc = documentHtml;
  }, [tryPromote]);

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
  // only the next source/resource edit or a manual Run does. project.source
  // and project.resources stay in the dependency list purely as the reactive
  // triggers for those edits (resources included since adding/editing/
  // reordering/enabling a resource must also rebuild the candidate preview).
  // biome-ignore lint/correctness/useExhaustiveDependencies: see comment above.
  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      if (projectRef.current.settings.autoRun) runBuild();
      return;
    }
    if (!projectRef.current.settings.autoRun) return;
    debouncerRef.current?.schedule();
  }, [project.source, project.resources, runBuild]);

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
      const pendingCandidate = pendingCandidateRef.current;
      const isFromVisibleFrame =
        source === visibleFrameRef.current?.contentWindow;
      const isFromPendingCandidate =
        source === pendingCandidate?.iframe.contentWindow;
      if (!isFromVisibleFrame && !isFromPendingCandidate) return;

      if (!isPreviewMessage(event.data)) return;

      const coordinator = coordinatorRef.current;
      if (!coordinator || coordinator.isStale(event.data.executionId)) return;

      const resolvedBuild = isFromVisibleFrame
        ? visibleResolvedBuildRef.current
        : pendingCandidate?.resolvedBuild;
      if (!resolvedBuild) return;

      if (isFromPendingCandidate && pendingCandidate) {
        if (event.data.type === "resources-ready") {
          pendingCandidate.resourcesReady = true;
          tryPromote(pendingCandidate);
        } else if (event.data.type === "resource-error") {
          const failedResource = resolvedBuild.resources.find(
            (resource) => resource.url === event.data.payload.url,
          );
          const isFatal =
            failedResource?.type === "script" ||
            failedResource?.type === "module";
          if (isFatal) {
            pendingCandidate.iframe.remove();
            if (pendingCandidateRef.current === pendingCandidate) {
              pendingCandidateRef.current = null;
            }
            // Reported via onResourceLoadError, not onMessage — a fatal
            // resource-error only ever comes from a pending (never-visible)
            // candidate (resources-ready never follows it), so there's no
            // separate "informational" audience left to notify.
            onResourceLoadErrorRef.current?.(
              event.data.payload,
              pendingCandidate.executionId,
            );
            return;
          }
        }
      }

      onMessageRef.current?.(event.data, resolvedBuild);
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [tryPromote]);

  return <div ref={hostRef} className={styles.host} />;
}

export default PreviewFrame;
