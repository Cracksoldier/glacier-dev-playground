import {
  PREVIEW_MESSAGE_PROTOCOL,
  PREVIEW_MESSAGE_VERSION,
} from "./previewMessage";

/** Max recursion depth for nested arrays/objects before a branch is cut off with `truncated: true`. */
export const MAX_SERIALIZE_DEPTH = 6;
/** Max array items / object keys serialized per container before `truncated: true`. */
export const MAX_SERIALIZE_ITEMS = 100;
/** Max characters kept per serialized string (including error stacks). */
export const MAX_SERIALIZE_STRING_LENGTH = 2000;

/**
 * Builds the self-contained JS bootstrap script injected into the sandboxed
 * preview iframe (see `previewDocument.ts`). Runs inside the iframe's opaque
 * origin, so it cannot `import` anything from the parent app — everything it
 * needs (protocol constants, limits) is baked in as literals at generation
 * time via this template, and the resulting string is what actually ships
 * and what `previewBridge.test.ts` executes byte-for-byte via `new
 * Function(...)`.
 *
 * Responsibilities, all before any user script runs: tee `console.*` calls
 * to both the real console and the parent (via `postMessage`), capture
 * uncaught errors (`window.onerror`, which also fires for inline-script
 * syntax errors) and unhandled promise rejections, and announce readiness.
 * `postMessage(msg, "*")` is required, not a laxity: the sandboxed iframe's
 * opaque origin means it cannot assert the parent's real origin string, so
 * the parent is responsible for validating `event.source`/protocol/
 * executionId on receipt instead (see `PreviewFrame.tsx`).
 */
export function buildPreviewBridgeScript(executionId: string): string {
  return `(function () {
  var PROTOCOL = ${JSON.stringify(PREVIEW_MESSAGE_PROTOCOL)};
  var VERSION = ${JSON.stringify(PREVIEW_MESSAGE_VERSION)};
  var EXECUTION_ID = ${JSON.stringify(executionId)};
  var MAX_DEPTH = ${MAX_SERIALIZE_DEPTH};
  var MAX_ITEMS = ${MAX_SERIALIZE_ITEMS};
  var MAX_STRING_LENGTH = ${MAX_SERIALIZE_STRING_LENGTH};

  function post(type, payload) {
    try {
      window.parent.postMessage(
        {
          protocol: PROTOCOL,
          version: VERSION,
          executionId: EXECUTION_ID,
          type: type,
          payload: payload,
        },
        "*",
      );
    } catch (postError) {
      // Serialize() below is built to never hand postMessage anything it
      // can't structured-clone, but a defensive no-op here means a missed
      // edge case can never crash the user's preview.
    }
  }

  function truncateString(value) {
    return value.length > MAX_STRING_LENGTH
      ? value.slice(0, MAX_STRING_LENGTH)
      : value;
  }

  function serialize(value, depth, seen) {
    if (value === null || value === undefined) {
      return { kind: "primitive", value: null };
    }
    var type = typeof value;
    if (type === "string") {
      return { kind: "primitive", value: truncateString(value) };
    }
    if (type === "number" || type === "boolean") {
      return { kind: "primitive", value: value };
    }
    if (type === "function") {
      return { kind: "function", name: value.name || "anonymous" };
    }
    if (value instanceof Error) {
      return {
        kind: "error",
        name: value.name,
        message: value.message,
        stack:
          typeof value.stack === "string"
            ? truncateString(value.stack)
            : undefined,
      };
    }
    if (typeof Node !== "undefined" && value instanceof Node) {
      var preview;
      try {
        preview = truncateString(
          String(value.outerHTML || value.textContent || ""),
        );
      } catch (previewError) {
        preview = "";
      }
      return {
        kind: "node",
        tagName: value.tagName
          ? String(value.tagName).toLowerCase()
          : String(value.nodeName),
        id: value.id || undefined,
        className:
          typeof value.className === "string" ? value.className : undefined,
        preview: preview,
      };
    }
    if (type !== "object") {
      return { kind: "unsupported", tag: type };
    }
    if (seen.indexOf(value) !== -1) {
      return { kind: "circular" };
    }
    if (depth >= MAX_DEPTH) {
      return Array.isArray(value)
        ? { kind: "array", items: [], truncated: true }
        : { kind: "object", entries: [], truncated: true };
    }
    var nextSeen = seen.concat([value]);
    if (Array.isArray(value)) {
      var items = [];
      var itemLimit = Math.min(value.length, MAX_ITEMS);
      for (var i = 0; i < itemLimit; i += 1) {
        items.push(serialize(value[i], depth + 1, nextSeen));
      }
      return { kind: "array", items: items, truncated: value.length > MAX_ITEMS };
    }
    var keys = Object.keys(value);
    var entries = [];
    var keyLimit = Math.min(keys.length, MAX_ITEMS);
    for (var k = 0; k < keyLimit; k += 1) {
      entries.push([keys[k], serialize(value[keys[k]], depth + 1, nextSeen)]);
    }
    return { kind: "object", entries: entries, truncated: keys.length > MAX_ITEMS };
  }

  function serializeArgs(args) {
    var out = [];
    for (var i = 0; i < args.length; i += 1) {
      out.push(serialize(args[i], 0, []));
    }
    return out;
  }

  var CONSOLE_METHODS = ["log", "info", "warn", "error", "debug"];
  for (var m = 0; m < CONSOLE_METHODS.length; m += 1) {
    (function (level) {
      var original =
        typeof console[level] === "function"
          ? console[level].bind(console)
          : function () {};
      console[level] = function () {
        var args = Array.prototype.slice.call(arguments);
        original.apply(console, args);
        post("console", {
          level: level,
          args: serializeArgs(args),
          timestampMs: Date.now(),
        });
      };
    })(CONSOLE_METHODS[m]);
  }

  var originalClear =
    typeof console.clear === "function"
      ? console.clear.bind(console)
      : function () {};
  console.clear = function () {
    originalClear();
    post("console", { level: "clear", args: [], timestampMs: Date.now() });
  };

  window.onerror = function (message, _source, lineno, colno, error) {
    post("runtime-error", {
      message: typeof message === "string" ? message : String(message),
      line: typeof lineno === "number" ? lineno : undefined,
      column: typeof colno === "number" ? colno : undefined,
      stack:
        error && typeof error.stack === "string"
          ? truncateString(error.stack)
          : undefined,
      timestampMs: Date.now(),
    });
  };

  window.addEventListener("unhandledrejection", function (event) {
    post("unhandled-rejection", {
      reason: serialize(event.reason, 0, []),
      timestampMs: Date.now(),
    });
  });

  window.__glacierPreviewBridge = { post: post };

  post("ready", { timestampMs: Date.now() });
})();`;
}
