export type CompilationId = string;
export type ExecutionId = string;

export function createCompilationId(): CompilationId {
  return crypto.randomUUID();
}

export function createExecutionId(): ExecutionId {
  return crypto.randomUUID();
}
