import type { Mock } from "vitest";
import { describe, expect, it, vi } from "vitest";
import {
  buildPreviewBridgeScript,
  MAX_SERIALIZE_DEPTH,
  MAX_SERIALIZE_ITEMS,
  MAX_SERIALIZE_STRING_LENGTH,
} from "./previewBridge";
import {
  PREVIEW_MESSAGE_PROTOCOL,
  PREVIEW_MESSAGE_VERSION,
} from "./previewMessage";

type AnyMock = Mock<(...args: unknown[]) => unknown>;

interface ConsoleMock {
  log: AnyMock;
  info: AnyMock;
  warn: AnyMock;
  error: AnyMock;
  debug: AnyMock;
  clear: AnyMock;
}

interface WindowMock {
  parent: { postMessage: AnyMock };
  addEventListener: (type: string, handler: (event: unknown) => void) => void;
  onerror?: (
    message: string,
    source: string,
    lineno?: number,
    colno?: number,
    error?: Error,
  ) => void;
}

interface Harness {
  postMessage: AnyMock;
  console: ConsoleMock;
  originalConsole: ConsoleMock;
  triggerOnError: (
    message: string,
    source?: string,
    lineno?: number,
    colno?: number,
    error?: Error,
  ) => void;
  triggerUnhandledRejection: (reason: unknown) => void;
  triggerWindowError: (event: {
    target: { tagName: string; href?: string };
  }) => void;
  NodeCtor: new () => Record<string, unknown>;
  lastMessage: () => Record<string, unknown>;
  messagesOfType: (type: string) => Record<string, unknown>[];
}

function runBridge(executionId = "execution-1"): Harness {
  const postMessage = vi.fn();
  const originalConsole: ConsoleMock = {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    clear: vi.fn(),
  };
  // The bridge patches these properties in place, so `consoleMock` and
  // `originalConsole` alias the same object identity — capturing the
  // pre-patch function references separately (above) is what lets tests
  // assert the original methods still ran underneath the tee.
  const consoleMock: ConsoleMock = { ...originalConsole };

  const eventListeners: [string, (event: unknown) => void][] = [];
  const windowMock: WindowMock = {
    parent: { postMessage },
    addEventListener: (type, handler) => {
      eventListeners.push([type, handler]);
    },
  };

  function NodeCtor(this: Record<string, unknown>) {}

  const fn = new Function(
    "window",
    "console",
    "Node",
    buildPreviewBridgeScript(executionId),
  );
  fn(windowMock, consoleMock, NodeCtor);

  return {
    postMessage,
    console: consoleMock,
    originalConsole,
    triggerOnError: (
      message,
      source = "preview.html",
      lineno,
      colno,
      error,
    ) => {
      windowMock.onerror?.(message, source, lineno, colno, error);
    },
    triggerUnhandledRejection: (reason) => {
      const entry = eventListeners.find(
        ([type]) => type === "unhandledrejection",
      );
      entry?.[1]({ reason });
    },
    triggerWindowError: (event) => {
      for (const [type, handler] of eventListeners) {
        if (type === "error") handler(event);
      }
    },
    NodeCtor: NodeCtor as unknown as new () => Record<string, unknown>,
    lastMessage: () => {
      const calls = postMessage.mock.calls;
      return calls[calls.length - 1][0] as Record<string, unknown>;
    },
    messagesOfType: (type) =>
      postMessage.mock.calls
        .map((call) => call[0] as Record<string, unknown>)
        .filter((message) => message.type === type),
  };
}

function makeDeepObject(depth: number): unknown {
  if (depth <= 0) return { leaf: true };
  return { child: makeDeepObject(depth - 1) };
}

