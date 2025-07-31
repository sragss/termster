import React, {useState, useRef, useEffect} from 'react';
import {Box, Text, useInput, useStdout} from 'ink';
import pty from 'node-pty';
import HeaderAnimation from './HeaderAnimation.js';
import TerminalPane from './TerminalPane.js';
import PromptPane from './PromptPane.js';
import ApiKeyPrompt from './components/ApiKeyPrompt.js';
import {ConfigService} from './services/config.js';
import {TerminalHistoryService} from './services/terminal-history.js';

const App = () => {
	const {stdout} = useStdout();
	const [selectedPane, setSelectedPane] = useState<'terminal' | 'prompt'>(
		'prompt',
	);
	const [hasApiKey, setHasApiKey] = useState<boolean | null>(null); // null = loading
	const ptyRef = useRef<pty.IPty | null>(null);
	const configService = useRef<ConfigService>(new ConfigService());
	const historyService = useRef<TerminalHistoryService>(new TerminalHistoryService());

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

	// Compute window dimensions upfront
	const totalCols = stdout.columns || 80;
	const totalRows = stdout.rows - 2 || 24;
	const statusLineHeight = 1;
	const headerHeight = 8; // HeaderAnimation height
	const availableHeight = totalRows - statusLineHeight - headerHeight;
	const paneHeight = availableHeight;

	const handleCommand = (command: string) => {
		if (ptyRef.current) {
			// Send a newline first to ensure we're on a fresh line
			ptyRef.current.write('\r');
			// Send the command
			console.log('Sending command to terminal:', JSON.stringify(command));
			ptyRef.current.write(command + '\r');
		}
	};

	const handleApiKeySubmitted = async (apiKey: string) => {
		try {
			await configService.current.saveApiKey(apiKey);
			setHasApiKey(true);
		} catch (error) {
			console.error('Error saving API key:', error);
			// Could show error state here
		}
	};

	useInput((input, key) => {
		// Global exit handlers
		if ((key.ctrl && input === 'c') || (key.ctrl && input === 'd')) {
			process.exit(0);
		}

		// Only handle global app-level actions
		if (key.shift && key.tab) {
			setSelectedPane(prev => (prev === 'terminal' ? 'prompt' : 'terminal'));
		}
		// All other input is handled by individual pane components
	});

	return (
		<Box width="100%" height={totalRows} flexDirection="column">
			<HeaderAnimation height={headerHeight} />

			{/* Show API key prompt if needed, otherwise show main app */}
			{hasApiKey === null ? (
				<Box width="100%" height={paneHeight} justifyContent="center" alignItems="center">
					<Text>Loading...</Text>
				</Box>
			) : hasApiKey === false ? (
				<Box width="100%" height={paneHeight}>
					<ApiKeyPrompt onApiKeySubmitted={handleApiKeySubmitted} />
				</Box>
			) : (
				<Box width="100%" height={paneHeight}>
					<TerminalPane
						isSelected={selectedPane === 'terminal'}
						height={paneHeight}
						totalCols={totalCols}
						onPtyReady={pty => {
							ptyRef.current = pty;
						}}
						historyService={historyService.current}
					/>
					<PromptPane
						isSelected={selectedPane === 'prompt'}
						height={paneHeight}
						onCommand={handleCommand}
						historyService={historyService.current}
					/>
				</Box>
			)}

			{/* Status line */}
			<Box width="100%" height={statusLineHeight}>
				<Text dimColor>
					{hasApiKey ? (
						`shift + tab to switch to ${
							selectedPane === 'terminal' ? 'prompt' : 'terminal'
						}`
					) : (
						'Enter your Echo API key to continue'
					)}
				</Text>
			</Box>
		</Box>
	);
};

export default App;
