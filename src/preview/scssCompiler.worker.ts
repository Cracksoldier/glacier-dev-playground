import { compileScss } from "./scssCompiler";
import {
  isScssCompileRequest,
  SCSS_WORKER_PROTOCOL,
  SCSS_WORKER_VERSION,
  type ScssCompileResponse,
} from "./scssWorkerProtocol";

self.onmessage = async (event: MessageEvent<unknown>) => {
  if (!isScssCompileRequest(event.data)) return;
  const { buildId, source } = event.data;

  const result = await compileScss(source);
  const response: ScssCompileResponse =
    result.type === "success"
      ? {
          protocol: SCSS_WORKER_PROTOCOL,
          version: SCSS_WORKER_VERSION,
          buildId,
          type: "success",
          css: result.css,
        }
      : {
          protocol: SCSS_WORKER_PROTOCOL,
          version: SCSS_WORKER_VERSION,
          buildId,
          type: "failure",
          error: result.error,
        };
  self.postMessage(response);
};
