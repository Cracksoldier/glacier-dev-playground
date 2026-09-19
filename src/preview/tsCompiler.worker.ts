import { compileScript } from "./tsCompiler";
import {
  isTsCompileRequest,
  TS_WORKER_PROTOCOL,
  TS_WORKER_VERSION,
  type TsCompileResponse,
} from "./tsWorkerProtocol";

self.onmessage = (event: MessageEvent<unknown>) => {
  if (!isTsCompileRequest(event.data)) return;
  const { buildId, source, scriptLanguage, executionMode } = event.data;

  const result = compileScript(source, { scriptLanguage, executionMode });
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
