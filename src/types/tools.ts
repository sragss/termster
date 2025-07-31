import type { FunctionTool } from "openai/resources/responses/responses";

export interface ToolExecutionResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface ToolExecutor {
  execute(name: string, args: Record<string, unknown>): Promise<ToolExecutionResult>;
}

// Terminal history tool - reads recent terminal commands and outputs
export const TERMINAL_HISTORY_TOOL: FunctionTool = {
  type: "function",
  name: "read_terminal_history",
  description: "Reads the inputs and outputs of recent terminal commands. Useful for understanding what commands were run and their results. For efficient searching, first use no_output=true to scan through command history quickly, then zero in on specific commands with full output.",
  strict: false,
  parameters: {
    type: "object",
    properties: {
      count: {
        type: "number",
        description: "Number of recent commands to retrieve (default: 5, max: 20)",
        minimum: 1,
        maximum: 20
      },
      skip: {
        type: "number", 
        description: "Number of most recent commands to skip (default: 0)",
        minimum: 0
      },
      no_output: {
        type: "boolean",
        description: "If true, only show command inputs without outputs for efficient scanning (default: false)",
      }
    },
    additionalProperties: false,
  },
};

export const ALL_TOOLS: FunctionTool[] = [TERMINAL_HISTORY_TOOL];