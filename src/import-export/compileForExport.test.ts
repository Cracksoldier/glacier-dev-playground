import { describe, expect, it, vi } from "vitest";
import type { ProjectSource } from "../models/project";
import type { ScssCompilerClient } from "../preview/scssCompilerClient";
import type { TsCompilerClient } from "../preview/tsCompilerClient";
import {
  type CompileForExportDependencies,
  compileProjectSourceForExport,
} from "./compileForExport";

function baseSource(overrides: Partial<ProjectSource> = {}): ProjectSource {
  return {
    html: "<p>hi</p>",
    stylesheet: "p { color: red; }",
    stylesheetLanguage: "css",
    script: "console.log(1);",
    scriptLanguage: "javascript",
    executionMode: "classic",
    headContent: "",
    ...overrides,
  };
}

function makeScssClient(compile: ScssCompilerClient["compile"]): {
  client: ScssCompilerClient;
  dispose: ReturnType<typeof vi.fn>;
} {
  const dispose = vi.fn();
  return { client: { compile, dispose }, dispose };
}

function makeTsClient(compile: TsCompilerClient["compile"]): {
  client: TsCompilerClient;
  dispose: ReturnType<typeof vi.fn>;
} {
  const dispose = vi.fn();
  return { client: { compile, dispose }, dispose };
}

function neverCallScssClient(): ScssCompilerClient {
  return {
    compile: () => {
      throw new Error("should not be called for a css-language source");
    },
    dispose: () => {
      throw new Error("should not be called for a css-language source");
    },
  };
}

function neverCallTsClient(): TsCompilerClient {
  return {
    compile: () => {
      throw new Error("should not be called for a javascript-language source");
    },
    dispose: () => {
      throw new Error("should not be called for a javascript-language source");
    },
  };
}

describe("compileProjectSourceForExport", () => {
  it("passes css/javascript source through unchanged, without creating any compiler client", async () => {
    const createScssClient = vi.fn(neverCallScssClient);
    const createTsClient = vi.fn(neverCallTsClient);
    const source = baseSource();

    const result = await compileProjectSourceForExport(source, {
      createScssClient,
      createTsClient,
    });

    expect(result).toEqual({ status: "ok", resolvedSource: source });
    expect(createScssClient).not.toHaveBeenCalled();
    expect(createTsClient).not.toHaveBeenCalled();
  });

  it("substitutes compiled CSS when stylesheetLanguage is scss, and disposes the client", async () => {
    const { client, dispose } = makeScssClient(async () => ({
      type: "success",
      css: ".a { color: blue; }",
    }));
    const dependencies: CompileForExportDependencies = {
      createScssClient: () => client,
      createTsClient: neverCallTsClient,
    };
    const source = baseSource({
      stylesheetLanguage: "scss",
      stylesheet: "$c: blue; .a { color: $c; }",
    });

    const result = await compileProjectSourceForExport(source, dependencies);

    expect(result).toEqual({
      status: "ok",
      resolvedSource: { ...source, stylesheet: ".a { color: blue; }" },
    });
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("returns a scss-error and still disposes the client on compile failure", async () => {
    const { client, dispose } = makeScssClient(async () => ({
      type: "failure",
      error: { message: "Undefined variable." },
    }));
    const dependencies: CompileForExportDependencies = {
      createScssClient: () => client,
      createTsClient: neverCallTsClient,
    };
    const source = baseSource({
      stylesheetLanguage: "scss",
      stylesheet: "$c: $undefined;",
    });

    const result = await compileProjectSourceForExport(source, dependencies);

    expect(result).toEqual({
      status: "scss-error",
      message: "Undefined variable.",
    });
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("substitutes emitted JS when scriptLanguage is typescript, and disposes the client", async () => {
    const { client, dispose } = makeTsClient(async () => ({
      diagnostics: [],
      emittedJs: "const b = 2;",
      lineMap: [1],
    }));
    const dependencies: CompileForExportDependencies = {
      createScssClient: neverCallScssClient,
      createTsClient: () => client,
    };
    const source = baseSource({
      scriptLanguage: "typescript",
      script: "const b: number = 2;",
    });

    const result = await compileProjectSourceForExport(source, dependencies);

    expect(result).toEqual({
      status: "ok",
      resolvedSource: { ...source, script: "const b = 2;" },
    });
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("returns a script-error with diagnostics and still disposes the client when a compile error is present", async () => {
    const diagnostics = [
      { message: "Type error.", category: "error" as const, line: 1 },
    ];
    const { client, dispose } = makeTsClient(async () => ({
      diagnostics,
      emittedJs: null,
      lineMap: null,
    }));
    const dependencies: CompileForExportDependencies = {
      createScssClient: neverCallScssClient,
      createTsClient: () => client,
    };
    const source = baseSource({
      scriptLanguage: "typescript",
      script: "const b: number = 'nope';",
    });

    const result = await compileProjectSourceForExport(source, dependencies);

    expect(result).toEqual({ status: "script-error", diagnostics });
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("treats non-error diagnostics as non-blocking and still substitutes emitted JS", async () => {
    const diagnostics = [
      { message: "Unused variable.", category: "warning" as const, line: 1 },
    ];
    const { client } = makeTsClient(async () => ({
      diagnostics,
      emittedJs: "const b = 2;",
      lineMap: [1],
    }));
    const dependencies: CompileForExportDependencies = {
      createScssClient: neverCallScssClient,
      createTsClient: () => client,
    };
    const source = baseSource({
      scriptLanguage: "typescript",
      script: "const b: number = 2;",
    });

    const result = await compileProjectSourceForExport(source, dependencies);

    expect(result).toEqual({
      status: "ok",
      resolvedSource: { ...source, script: "const b = 2;" },
    });
  });

  it("compiles scss and typescript independently and merges both results", async () => {
    const { client: scssClient } = makeScssClient(async () => ({
      type: "success",
      css: ".a { color: blue; }",
    }));
    const { client: tsClient } = makeTsClient(async () => ({
      diagnostics: [],
      emittedJs: "const b = 2;",
      lineMap: [1],
    }));
    const dependencies: CompileForExportDependencies = {
      createScssClient: () => scssClient,
      createTsClient: () => tsClient,
    };
    const source = baseSource({
      stylesheetLanguage: "scss",
      stylesheet: "$c: blue; .a { color: $c; }",
      scriptLanguage: "typescript",
      script: "const b: number = 2;",
    });

    const result = await compileProjectSourceForExport(source, dependencies);

    expect(result).toEqual({
      status: "ok",
      resolvedSource: {
        ...source,
        stylesheet: ".a { color: blue; }",
        script: "const b = 2;",
      },
    });
  });

  it("prefers the scss-error over a script-error when both fail", async () => {
    const { client: scssClient } = makeScssClient(async () => ({
      type: "failure",
      error: { message: "Undefined variable." },
    }));
    const { client: tsClient } = makeTsClient(async () => ({
      diagnostics: [{ message: "boom", category: "error" as const, line: 1 }],
      emittedJs: null,
      lineMap: null,
    }));
    const dependencies: CompileForExportDependencies = {
      createScssClient: () => scssClient,
      createTsClient: () => tsClient,
    };
    const source = baseSource({
      stylesheetLanguage: "scss",
      scriptLanguage: "typescript",
    });

    const result = await compileProjectSourceForExport(source, dependencies);

    expect(result.status).toBe("scss-error");
  });
});
