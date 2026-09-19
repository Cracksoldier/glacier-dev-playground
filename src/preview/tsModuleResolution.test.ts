import type * as ts from "typescript";
import { describe, expect, it } from "vitest";
import {
  buildRemoteModuleDeclarationText,
  classifyModuleSpecifier,
  createModuleResolver,
  isRemoteModuleFileName,
  remoteModuleFileName,
  remoteModuleSpecifierFromFileName,
} from "./tsModuleResolution";

function stringLiteral(text: string): ts.StringLiteralLike {
  return { text } as ts.StringLiteralLike;
}

describe("classifyModuleSpecifier", () => {
  it("classifies an absolute https URL as absolute-https", () => {
    expect(classifyModuleSpecifier("https://esm.sh/lodash")).toBe(
      "absolute-https",
    );
  });

  it("rejects an absolute http URL", () => {
    expect(classifyModuleSpecifier("http://esm.sh/lodash")).toBe("rejected");
  });

  it("rejects a bare specifier", () => {
    expect(classifyModuleSpecifier("lodash")).toBe("rejected");
  });

  it("rejects a relative specifier", () => {
    expect(classifyModuleSpecifier("./utils")).toBe("rejected");
    expect(classifyModuleSpecifier("../utils")).toBe("rejected");
  });

  it("rejects an unparseable specifier", () => {
    expect(classifyModuleSpecifier("")).toBe("rejected");
  });
});

describe("remoteModuleFileName / isRemoteModuleFileName / remoteModuleSpecifierFromFileName", () => {
  it("round-trips a specifier through the synthetic file name", () => {
    const specifier = "https://esm.sh/lodash@4.17.21";
    const fileName = remoteModuleFileName(specifier);
    expect(isRemoteModuleFileName(fileName)).toBe(true);
    expect(remoteModuleSpecifierFromFileName(fileName)).toBe(specifier);
  });

  it("does not classify an ordinary file name as remote", () => {
    expect(isRemoteModuleFileName("lib.es2022.d.ts")).toBe(false);
    expect(isRemoteModuleFileName("root.ts")).toBe(false);
  });
});

describe("buildRemoteModuleDeclarationText", () => {
  it("declares the specifier as an any-typed module", () => {
    const text = buildRemoteModuleDeclarationText("https://esm.sh/lodash");
    expect(text).toContain('declare module "https://esm.sh/lodash"');
    expect(text).toContain(": any;");
  });
});

describe("createModuleResolver", () => {
  it("resolves an absolute https specifier to a synthetic remote module file", () => {
    const resolver = createModuleResolver();
    const [result] = resolver.resolveModuleNameLiterals(
      [stringLiteral("https://esm.sh/lodash")],
      "root.ts",
      undefined,
      {} as ts.CompilerOptions,
      {} as ts.SourceFile,
      undefined,
    );
    expect(result.resolvedModule?.resolvedFileName).toBe(
      remoteModuleFileName("https://esm.sh/lodash"),
    );
    expect(result.resolvedModule?.extension).toBe(".d.ts");
  });

  it("leaves bare and relative specifiers unresolved", () => {
    const resolver = createModuleResolver();
    const results = resolver.resolveModuleNameLiterals(
      [stringLiteral("lodash"), stringLiteral("./utils")],
      "root.ts",
      undefined,
      {} as ts.CompilerOptions,
      {} as ts.SourceFile,
      undefined,
    );
    expect(results.every((r) => r.resolvedModule === undefined)).toBe(true);
  });

  it("tracks distinct resolved remote specifiers in first-seen order, de-duplicated", () => {
    const resolver = createModuleResolver();
    resolver.resolveModuleNameLiterals(
      [
        stringLiteral("https://esm.sh/a"),
        stringLiteral("https://esm.sh/b"),
        stringLiteral("https://esm.sh/a"),
        stringLiteral("lodash"),
      ],
      "root.ts",
      undefined,
      {} as ts.CompilerOptions,
      {} as ts.SourceFile,
      undefined,
    );
    expect(resolver.resolvedRemoteSpecifiers()).toEqual([
      "https://esm.sh/a",
      "https://esm.sh/b",
    ]);
  });
});
