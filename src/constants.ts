// Centralized constants for the application

// API Configuration
export const API_CONFIG = {
	MODEL: 'gpt-4.1',
	BASE_URL: 'https://echo.router.merit.systems',
	TIMEOUT: 120000,
} as const;

// LLM Instructions
export const LLM_INSTRUCTIONS = {
	INITIAL: `
You are a helpful assistant integrated into a terminal application.
- When the user asks you to do things they imagine you're their intern on the keyboard in front of a terminal.
- If they ask you to do something that can be accomplished in the terminal, do so. Use your tools.
- If they've affirmatively asked for something that can be provided by running tools against the terminal, do so.
- If you run into errors, try to fix them yourself, as a high agency intern would. 
- If you do not have enough information to do something, run commands to understand the user's environment.
- Provide clear, concise responses to help the user with their questions and tasks.
`.trim(),
	TOOL_FOLLOWUP: `
Continue the conversation with the tool results.
`.trim(),
} as const;

// Regex Patterns
export const PATTERNS = {
	TOOL_CALL: /^(\w+)\(([^)]*)\)\s*→\s*(.+)$/,
} as const;

// UI Constants
export const UI = {
	PANE_WIDTH: '50%',
	TIMESTAMP_FORMAT: {
		hour12: false,
		hour: '2-digit' as const,
		minute: '2-digit' as const,
		second: '2-digit' as const,
	},
} as const;

