import type { Mock } from "vitest";
import { describe, expect, it, vi } from "vitest";
import {
  buildPreviewResourceLoaderScript,
  type PreviewResourceLoaderOptions,
} from "./previewResourceLoader";

type AnyMock = Mock<(...args: unknown[]) => unknown>;

interface MockElement {
  tagName: string;
  src?: string;
  type?: string;
  integrity?: string;
  crossOrigin?: string;
  textContent?: string;
  onload?: () => void;
  onerror?: () => void;
  appendedTo?: "head" | "body";
}

interface Harness {
  post: AnyMock;
  createdElements: MockElement[];
  messagesOfType: (type: string) => Record<string, unknown>[];
}

function runLoader(
  overrides: Partial<PreviewResourceLoaderOptions> = {},
  userScriptText = "",
  createElementOverride?: (tagName: string) => MockElement,
): Harness {
  const post = vi.fn();
  const createdElements: MockElement[] = [];

  const documentMock = {
    createElement: (tagName: string) => {
      if (createElementOverride) return createElementOverride(tagName);
      const element: MockElement = { tagName: tagName.toUpperCase() };
      createdElements.push(element);
      return element;
    },
    head: {
      appendChild: (element: MockElement) => {
        element.appendedTo = "head";
      },
    },
    body: {
      appendChild: (element: MockElement) => {
        element.appendedTo = "body";
      },
    },
    querySelector: () => ({ textContent: userScriptText }),
  };

  const windowMock = {
    __glacierPreviewBridge: { post },
  };

  const options: PreviewResourceLoaderOptions = {
    scriptResources: [],
    moduleResources: [],
    executionMode: "classic",
    scriptBlockStartLine: 1,
    ...overrides,
  };

  const fn = new Function(
    "window",
    "document",
    buildPreviewResourceLoaderScript(options),
  );
  fn(windowMock, documentMock);

  return {
    post,
    createdElements,
    messagesOfType: (type) =>
      post.mock.calls
        .filter((call) => call[0] === type)
        .map((call) => call[1] as Record<string, unknown>),
  };
}

