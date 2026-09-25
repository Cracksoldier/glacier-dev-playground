import type { ExternalResource } from "../models/resource";

export type LoaderResourceDescriptor = Pick<
  ExternalResource,
  "url" | "integrity" | "crossOrigin"
>;

export interface PreviewResourceLoaderOptions {
  /** Enabled `"script"` resources, in load order. */
  scriptResources: LoaderResourceDescriptor[];
  /** Enabled `"module"` resources — loaded after all script resources succeed. */
  moduleResources: LoaderResourceDescriptor[];
  /** The user script's own execution mode — classic (`new Function`) or `<script type="module">`. */
  executionMode: "classic" | "module";
  /** 1-indexed document line at which the user script placeholder's content begins. */
  scriptBlockStartLine: number;
}

/**
 * `JSON.stringify` for a value embedded in an inline `<script>`: `<` becomes
 * `\u003c` — the same string at runtime, but a user-supplied value such as a
 * URL containing `</script>` can no longer end the script element early.
 */
function scriptSafeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function descriptorLiteral(resource: LoaderResourceDescriptor): string {
  return `{ url: ${scriptSafeJson(resource.url)}, integrity: ${scriptSafeJson(
    resource.integrity ?? null,
  )}, crossOrigin: ${scriptSafeJson(resource.crossOrigin ?? null)} }`;
}

function resourceArrayLiteral(resources: LoaderResourceDescriptor[]): string {
  return `[${resources.map(descriptorLiteral).join(", ")}]`;
}

/**
 * Builds the self-contained JS loader script injected into the same
 * `<script>` tag as the bridge (see `previewBridge.ts`), immediately after
 * it. Runs inside the sandboxed iframe, so — like the bridge — it cannot
 * `import` anything and is generated as a literal template string.
 *
 * Responsibilities, all gating whether/when the user's own script runs:
 * loads enabled `"script"` resources sequentially (classic `<script src>`
 * elements, in configured order), then enabled `"module"` resources in
 * parallel (`<script type="module" src>`), then executes the user's script
 * (read from an inert `[data-glacier-user-script]` placeholder — see
 * `previewDocument.ts`) and posts `"resources-ready"`. A failure of any
 * script/module resource reports a `"resource-error"` and never executes the
 * user script or posts `"resources-ready"` — `PreviewFrame.tsx` decides
 * fatal-vs-non-fatal by cross-referencing the failed url against its own
 * resource list, not from anything this script encodes. Stylesheet
 * `<link>` load failures are reported by the bridge instead
 * (`previewBridge.ts`), which runs in `<head>` before any `<link>` tag —
 * this script runs at the end of `<body>`, too late to observe them.
 */
