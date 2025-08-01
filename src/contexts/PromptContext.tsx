import React, {createContext, useContext, useState, useCallback} from 'react';
import {useLLMChat, CommandEntry} from '../hooks/useLLMChat.js';
import {TerminalHistoryService} from '../services/terminal-history.js';
import {TerminalExecutor} from '../tools/mutable-execution.js';

interface PromptContextValue {
	// Input state
	currentInput: string;
	setCurrentInput: (input: string) => void;
	
	// LLM Chat state
	history: CommandEntry[];
	pendingApproval: {toolCall: any; renderedApproval: string} | null;
	
	// Actions
	handleInput: (input: string, key: any) => void;
	approveToolCall: () => void;
	rejectToolCall: () => void;
	sendMessage: (message: string) => void;
	addCommand: (command: string) => void;
}

const PromptContext = createContext<PromptContextValue | null>(null);

export const usePromptContext = () => {
	const context = useContext(PromptContext);
	if (!context) {
		throw new Error('usePromptContext must be used within a PromptProvider');
	}
	return context;
};

interface PromptProviderProps {
	children: React.ReactNode;
	historyService?: TerminalHistoryService;
	terminalExecutor?: TerminalExecutor;
	onCommand?: (command: string) => void;
}

export const PromptProvider = ({
	children,
	historyService,
	terminalExecutor,
	onCommand,
}: PromptProviderProps) => {
	const [currentInput, setCurrentInput] = useState('');
	
	const {history, pendingApproval, sendMessage, addCommand, approveToolCall, rejectToolCall} = useLLMChat({
		historyService,
		terminalExecutor,
	});

	const handleInput = useCallback((input: string, key: any) => {
		// Handle approval flow
		if (pendingApproval) {
			if (key.return) {
				approveToolCall();
				return;
			} else if (key.escape) {
				rejectToolCall();
				return;
			}
			// Block all other input during approval
			return;
		}

		if (key.return) {
			if (currentInput.trim()) {
				if (currentInput.startsWith('/')) {
					// It's a command
					const command = currentInput.slice(1); // Remove the "/"
					addCommand(currentInput);

					if (onCommand) {
						onCommand(command);
					}
				} else {
					// It's regular text - send to LLM
					sendMessage(currentInput);
				}

				setCurrentInput('');
			}
		} else if (key.backspace || key.delete) {
			setCurrentInput(prev => prev.slice(0, -1));
		} else if (input) {
			setCurrentInput(prev => prev + input);
		}
	}, [currentInput, pendingApproval, approveToolCall, rejectToolCall, addCommand, sendMessage, onCommand]);

	const value: PromptContextValue = {
		currentInput,
		setCurrentInput,
		history,
		pendingApproval,
		handleInput,
		approveToolCall,
		rejectToolCall,
		sendMessage,
		addCommand,
	};

	return (
		<PromptContext.Provider value={value}>
			{children}
		</PromptContext.Provider>
	);
};