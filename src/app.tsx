import React, {useState, useRef, useEffect, useMemo, useCallback} from 'react';
import {Box, Text, useInput, useStdout} from 'ink';
import pty from 'node-pty';
import HeaderAnimation from './HeaderAnimation.js';
import ApiKeyPrompt from './components/ApiKeyPrompt.js';
import {ConfigService} from './services/config.js';
import {TerminalHistoryService} from './services/terminal-history.js';
import {PTYTerminalExecutor} from './services/terminal-executor.js';
import {PromptProvider} from './contexts/PromptContext.js';
import MainContent from './components/MainContent.js';

const App = () => {
	const {stdout} = useStdout();
	const [selectedPane, setSelectedPane] = useState<'terminal' | 'prompt'>(
		'prompt',
	);
	const [hasApiKey, setHasApiKey] = useState<boolean | null>(null); // null = loading
	const ptyRef = useRef<pty.IPty | null>(null);
	const configService = useRef<ConfigService>(new ConfigService());
	const historyService = useRef<TerminalHistoryService>(
		new TerminalHistoryService(),
	);
	const [terminalExecutor, setTerminalExecutor] = useState<PTYTerminalExecutor | null>(null);

	const handleCommand = useCallback((command: string) => {
		if (ptyRef.current) {
			// Send a newline first to ensure we're on a fresh line
			ptyRef.current.write('\r');
			// Send the command
			ptyRef.current.write(command + '\r');
		}
	}, []); // No dependencies - ptyRef.current is accessed directly

	// Check for API key on mount
	useEffect(() => {
		const checkApiKey = async () => {
			try {
				// Check if API key exists without triggering auth flow
				const hasKey = await configService.current.hasApiKey();
				setHasApiKey(hasKey);
			} catch (error) {
				console.error('Error checking API key:', error);
				setHasApiKey(false);
			}
		};
		checkApiKey();
	}, []);

	// Memoize window dimensions to prevent unnecessary re-renders
	const dimensions = useMemo(() => {
		const totalCols = stdout.columns || 80;
		const totalRows = stdout.rows - 2 || 24;
		const statusLineHeight = 1;
		const headerHeight = 8; // HeaderAnimation height
		const inputBoxHeight = 4; // Input box with border and padding
		const availableHeight = totalRows - statusLineHeight - headerHeight - inputBoxHeight;
		const paneHeight = availableHeight;
		
		return { totalCols, totalRows, paneHeight, inputBoxHeight };
	}, [stdout.columns, stdout.rows]);

	const handleApiKeySubmitted = useCallback(async (apiKey: string) => {
		try {
			await configService.current.saveApiKey(apiKey);
			setHasApiKey(true);
		} catch (error) {
			console.error('Error saving API key:', error);
			// Could show error state here
		}
	}, []); // No dependencies - uses ref and setter

	const handlePtyReady = useCallback((pty: pty.IPty) => {
		ptyRef.current = pty;
		setTerminalExecutor(new PTYTerminalExecutor(pty));
	}, []);

	useInput((input, key) => {
		// Global exit handlers
		if ((key.ctrl && input === 'c') || (key.ctrl && input === 'd')) {
			process.exit(0);
		}
		// Other input handling moved to MainContent component
	});

	return (
		<Box width="100%" height={dimensions.totalRows} flexDirection="column">
			<HeaderAnimation height={8} />

			{/* Show API key prompt if needed, otherwise show main app */}
			{hasApiKey === null ? (
				<Box
					width="100%"
					height={dimensions.paneHeight}
					justifyContent="center"
					alignItems="center"
				>
					<Text>Loading...</Text>
				</Box>
			) : hasApiKey === false ? (
				<Box width="100%" height={dimensions.paneHeight}>
					<ApiKeyPrompt onApiKeySubmitted={handleApiKeySubmitted} />
				</Box>
			) : (
				<PromptProvider
					historyService={historyService.current}
					terminalExecutor={terminalExecutor || undefined}
					onCommand={handleCommand}
				>
					<MainContent
						selectedPane={selectedPane}
						setSelectedPane={setSelectedPane}
						dimensions={dimensions}
						onPtyReady={handlePtyReady}
						historyService={historyService.current}
					/>
				</PromptProvider>
			)}

			{/* Status line */}
			<Box width="100%" height={1}>
				<Text dimColor>
					{hasApiKey
						? `shift + tab to switch to ${
								selectedPane === 'terminal' ? 'prompt' : 'terminal'
						  }`
						: 'Enter your Echo API key to continue'}
				</Text>
			</Box>
		</Box>
	);
};

export default App;
