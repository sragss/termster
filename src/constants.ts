// Centralized constants for the application

// API Configuration
export const API_CONFIG = {
	MODEL: 'gpt-4o',
	BASE_URL: 'https://echo.router.merit.systems',
	TIMEOUT: 120000,
} as const;

// LLM Instructions
export const LLM_INSTRUCTIONS = {
	INITIAL:
		'You are a helpful assistant integrated into a terminal application. Provide clear, concise responses to help the user with their questions and tasks.',
	TOOL_FOLLOWUP: 'Continue the conversation with the tool results.',
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
