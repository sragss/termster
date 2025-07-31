import { type FunctionTool as OpenAI_FunctionTool } from "openai/resources/responses/responses";

// Re-export shared tool interfaces
export type { ToolExecutionResult, ToolExecutor } from './terminal-history.js';

// Tool render function type
export type ToolRenderFunction = (args: Record<string, unknown>) => string;

// Enhanced Termster tool interface
export interface TermsterTool {
  definition: OpenAI_FunctionTool;
  requires_approval: boolean;
  render: ToolRenderFunction;
}

// Re-export OpenAI types for convenience
export type { OpenAI_FunctionTool };