describe("buildPreviewResourceLoaderScript", () => {
  it("posts resources-ready synchronously when there are no resources", () => {
    const harness = runLoader();

    expect(harness.messagesOfType("resources-ready")).toHaveLength(1);
    expect(harness.messagesOfType("resource-error")).toHaveLength(0);
  });

  it("keeps a resource URL containing </script> from closing the script element, while loading the same URL", () => {
    const url = "https://example.com/a.js?</script><script>alert(1)</script>";
    const options: PreviewResourceLoaderOptions = {
      scriptResources: [{ url, integrity: "sha384-</script>" }],
      moduleResources: [],
      executionMode: "classic",
      scriptBlockStartLine: 1,
    };

    expect(buildPreviewResourceLoaderScript(options)).not.toContain("</");

    const harness = runLoader(options);
    expect(harness.createdElements[0].src).toBe(url);
  });

  it("loads classic script resources sequentially in order", () => {
    const harness = runLoader({
      scriptResources: [
        { url: "https://example.com/a.js" },
        { url: "https://example.com/b.js" },
      ],
    });

    expect(harness.createdElements).toHaveLength(1);
    expect(harness.createdElements[0].src).toBe("https://example.com/a.js");
    expect(harness.createdElements[0].appendedTo).toBe("head");
    expect(harness.messagesOfType("resources-ready")).toHaveLength(0);

    harness.createdElements[0].onload?.();

    expect(harness.createdElements).toHaveLength(2);
    expect(harness.createdElements[1].src).toBe("https://example.com/b.js");
    expect(harness.messagesOfType("resources-ready")).toHaveLength(0);

    harness.createdElements[1].onload?.();

    expect(harness.messagesOfType("resources-ready")).toHaveLength(1);
  });

  it("sets integrity and crossOrigin attributes when present", () => {
    const harness = runLoader({
      scriptResources: [
        {
          url: "https://example.com/a.js",
          integrity: "sha384-abc",
          crossOrigin: "anonymous",
        },
      ],
    });

    expect(harness.createdElements[0].integrity).toBe("sha384-abc");
    expect(harness.createdElements[0].crossOrigin).toBe("anonymous");
  });

  it("loads module resources in parallel only after classic scripts finish", () => {
    const harness = runLoader({
      scriptResources: [{ url: "https://example.com/a.js" }],
      moduleResources: [
        { url: "https://example.com/m1.js" },
        { url: "https://example.com/m2.js" },
      ],
    });

    expect(harness.createdElements).toHaveLength(1);

    harness.createdElements[0].onload?.();

    expect(harness.createdElements).toHaveLength(3);
    const modules = harness.createdElements.slice(1);
    expect(modules.every((el) => el.type === "module")).toBe(true);
    expect(harness.messagesOfType("resources-ready")).toHaveLength(0);

    modules[0].onload?.();
    expect(harness.messagesOfType("resources-ready")).toHaveLength(0);
    modules[1].onload?.();
    expect(harness.messagesOfType("resources-ready")).toHaveLength(1);
  });

  it("reports a resource-error and never posts resources-ready when a classic script fails", () => {
    const harness = runLoader({
      scriptResources: [{ url: "https://example.com/a.js" }],
    });

    harness.createdElements[0].onerror?.();

    const errors = harness.messagesOfType("resource-error");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ url: "https://example.com/a.js" });
    expect(harness.messagesOfType("resources-ready")).toHaveLength(0);
  });

  it("reports a resource-error and never posts resources-ready when a module fails", () => {
    const harness = runLoader({
      moduleResources: [{ url: "https://example.com/m1.js" }],
    });

    harness.createdElements[0].onerror?.();

    const errors = harness.messagesOfType("resource-error");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ url: "https://example.com/m1.js" });
    expect(harness.messagesOfType("resources-ready")).toHaveLength(0);
  });

  it("executes the user script and posts resources-ready when zero resources", () => {
    const harness = runLoader({}, "1 + 1;");

    expect(harness.messagesOfType("resources-ready")).toHaveLength(1);
    expect(harness.messagesOfType("runtime-error")).toHaveLength(0);
  });

  it("reports a corrected line number for a synchronous top-level error on the first line", () => {
    const harness = runLoader(
      { scriptBlockStartLine: 50 },
      "throw new Error('boom');",
    );

    const errors = harness.messagesOfType("runtime-error");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ message: "boom", line: 50 });
    expect(harness.messagesOfType("resources-ready")).toHaveLength(1);
  });

  it("reports a corrected line number for a synchronous error on a later line", () => {
    const harness = runLoader(
      { scriptBlockStartLine: 50 },
      "// comment\nthrow new Error('boom');",
    );

    const errors = harness.messagesOfType("runtime-error");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ message: "boom", line: 51 });
  });

  it("strips a leading newline from the placeholder's textContent before calibrating line numbers", () => {
    // In the real document, the inert placeholder's opening tag and its
    // script content are joined by "\n" (previewDocument.ts), and HTML does
    // not strip a <script>'s leading newline from its text node the way it
    // does for <pre> -- so `.textContent` always carries one extra leading
    // "\n" that isn't part of the user's actual script. Reproduce that here.
    const harness = runLoader(
      { scriptBlockStartLine: 50 },
      "\nthrow new Error('boom');",
    );

    const errors = harness.messagesOfType("runtime-error");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ message: "boom", line: 50 });
  });

  it("creates a real module script element for module execution mode instead of using new Function", () => {
    const harness = runLoader(
      { executionMode: "module" },
      "export const x = 1;",
    );

    const moduleScripts = harness.createdElements.filter(
      (el) => el.appendedTo === "body",
    );
    expect(moduleScripts).toHaveLength(1);
    expect(moduleScripts[0].type).toBe("module");
    expect(moduleScripts[0].textContent).toBe("export const x = 1;");
    expect(harness.messagesOfType("resources-ready")).toHaveLength(1);
  });

  it("fails open: reports an internal error but still executes the user script and posts resources-ready", () => {
    const harness = runLoader(
      { scriptResources: [{ url: "https://example.com/a.js" }] },
      "1 + 1;",
      () => {
        throw new Error("boom from createElement");
      },
    );

    const errors = harness.messagesOfType("resource-error");
    expect(errors).toHaveLength(1);
    expect(errors[0].url).toBe("");
    expect(errors[0].message).toMatch(/Internal resource loader error/);
    expect(harness.messagesOfType("resources-ready")).toHaveLength(1);
  });
});
