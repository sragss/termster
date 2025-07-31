import type {ResponseInputItem} from 'openai/resources/responses/responses';

export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	timestamp: Date;
}

export interface ChatHistory {
	messages: readonly ResponseInputItem[];
	lastResponseId?: string;
}

export interface ChatService {
	addUserMessage(text: string): void;
	chat(userInput: string): Promise<void>;
	getHistory(): ResponseInputItem[];
	clearHistory(): void;
}

export interface ToolCall {
	id: string;
	name: string;
	args: Record<string, unknown>;
}

export interface StreamingChatCallback {
	onChunk?: (text: string) => void;
	onToolCall?: (toolCall: ToolCall) => Promise<string>;
	onToolApprovalRequest?: (
		toolCall: ToolCall,
		renderedCall: string,
	) => Promise<boolean>;
	onComplete?: (message: string) => void;
	onError?: (error: Error) => void;
}

export {ResponseInputItem};
