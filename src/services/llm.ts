import OpenAI from 'openai';
import type {
	ResponseCreateParams,
	ResponseInputItem,
} from 'openai/resources/responses/responses';
import {ChatService, StreamingChatCallback, ToolCall} from '../types/llm.js';
import {ConfigService} from './config.js';
import {getOpenAITools, ToolRegistry} from '../tools/index.js';
import {TerminalHistoryService} from './terminal-history.js';
import {TerminalExecutor} from '../tools/mutable-execution.js';
import {
	EchoAPIResponse,
	EchoAPIFunctionResult,
	isMessageItem,
	isFunctionCallItem,
	isOutputTextContent,
} from '../types/echo-api.js';

import {API_CONFIG, LLM_INSTRUCTIONS} from '../constants.js';

export class ChatLoop implements ChatService {
	private oai!: OpenAI;
	private conversationHistory: ResponseInputItem[] = [];
	private lastResponseId?: string;
	private configService: ConfigService;
	public toolExecutor?: ToolRegistry;

	constructor(
		historyService?: TerminalHistoryService,
		terminalExecutor?: TerminalExecutor,
	) {
		this.configService = new ConfigService();
		if (historyService) {
			this.toolExecutor = new ToolRegistry(historyService, terminalExecutor);
		}
	}

	async initialize(): Promise<void> {
		// Get API key from config service (guaranteed to exist at boot)
		const apiKey = await this.configService.getApiKey();

		// Create OpenAI client with Echo API configuration
		this.oai = new OpenAI({
			apiKey,
			baseURL: API_CONFIG.BASE_URL,
			timeout: API_CONFIG.TIMEOUT,
		});
	}

	addUserMessage(text: string): void {
		const userMessage: ResponseInputItem = {
			type: 'message',
			role: 'user',
			content: [{type: 'input_text', text}],
		};
		this.conversationHistory.push(userMessage);
	}

	async chat(
		userInput: string,
		callbacks?: StreamingChatCallback,
	): Promise<void> {
		if (!this.oai) await this.initialize();

		this.addUserMessage(userInput);

		try {
			// Initial API call with conversation history
			const input: ResponseInputItem[] = this.lastResponseId
				? ([
						this.conversationHistory[this.conversationHistory.length - 1],
				  ].filter(Boolean) as ResponseInputItem[])
				: (this.conversationHistory.filter(Boolean) as ResponseInputItem[]);

			let response = await this.makeApiCall(input, LLM_INSTRUCTIONS.INITIAL);

			// Handle tool calls in simple loop (no recursion)
			while (callbacks?.onToolCall && this.toolExecutor) {
				const toolOutputs = await this.processFunctionCalls(
					response,
					callbacks.onToolCall,
				);
				if (toolOutputs.length === 0) break;

				// Continue conversation with tool results
				response = await this.makeApiCall(
					toolOutputs,
					LLM_INSTRUCTIONS.TOOL_FOLLOWUP,
				);
			}

			// Extract and return final response
			this.extractTextResponse(response, callbacks?.onComplete);
		} catch (error) {
			console.error('API call failed:', error);
			callbacks?.onError?.(error as Error);
			throw error;
		}
	}

	private async makeApiCall(
		input: ResponseInputItem[],
		instructions: string,
	): Promise<EchoAPIResponse> {
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(
				() =>
					reject(new Error(`API call timed out after ${this.oai.timeout}ms`)),
				this.oai.timeout || API_CONFIG.TIMEOUT,
			);
		});

		const apiPromise = this.oai.responses.create({
			model: API_CONFIG.MODEL,
			instructions,
			input: input,
			stream: false,
			parallel_tool_calls: false,
			tools: this.toolExecutor ? getOpenAITools() : undefined,
			tool_choice: this.toolExecutor ? 'auto' : undefined,
			store: true,
			previous_response_id: this.lastResponseId,
		} satisfies ResponseCreateParams);

		const response = (await Promise.race([
			apiPromise,
			timeoutPromise,
		])) as EchoAPIResponse;
		this.lastResponseId = response.id;
		return response;
	}

	private extractTextResponse(
		response: EchoAPIResponse,
		onComplete?: (text: string) => void,
	): void {
		for (const item of response.output) {
			if (isMessageItem(item) && item.content && onComplete) {
				const textContent = item.content
					.filter(isOutputTextContent)
					.map(c => c.text)
					.join('');
				if (textContent) {
					onComplete(textContent);
				}
			}
		}
	}

	private async processFunctionCalls(
		response: EchoAPIResponse,
		onToolCall: (toolCall: ToolCall) => Promise<string>,
	): Promise<ResponseInputItem[]> {
		const functionOutputs: ResponseInputItem[] = [];

		// Process all function calls from the response
		for (const item of response.output) {
			if (isFunctionCallItem(item)) {
				const toolCall: ToolCall = {
					id: item.call_id,
					name: item.name,
					args: JSON.parse(item.arguments),
				};

				const output = await onToolCall(toolCall);

				// Create tool result to send back to API
				const toolResult: EchoAPIFunctionResult = {
					type: 'function_call_output',
					call_id: item.call_id,
					output: output,
				};

				functionOutputs.push(toolResult as ResponseInputItem);
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