describe("buildPreviewBridgeScript", () => {
  it("posts a ready message with the correct protocol/version/executionId on load", () => {
    const harness = runBridge("execution-abc");
    const [message] = harness.postMessage.mock.calls[0];
    expect(message).toMatchObject({
      protocol: PREVIEW_MESSAGE_PROTOCOL,
      version: PREVIEW_MESSAGE_VERSION,
      executionId: "execution-abc",
      type: "ready",
    });
    expect(harness.postMessage.mock.calls[0][1]).toBe("*");
  });

  it("tees console.log to the original method and posts a console message", () => {
    const harness = runBridge();
    harness.console.log("hello", 42);

    expect(harness.originalConsole.log).toHaveBeenCalledWith("hello", 42);
    const message = harness.lastMessage();
    expect(message).toMatchObject({
      type: "console",
      payload: {
        level: "log",
        args: [
          { kind: "primitive", value: "hello" },
          { kind: "primitive", value: 42 },
        ],
      },
    });
  });

  it.each(["info", "warn", "error", "debug"] as const)(
    "tees console.%s the same way as console.log",
    (level) => {
      const harness = runBridge();
      harness.console[level]("x");
      expect(harness.originalConsole[level]).toHaveBeenCalledWith("x");
      const message = harness.lastMessage();
      expect(message).toMatchObject({ type: "console", payload: { level } });
    },
  );

  it("console.clear posts a clear message with no args and still calls the original", () => {
    const harness = runBridge();
    harness.console.clear();

    expect(harness.originalConsole.clear).toHaveBeenCalled();
    const message = harness.lastMessage();
    expect(message).toMatchObject({
      type: "console",
      payload: { level: "clear", args: [] },
    });
  });

  it("captures a runtime error via window.onerror with line/column/stack", () => {
    const harness = runBridge();
    const error = new Error("boom");
    harness.triggerOnError("boom", "preview.html", 12, 4, error);

    const message = harness.lastMessage();
    expect(message).toMatchObject({
      type: "runtime-error",
      payload: {
        message: "boom",
        line: 12,
        column: 4,
        stack: error.stack,
      },
    });
  });

  it("captures a runtime error without an Error object (e.g. a syntax error)", () => {
    const harness = runBridge();
    harness.triggerOnError("Unexpected token", "preview.html", 3, 1);

    const message = harness.lastMessage();
    expect(message).toMatchObject({
      type: "runtime-error",
      payload: { message: "Unexpected token", line: 3, column: 1 },
    });
  });

  it("captures an unhandled promise rejection", () => {
    const harness = runBridge();
    harness.triggerUnhandledRejection(new Error("nope"));

    const message = harness.lastMessage();
    expect(message).toMatchObject({
      type: "unhandled-rejection",
      payload: { reason: { kind: "error", name: "Error", message: "nope" } },
    });
  });

  it("serializes null and undefined as a null primitive", () => {
    const harness = runBridge();
    harness.console.log(null, undefined);
    const message = harness.lastMessage();
    expect(message.payload).toMatchObject({
      args: [
        { kind: "primitive", value: null },
        { kind: "primitive", value: null },
      ],
    });
  });

  it("serializes booleans and numbers as primitives", () => {
    const harness = runBridge();
    harness.console.log(true, 3.5);
    const message = harness.lastMessage();
    expect(message.payload).toMatchObject({
      args: [
        { kind: "primitive", value: true },
        { kind: "primitive", value: 3.5 },
      ],
    });
  });

  it("truncates strings longer than MAX_SERIALIZE_STRING_LENGTH", () => {
    const harness = runBridge();
    const longString = "x".repeat(MAX_SERIALIZE_STRING_LENGTH + 50);
    harness.console.log(longString);
    const message = harness.lastMessage();
    const payload = message.payload as { args: { value: string }[] };
    expect(payload.args[0].value).toHaveLength(MAX_SERIALIZE_STRING_LENGTH);
  });

  it("truncates arrays longer than MAX_SERIALIZE_ITEMS", () => {
    const harness = runBridge();
    const longArray = Array.from(
      { length: MAX_SERIALIZE_ITEMS + 5 },
      (_, i) => i,
    );
    harness.console.log(longArray);
    const message = harness.lastMessage();
    const payload = message.payload as {
      args: { items: unknown[]; truncated: boolean }[];
    };
    expect(payload.args[0].items).toHaveLength(MAX_SERIALIZE_ITEMS);
    expect(payload.args[0].truncated).toBe(true);
  });

  it("truncates objects with more than MAX_SERIALIZE_ITEMS keys", () => {
    const harness = runBridge();
    const bigObject: Record<string, number> = {};
    for (let i = 0; i < MAX_SERIALIZE_ITEMS + 5; i += 1) {
      bigObject[`key${i}`] = i;
    }
    harness.console.log(bigObject);
    const message = harness.lastMessage();
    const payload = message.payload as {
      args: { entries: unknown[]; truncated: boolean }[];
    };
    expect(payload.args[0].entries).toHaveLength(MAX_SERIALIZE_ITEMS);
    expect(payload.args[0].truncated).toBe(true);
  });

  it("cuts off recursion at MAX_SERIALIZE_DEPTH with a truncated marker", () => {
    const harness = runBridge();
    harness.console.log(makeDeepObject(MAX_SERIALIZE_DEPTH + 3));
    const message = harness.lastMessage();
    const payload = message.payload as {
      args: { entries: [string, unknown][] }[];
    };

    // biome-ignore lint/suspicious/noExplicitAny: walking a dynamically-nested serialized tree to the exact truncation depth under test.
    let node: any = payload.args[0];
    for (let i = 0; i < MAX_SERIALIZE_DEPTH; i += 1) {
      node = node.entries[0][1];
    }
    expect(node.truncated).toBe(true);
    expect(node.entries).toEqual([]);
  });

  it("marks a circular reference instead of recursing infinitely", () => {
    const harness = runBridge();
    const circular: { self?: unknown } = {};
    circular.self = circular;
    harness.console.log(circular);

    const message = harness.lastMessage();
    const payload = message.payload as {
      args: { entries: [string, { kind: string }][] }[];
    };
    expect(payload.args[0].entries).toEqual([["self", { kind: "circular" }]]);
  });

  it("serializes a function as a safe descriptor rather than attempting structured clone", () => {
    const harness = runBridge();
    function namedFn() {}
    harness.console.log(namedFn);
    const message = harness.lastMessage();
    expect(message.payload).toMatchObject({
      args: [{ kind: "function", name: "namedFn" }],
    });
  });

  it("serializes an Error value as a safe descriptor", () => {
    const harness = runBridge();
    const error = new TypeError("bad type");
    harness.console.log(error);
    const message = harness.lastMessage();
    expect(message.payload).toMatchObject({
      args: [{ kind: "error", name: "TypeError", message: "bad type" }],
    });
  });

  it("serializes a DOM node as a safe descriptor rather than attempting structured clone", () => {
    const harness = runBridge();
    const node = new harness.NodeCtor();
    node.tagName = "DIV";
    node.id = "widget";
    node.className = "card active";
    node.outerHTML = '<div id="widget" class="card active"></div>';

    harness.console.log(node);
    const message = harness.lastMessage();
    expect(message.payload).toMatchObject({
      args: [
        {
          kind: "node",
          tagName: "div",
          id: "widget",
          className: "card active",
          preview: '<div id="widget" class="card active"></div>',
        },
      ],
    });
  });

  it("serializes an unsupported value kind (e.g. symbol) with its type tag", () => {
    const harness = runBridge();
    harness.console.log(Symbol("x"));
    const message = harness.lastMessage();
    expect(message.payload).toMatchObject({
      args: [{ kind: "unsupported", tag: "symbol" }],
    });
  });

  it("never throws into user code when a logged property getter throws", () => {
    const harness = runBridge();
    const hostile = {
      ok: 1,
      get boom(): never {
        throw new Error("getter exploded");
      },
    };

    expect(() => harness.console.log("value:", hostile)).not.toThrow();

    expect(harness.originalConsole.log).toHaveBeenCalled();
    expect(harness.lastMessage().payload).toMatchObject({
      args: [
        { kind: "primitive", value: "value:" },
        {
          kind: "object",
          entries: [
            ["ok", { kind: "primitive", value: 1 }],
            ["boom", { kind: "unsupported", tag: "unserializable" }],
          ],
        },
      ],
    });
  });

  it("never throws into user code when a logged value cannot be inspected at all", () => {
    const harness = runBridge();
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();

    expect(() => harness.console.log(proxy)).not.toThrow();
    expect(harness.lastMessage().payload).toMatchObject({
      args: [{ kind: "unsupported", tag: "unserializable" }],
    });
  });

  it("still reports an unhandled rejection whose reason cannot be inspected", () => {
    const harness = runBridge();
    const reason = {
      get message(): never {
        throw new Error("nope");
      },
    };

    expect(() => harness.triggerUnhandledRejection(reason)).not.toThrow();
    expect(harness.lastMessage()).toMatchObject({
      type: "unhandled-rejection",
      payload: {
        reason: {
          kind: "object",
          entries: [
            ["message", { kind: "unsupported", tag: "unserializable" }],
          ],
        },
      },
    });
  });

  it("reports a non-fatal resource-error for a failing stylesheet link", () => {
    const harness = runBridge();

    harness.triggerWindowError({
      target: { tagName: "LINK", href: "https://example.com/style.css" },
    });

    const errors = harness.messagesOfType("resource-error");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      payload: {
        url: "https://example.com/style.css",
        message: "Failed to load stylesheet.",
      },
    });
  });

  it("ignores window error events from non-link targets", () => {
    const harness = runBridge();

    harness.triggerWindowError({ target: { tagName: "IMG" } });

    expect(harness.messagesOfType("resource-error")).toHaveLength(0);
  });
});
