import { compileScript, type TsCompileResult } from "./tsCompiler";
import {
  isTsCompileRequest,
  TS_WORKER_PROTOCOL,
  TS_WORKER_VERSION,
  type TsCompileResponse,
} from "./tsWorkerProtocol";

self.onmessage = (event: MessageEvent<unknown>) => {
  if (!isTsCompileRequest(event.data)) return;
  const { buildId, source, scriptLanguage, executionMode } = event.data;

  let result: TsCompileResult;
  try {
    result = compileScript(source, { scriptLanguage, executionMode });
  } catch (error) {
    // Always answer the request: an uncaught throw here would leave the
    // client's compile() for this buildId pending forever.
    const detail = error instanceof Error ? error.message : String(error);
    result = {
      diagnostics: [
        {
          message: `The compiler failed unexpectedly: ${detail}`,
          category: "error",
        },
      ],
      emittedJs: null,
      lineMap: null,
    };
  }
  const response: TsCompileResponse = {
    protocol: TS_WORKER_PROTOCOL,
    version: TS_WORKER_VERSION,
    buildId,
    diagnostics: result.diagnostics,
    emittedJs: result.emittedJs,
    lineMap: result.lineMap,
  };
  self.postMessage(response);
};
