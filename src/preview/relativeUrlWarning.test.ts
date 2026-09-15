import { describe, expect, it } from "vitest";
import type { ProjectSource } from "../models/project";
import { hasRelativeAssetUrls } from "./relativeUrlWarning";

function makeSource(overrides: Partial<ProjectSource> = {}): ProjectSource {
  return {
    html: "",
    stylesheet: "",
    stylesheetLanguage: "css",
    script: "",
    scriptLanguage: "javascript",
    executionMode: "classic",
    headContent: "",
    ...overrides,
  };
}

describe("hasRelativeAssetUrls", () => {
  it("returns false when there are no asset URLs at all", () => {
    expect(hasRelativeAssetUrls(makeSource({ html: "<p>hello</p>" }))).toBe(
      false,
    );
  });

  it("does not warn on an absolute https image URL", () => {
    expect(
      hasRelativeAssetUrls(
        makeSource({ html: '<img src="https://example.com/a.png">' }),
      ),
    ).toBe(false);
  });

  it("does not warn on a data URL", () => {
    expect(
      hasRelativeAssetUrls(
        makeSource({ html: '<img src="data:image/png;base64,aGVsbG8=">' }),
      ),
    ).toBe(false);
  });

  it("does not warn on a protocol-relative URL", () => {
    expect(
      hasRelativeAssetUrls(
        makeSource({ html: '<img src="//example.com/a.png">' }),
      ),
    ).toBe(false);
  });

  it("warns on a relative image src", () => {
    expect(
      hasRelativeAssetUrls(makeSource({ html: '<img src="images/a.png">' })),
    ).toBe(true);
  });

  it("warns on a plain http URL", () => {
    expect(
      hasRelativeAssetUrls(
        makeSource({ html: '<img src="http://example.com/a.png">' }),
      ),
    ).toBe(true);
  });

  it("warns on a relative stylesheet link href in headContent", () => {
    expect(
      hasRelativeAssetUrls(
        makeSource({ headContent: '<link rel="stylesheet" href="a.css">' }),
      ),
    ).toBe(true);
  });

  it("warns on a relative CSS url(...) reference", () => {
    expect(
      hasRelativeAssetUrls(
        makeSource({ stylesheet: "body { background: url(bg.png); }" }),
      ),
    ).toBe(true);
  });

  it("does not warn on an absolute CSS url(...) reference", () => {
    expect(
      hasRelativeAssetUrls(
        makeSource({
          stylesheet: "body { background: url(https://example.com/bg.png); }",
        }),
      ),
    ).toBe(false);
  });

  it("does not warn on an in-page anchor href", () => {
    expect(
      hasRelativeAssetUrls(makeSource({ html: '<a href="#top">Top</a>' })),
    ).toBe(false);
  });

  it("does not warn on a mailto href", () => {
    expect(
      hasRelativeAssetUrls(
        makeSource({ html: '<a href="mailto:test@example.com">Email</a>' }),
      ),
    ).toBe(false);
  });
});
