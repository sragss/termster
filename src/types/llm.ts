import type {
  ResponseInputItem,
} from "openai/resources/responses/responses";

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

export interface StreamingChatCallback {
  onChunk?: (text: string) => void;
  onComplete?: (message: string) => void;
  onError?: (error: Error) => void;
}

export { ResponseInputItem };