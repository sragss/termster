import OpenAI from 'openai';
import type {
  ResponseCreateParams,
  ResponseInputItem,
  Response as OpenAIResponse
} from "openai/resources/responses/responses";
import { ChatService, StreamingChatCallback, ToolCall } from '../types/llm.js';
import { ConfigService } from './config.js';
import { getOpenAITools, ToolRegistry } from '../tools/index.js';
import { TerminalHistoryService } from './terminal-history.js';

export interface ModelConfig {
  model: string;
  baseURL: string;
}

// Configuration for Echo API
export const MODEL_CONFIG: ModelConfig = {
  model: 'gpt-4o',
  baseURL: 'https://echo.router.merit.systems'
};

export class ChatLoop implements ChatService {
  private oai!: OpenAI;
  private conversationHistory: ResponseInputItem[] = [];
  private lastResponseId?: string;
  private configService: ConfigService;
  public toolExecutor?: ToolRegistry;

  constructor(historyService?: TerminalHistoryService) {
    this.configService = new ConfigService();
    if (historyService) {
      this.toolExecutor = new ToolRegistry(historyService);
    }
  }

  async initialize(): Promise<void> {
    // Get API key from config service (guaranteed to exist at boot)
    const apiKey = await this.configService.getApiKey();

    // Create OpenAI client with Echo API configuration
    this.oai = new OpenAI({
      apiKey,
      baseURL: MODEL_CONFIG.baseURL,
      timeout: 120000
    });
  }

  addUserMessage(text: string): void {
    const userMessage: ResponseInputItem = {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text }],
    };
    this.conversationHistory.push(userMessage);
  }

  async chat(userInput: string, callbacks?: StreamingChatCallback): Promise<void> {
    // Ensure initialization
    if (!this.oai) {
      await this.initialize();
    }

    this.addUserMessage(userInput);

    const instructions = "You are a helpful assistant integrated into a terminal application. Provide clear, concise responses to help the user with their questions and tasks.";

    try {
      // For Responses API, we only send the current message if no previous response
      const input = this.lastResponseId ? 
        [this.conversationHistory[this.conversationHistory.length - 1]].filter(Boolean) : 
        this.conversationHistory.filter(Boolean);

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`API call timed out after ${this.oai.timeout}ms`));
        }, this.oai.timeout || 120000);
      });

      // Create the API call promise - use non-streaming since Echo API doesn't support streaming
      const apiPromise = this.oai.responses.create({
        model: MODEL_CONFIG.model,
        instructions,
        input: input as any, // Type assertion for compatibility
        stream: false,
        parallel_tool_calls: false,
        tools: this.toolExecutor ? getOpenAITools() : undefined,
        tool_choice: this.toolExecutor ? "auto" : undefined,
        store: true,
        previous_response_id: this.lastResponseId,
      } satisfies ResponseCreateParams);

      // Race between API call and timeout
      const response = await Promise.race([apiPromise, timeoutPromise]) as any;

      // Handle non-streaming response
      await this.handleNonStreamingResponse(response, callbacks);

    } catch (error) {
      console.error('Echo API call failed:', error);
      if (callbacks?.onError) {
        callbacks.onError(error as Error);
      }
      throw error;
    }
  }

  private async handleNonStreamingResponse(
    response: OpenAIResponse,
    callbacks?: StreamingChatCallback
  ): Promise<void> {
    this.lastResponseId = response.id;
    
    // Process function calls if they exist
    if (callbacks?.onToolCall && this.toolExecutor) {
      const functionOutputs = await this.processFunctionCalls(response, callbacks.onToolCall);
      
      // If we had tool calls, we need to continue the conversation with tool results
      if (functionOutputs.length > 0) {
        // Make another API call with only the function outputs when using previous_response_id
        const followupTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Follow-up API call timed out after ${this.oai.timeout}ms`));
          }, this.oai.timeout || 120000);
        });

        const followupApiPromise = this.oai.responses.create({
          model: MODEL_CONFIG.model,
          instructions: "You are a helpful assistant integrated into a terminal application. Continue the conversation with the tool results.",
          input: functionOutputs as any, // Only send the function outputs
          stream: false,
          parallel_tool_calls: false,
          tools: getOpenAITools(),
          tool_choice: "auto",
          store: true,
          previous_response_id: this.lastResponseId,
        } satisfies ResponseCreateParams);

        const followupResponse = await Promise.race([followupApiPromise, followupTimeoutPromise]) as any;
        await this.handleNonStreamingResponse(followupResponse, callbacks);
        return;
      }
    }
    
    // Extract text content for callback
    for (const item of response.output) {
      if (item.type === 'message') {
        // Extract text content for callback
        if (callbacks?.onComplete && item.content) {
          const textContent = item.content
            .filter((c: any) => c.type === 'output_text')
            .map((c: any) => c.text)
            .join('');
          if (textContent) {
            callbacks.onComplete(textContent);
          }
        }
      }
    }
  }

  private async processFunctionCalls(
    response: OpenAIResponse,
    onToolCall: (toolCall: ToolCall) => Promise<string>
  ): Promise<ResponseInputItem[]> {
    const functionOutputs: ResponseInputItem[] = [];
    
    // Process all function calls from the response
    for (const item of response.output) {
      if (item.type === 'function_call') {
        const toolCall: ToolCall = {
          id: item.call_id,
          name: item.name,
          args: JSON.parse(item.arguments)
        };

        const output = await onToolCall(toolCall);

        // Create tool result to send back to API
        const toolResult: ResponseInputItem = {
          type: "function_call_output",
          call_id: item.call_id,
          output: output
        } as any;
        
        functionOutputs.push(toolResult);
      }
    }
    
    return functionOutputs;
  }

  getHistory(): ResponseInputItem[] {
    return [...this.conversationHistory];
  }

  clearHistory(): void {
    this.conversationHistory = [];
    this.lastResponseId = undefined;
  }
}