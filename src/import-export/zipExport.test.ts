import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaygroundProject } from "../models/project";
import type { ScssCompileResult } from "../preview/scssCompiler";
import type { TsCompileResult } from "../preview/tsCompiler";

const scssCompileMock = vi.fn(
  async (_source: string, _buildId: string): Promise<ScssCompileResult> => ({
    type: "success",
    css: ".compiled {}",
  }),
);
const scssDisposeMock = vi.fn();

vi.mock("../preview/scssCompilerClient", () => ({
  createScssCompilerClient: () => ({
    compile: scssCompileMock,
    dispose: scssDisposeMock,
  }),
}));

const tsCompileMock = vi.fn(
  async (
    source: string,
    _scriptLanguage: string,
    _executionMode: string,
    _buildId: string,
  ): Promise<TsCompileResult> => ({
    diagnostics: [],
    emittedJs: source,
    lineMap: null,
  }),
);
const tsDisposeMock = vi.fn();

vi.mock("../preview/tsCompilerClient", () => ({
  createTsCompilerClient: () => ({
    compile: tsCompileMock,
    dispose: tsDisposeMock,
  }),
}));

const triggerBlobDownloadMock = vi.fn();

vi.mock("./downloadBlob", () => ({
  triggerBlobDownload: triggerBlobDownloadMock,
}));

const { downloadProjectZip } = await import("./zipExport");

function testProject(
  overrides: Partial<PlaygroundProject> = {},
): PlaygroundProject {
  return {
    schemaVersion: 1,
    id: "project-id",
    title: "My Project",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    trusted: true,
    source: {
      html: "<p>hi</p>",
      stylesheet: "p { color: red; }",
      stylesheetLanguage: "css",
      script: "console.log(1);",
      scriptLanguage: "javascript",
      executionMode: "classic",
      headContent: "",
    },
    resources: [],
    settings: { autoRun: true, previewDebounceMs: 400, preserveConsole: false },
    ...overrides,
  };
}

describe("downloadProjectZip", () => {
  beforeEach(() => {
    triggerBlobDownloadMock.mockClear();
    scssCompileMock.mockClear();
    tsCompileMock.mockClear();
  });

  it("returns 'ok' and triggers a download with a zip blob for a plain css/javascript project", async () => {
    const status = await downloadProjectZip(testProject());

    expect(status).toBe("ok");
    expect(triggerBlobDownloadMock).toHaveBeenCalledTimes(1);
    const [blob, filename] = triggerBlobDownloadMock.mock.calls[0] as [
      Blob,
      string,
    ];
    expect(blob.type).toBe("application/zip");
    expect(filename).toBe("my-project.zip");
  });

  it("names the downloaded file after the project title", async () => {
    await downloadProjectZip(testProject({ title: "My Cool Project!" }));

    const [, filename] = triggerBlobDownloadMock.mock.calls[0] as [
      Blob,
      string,
    ];
    expect(filename).toBe("my-cool-project.zip");
  });

  it("returns 'scss-error' and does not trigger a download when SCSS compilation fails", async () => {
    scssCompileMock.mockResolvedValueOnce({
      type: "failure",
      error: { message: "Undefined variable." },
    });

    const status = await downloadProjectZip(
      testProject({
        source: {
          html: "<p>hi</p>",
          stylesheet: "$c: $undefined;",
          stylesheetLanguage: "scss",
          script: "console.log(1);",
          scriptLanguage: "javascript",
          executionMode: "classic",
          headContent: "",
        },
      }),
    );

    expect(status).toBe("scss-error");
    expect(triggerBlobDownloadMock).not.toHaveBeenCalled();
  });

  it("returns 'script-error' and does not trigger a download when TS compilation fails", async () => {
    tsCompileMock.mockResolvedValueOnce({
      diagnostics: [{ message: "boom", category: "error", line: 1 }],
      emittedJs: null,
      lineMap: null,
    });

    const status = await downloadProjectZip(
      testProject({
        source: {
          html: "<p>hi</p>",
          stylesheet: "p {}",
          stylesheetLanguage: "css",
          script: "const a: number = 'nope';",
          scriptLanguage: "typescript",
          executionMode: "classic",
          headContent: "",
        },
      }),
    );

    expect(status).toBe("script-error");
    expect(triggerBlobDownloadMock).not.toHaveBeenCalled();
  });
});
