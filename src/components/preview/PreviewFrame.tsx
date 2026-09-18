import {
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { PlaygroundProject } from "../../models/project";
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
import styles from "./PreviewFrame.module.css";

export interface PreviewRunHandle {
  runNow: () => void;
}

interface PreviewFrameProps {
  project: PlaygroundProject;
  /** Fires synchronously once a build's iframe candidate starts loading. */
  onBuildStart?: (executionId: string) => void;
  /** Fires for every message accepted from the current (non-stale) preview iframe. */
  onMessage?: (message: PreviewMessage) => void;
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
  ref,
}: PreviewFrameProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const visibleFrameRef = useRef<HTMLIFrameElement | null>(null);
  const pendingCandidateRef = useRef<{
    executionId: string;
    iframe: HTMLIFrameElement;
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

  const coordinatorRef = useRef<ReturnType<
    typeof createPreviewBuildCoordinator
  > | null>(null);
  if (coordinatorRef.current === null) {
    coordinatorRef.current = createPreviewBuildCoordinator();
  }

  const runBuild = useCallback(() => {
    const host = hostRef.current;
    const coordinator = coordinatorRef.current;
    if (!host || !coordinator || disposedRef.current) return;

    const { executionId, document: documentHtml } = coordinator.startBuild(
      projectRef.current,
    );
    onBuildStartRef.current?.(executionId);

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
      pendingCandidateRef.current = null;
      previous?.remove();
    }

    iframe.addEventListener("load", handleLoad);
    pendingCandidateRef.current = { executionId, iframe };
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
      pendingCandidateRef.current?.iframe.remove();
      pendingCandidateRef.current = null;
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

      onMessageRef.current?.(event.data);
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return <div ref={hostRef} className={styles.host} />;
}

export default PreviewFrame;