export function buildPreviewResourceLoaderScript(
  options: PreviewResourceLoaderOptions,
): string {
  const {
    scriptResources,
    moduleResources,
    executionMode,
    scriptBlockStartLine,
  } = options;

  return `(function () {
  var SCRIPT_RESOURCES = ${resourceArrayLiteral(scriptResources)};
  var MODULE_RESOURCES = ${resourceArrayLiteral(moduleResources)};
  var EXECUTION_MODE = ${JSON.stringify(executionMode)};
  var SCRIPT_START_LINE = ${JSON.stringify(scriptBlockStartLine)};

  function post(type, payload) {
    if (
      window.__glacierPreviewBridge &&
      typeof window.__glacierPreviewBridge.post === "function"
    ) {
      window.__glacierPreviewBridge.post(type, payload);
    }
  }

  function reportResourceError(url, message) {
    post("resource-error", {
      url: url || "",
      message: message,
      timestampMs: Date.now(),
    });
  }

  function applyAttributes(element, resource) {
    if (resource.integrity) element.integrity = resource.integrity;
    if (resource.crossOrigin) element.crossOrigin = resource.crossOrigin;
  }

  function loadClassicSequential(index, onDone, onFail) {
    if (index >= SCRIPT_RESOURCES.length) {
      onDone();
      return;
    }
    var resource = SCRIPT_RESOURCES[index];
    var element = document.createElement("script");
    element.src = resource.url;
    applyAttributes(element, resource);
    element.onload = function () {
      loadClassicSequential(index + 1, onDone, onFail);
    };
    element.onerror = function () {
      onFail(resource);
    };
    document.head.appendChild(element);
  }

  function loadModulesParallel(onDone, onFail) {
    if (MODULE_RESOURCES.length === 0) {
      onDone();
      return;
    }
    var remaining = MODULE_RESOURCES.length;
    var failed = false;
    for (var i = 0; i < MODULE_RESOURCES.length; i += 1) {
      (function (resource) {
        var element = document.createElement("script");
        element.type = "module";
        element.src = resource.url;
        applyAttributes(element, resource);
        element.onload = function () {
          if (failed) return;
          remaining -= 1;
          if (remaining === 0) onDone();
        };
        element.onerror = function () {
          if (failed) return;
          failed = true;
          onFail(resource);
        };
        document.head.appendChild(element);
      })(MODULE_RESOURCES[i]);
    }
  }

  function calibrateLineOffset() {
    try {
      new Function("throw new Error('__glacier_probe__')")();
    } catch (probeError) {
      var stack = String((probeError && probeError.stack) || "");
      var lines = stack.split("\\n");
      for (var i = 0; i < lines.length; i += 1) {
        var match = /:(\\d+):\\d+\\)?$/.exec(lines[i]);
        if (match) return Number.parseInt(match[1], 10) - 1;
      }
    }
    return 1;
  }

  var LINE_OFFSET = calibrateLineOffset();

  function reportSyntheticRuntimeError(localLine, column, message, stack) {
    var absoluteLine =
      typeof localLine === "number"
        ? SCRIPT_START_LINE + (localLine - LINE_OFFSET) - 1
        : undefined;
    post("runtime-error", {
      message: message,
      line: absoluteLine,
      column: column,
      stack: stack,
      timestampMs: Date.now(),
    });
  }

  function parseErrorLocation(error) {
    var stack = String((error && error.stack) || "");
    var lines = stack.split("\\n");
    for (var i = 0; i < lines.length; i += 1) {
      var match = /:(\\d+):(\\d+)\\)?$/.exec(lines[i]);
      if (match) {
        return {
          line: Number.parseInt(match[1], 10),
          column: Number.parseInt(match[2], 10),
        };
      }
    }
    return { line: undefined, column: undefined };
  }

  function executeUserScript() {
    var placeholder = document.querySelector("[data-glacier-user-script]");
    var text = placeholder ? placeholder.textContent || "" : "";
    // The placeholder's opening tag and its content are joined by a newline
    // in the document source (see previewDocument.ts), and unlike <pre>,
    // HTML does not strip a script element's leading newline from its text
    // node -- so .textContent always starts with that one extra newline.
    // Strip it so line 1 of the text is line 1 of the user's actual script,
    // matching SCRIPT_START_LINE's assumption for line-number calibration.
    if (text.charAt(0) === "\\n") text = text.slice(1);

    if (EXECUTION_MODE === "module") {
      var moduleScript = document.createElement("script");
      moduleScript.type = "module";
      moduleScript.textContent = text;
      document.body.appendChild(moduleScript);
      return;
    }

    try {
      new Function(text)();
    } catch (error) {
      var location = parseErrorLocation(error);
      reportSyntheticRuntimeError(
        location.line,
        location.column,
        error && error.message ? String(error.message) : String(error),
        error && error.stack ? String(error.stack) : undefined,
      );
    }
  }

  function onResourcesLoaded() {
    executeUserScript();
    post("resources-ready", { timestampMs: Date.now() });
  }

  function onResourceLoadFailed(resource) {
    reportResourceError(resource.url, "Failed to load resource.");
  }

  try {
    loadClassicSequential(
      0,
      function () {
        loadModulesParallel(onResourcesLoaded, onResourceLoadFailed);
      },
      onResourceLoadFailed,
    );
  } catch (internalError) {
    reportResourceError(
      "",
      "Internal resource loader error: " +
        (internalError && internalError.message
          ? internalError.message
          : String(internalError)),
    );
    onResourcesLoaded();
  }
})();`;
}
